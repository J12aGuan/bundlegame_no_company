/**
 * Reproducible figure capture for the BundleGame paper.
 *
 * Prereqs (already done in this repo):
 *   npm ci
 *   npm i -D playwright && npx playwright install chromium
 *   npm run dev            # dev server on http://localhost:5173
 *
 * Then:  node paper/figures/screenshots/capture.mjs
 *
 * Captures at a fixed 1440x900 viewport, deviceScaleFactor 4 (=> ~5760px wide,
 * high-DPI), light theme (the app's only theme), cropped to the app (Playwright
 * shots never include browser chrome). Uses the DEV-only `window.__bundle` hook to
 * pin the exact study scenarios (no random reshuffle; deterministic).
 *
 * In addition to the high-DPI PNGs, each full-screen state is also printed to a
 * vector PDF via page.pdf(): emulateMedia('screen') keeps the on-screen CSS (no
 * print-only reflow) and the PDF page size is pinned to the viewport, so the PDF
 * layout matches the screenshot. These PDFs are mostly selectable vector text/UI;
 * only genuinely raster content (the Leaflet/MapTiler map tiles) stays embedded as
 * an image, which is expected for a real interface capture.
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BG_URL || "http://localhost:5173";
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 4; // high-DPI raster (was 2)
// Fixed print viewport so the vector PDF matches the on-screen layout 1:1.
const PDF_OPTS = {
  width: `${VIEWPORT.width}px`,
  height: `${VIEWPORT.height}px`,
  printBackground: true,
  pageRanges: "1",
};

// Real study scenarios mapped to their round index (mainGame_2026_03_20_14_26_36).
const PRIMARY_ROUND = 10;  // mainGameScenario10 - clean Safeway/Piedmont menu for the core task figure
const MENUS = {
  menu_compact: 14,        // mainGameScenario14 - all Target / Emeryville (single city)
  menu_dispersed: 7,       // mainGameScenario7  - Sprouts(Oakland) + Target(Emeryville)
  menu_payout_trap: 8,     // mainGameScenario8  - Sprouts/Oakland; max-earn bundle 32% worse on score
};

const log = (...a) => console.log("[capture]", ...a);

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--enable-webgl"],
  });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log("pageerror:", e.message));
  const results = {};
  const shot = async (name, opts = {}) => {
    try {
      await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
      results[name] = "ok";
      log("saved", `${name}.png`);
    } catch (e) {
      results[name] = `FAIL: ${e.message}`;
      log("FAILED", name, e.message);
    }
  };
  // Vector PDF of the current full screen (keeps on-screen layout via screen media).
  const shotPdf = async (name) => {
    try {
      await page.emulateMedia({ media: "screen" });
      await page.pdf({ path: path.join(OUT, `${name}.pdf`), ...PDF_OPTS });
      log("saved", `${name}.pdf`);
    } catch (e) {
      results[`${name}.pdf`] = `FAIL: ${e.message}`;
      log("FAILED", `${name}.pdf`, e.message);
    }
  };
  const hasHook = () => page.evaluate(() => !!window.__bundle);
  const pin = async (round) => {
    await page.evaluate((r) => {
      const b = window.__bundle;
      if (!b) return;
      b.orders.set([]);
      b.gameText.update((t) => ({ ...t, selector: "None selected" }));
      b.currentRound.set(r);
    }, round);
    await page.waitForTimeout(1500); // re-render cards + Leaflet map
  };

  // ---- entry ----
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#start", { timeout: 30000 }).catch(() => {});
  const authRequired = await page.$("#main-user-id");
  log("auth form present:", !!authRequired);
  await shot("00_landing");
  await shotPdf("00_landing");
  // Dev-only: flip to the no-auth entry so loadGame() runs WITHOUT a participant
  // token and WITHOUT writing any session to Firestore. (Saves are gated on
  // needsAuth && id && scenarioSetVersionId, so nothing is persisted.)
  await page.evaluate(() => window.__bundle && window.__bundle.needsAuth.set(false));
  await page.waitForTimeout(600);
  await page.click("#start").catch((e) => log("start click failed:", e.message));

  // decision screen renders <h2>Available Orders</h2>
  const reached = await page
    .waitForSelector("h2:has-text('Available Orders')", { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!reached) {
    log("Could not reach the decision screen (auth likely required). Saved landing only.");
    log("RESULTS", results);
    await browser.close();
    return;
  }
  log("decision screen reached. dev hook:", await hasHook());
  await page.waitForTimeout(2500); // allow MapTiler tiles to load

  // Hide the study-internal "Study Arm" metadata box so the figures show the plain
  // participant task. (Unaided pilot: there is no recommendation panel either way.)
  const cleanChrome = () => page.evaluate(() => {
    for (const el of document.querySelectorAll("section div")) {
      if (el.className && String(el.className).includes("rounded-2xl") &&
          /Study Arm/i.test(el.textContent || "")) {
        el.style.display = "none";
      }
    }
  });
  const skip = () => page.click("button:has-text('Skip')").catch(() => {});

  // ---- PRIMARY: decision screen empty (pin the clean single-store compact menu) ----
  await pin(PRIMARY_ROUND);
  await skip(); await cleanChrome(); await page.waitForTimeout(300);
  await shot("task_decision_empty");
  await shotPdf("task_decision_empty");

  // ---- order card close-up (UNSELECTED state), clip to one card ----
  {
    const card = (await page.$$("section .grid.grid-cols-2 > div"))[0];
    if (card) { const box = await card.boundingBox(); if (box) await shot("order_card", { clip: box }); }
  }

  // ---- mid-bundle: select 2-3 same-store order cards ----
  const cards = await page.$$("section .grid.grid-cols-2 > div");
  for (const c of cards.slice(0, 3)) { await c.click().catch(() => {}); await page.waitForTimeout(250); }
  await cleanChrome();
  await shot("task_decision_midbundle");
  await shotPdf("task_decision_midbundle");

  // ---- map of stores/cities (clip to the #map panel) ----
  {
    const map = await page.$("#map");
    if (map) { const box = await map.boundingBox(); if (box) await shot("map_stores_cities", { clip: box }); }
    else { results.map_stores_cities = "FAIL: #map not found"; }
  }

  // ---- score feedback: running-score header (unaided => the only feedback) ----
  await page.evaluate(() => window.__bundle && window.__bundle.orders.set([]));
  await cleanChrome();
  await shot("score_feedback");
  await shotPdf("score_feedback");

  // ---- the three manipulation menus (empty state, pinned) ----
  for (const [name, round] of Object.entries(MENUS)) {
    await pin(round); await skip(); await cleanChrome(); await page.waitForTimeout(700);
    await shot(name);
    await shotPdf(name);
  }

  // ---- instructions / tutorial (enter the tutorial game; rules are taught via prompts) ----
  await page.goto(`${BASE}/tutorial`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForSelector("#start", { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => window.__bundle && window.__bundle.needsAuth.set(false));
  await page.waitForTimeout(500);
  await page.click("#start").catch(() => {});
  const tut = await page.waitForSelector("h2:has-text('Available Orders')", { timeout: 20000 })
    .then(() => true).catch(() => false);
  await page.waitForTimeout(2500);
  await skip();
  await shot("instructions");
  await shotPdf("instructions");
  if (!tut) log("tutorial decision screen not reached; instructions.png shows the tutorial entry/loading.");

  log("RESULTS", JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
