/**
 * Plays ONE full round (real picking + delivery) to reach a real game-over
 * "Your Stats" screen with non-zero earnings, then captures it. Also grabs the
 * in-store picking and delivery screens (real bonus figures) along the way.
 *
 * Shrinks the scenario set to a single scenario (via the DEV hook) so completing
 * one round triggers all-rounds-complete -> GameOver. No production writes
 * (no-auth dev path). Run with the dev server up:  node capture_gameover.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BG_URL || "http://localhost:5173";
const ROUND = 10; // mainGameScenario10 (single store, Safeway/Piedmont)
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 4; // high-DPI raster (was 2)
// Fixed print viewport so the vector PDF matches the on-screen layout 1:1.
const PDF_OPTS = { width: `${VIEWPORT.width}px`, height: `${VIEWPORT.height}px`, printBackground: true, pageRanges: "1" };
const log = (...a) => console.log("[gameover]", ...a);

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--enable-webgl"],
  });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  const shot = (n, o = {}) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...o }).then(() => log("saved", n)).catch((e) => log("FAIL", n, e.message));
  // Vector PDF of the current full screen (screen media keeps the on-screen layout).
  const shotPdf = async (n) => {
    await page.emulateMedia({ media: "screen" });
    await page.pdf({ path: path.join(OUT, `${n}.pdf`), ...PDF_OPTS }).then(() => log("saved", n + ".pdf")).catch((e) => log("FAIL", n + ".pdf", e.message));
  };

  // entry (no-auth dev path) + pin a single-scenario set so 1 round => game over
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#start", { timeout: 30000 });
  await page.evaluate(() => window.__bundle && window.__bundle.needsAuth.set(false));
  await page.waitForTimeout(500);
  await page.click("#start");
  await page.waitForSelector("h2:has-text('Available Orders')", { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.evaluate((r) => {
    const b = window.__bundle; const all = b.scenarios; let one;
    b.currentRound.subscribe(() => {})();
    b.scenarios.subscribe((s) => { one = (s || []).find((x) => Number(x.round) === r); })();
    if (one) b.scenarios.set([{ ...one, round: 1 }]);
    b.currentRound.set(1); b.orders.set([]);
  }, ROUND);
  await page.waitForTimeout(1500);
  await page.click("button:has-text('Skip')").catch(() => {});

  // select ONE order (single-order bundle => one delivery location, simplest)
  const cards = await page.$$("section .grid.grid-cols-2 > div");
  await cards[0].click();
  await page.waitForTimeout(400);
  await page.click("#confirmorder");

  // in-store: Start Picking
  await page.waitForSelector("#startorder", { timeout: 15000 });
  await shot("task_instore_picking_start");
  await shotPdf("task_instore_picking_start");
  await page.click("#startorder");
  await page.waitForSelector("#addtobag", { timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("task_instore_picking");
  await shotPdf("task_instore_picking");

  // read the shopping list for order 1 from the DOM
  const list = await page.evaluate(() => {
    const block = document.querySelectorAll("main .grid > div")[1]; // first order block
    const out = [];
    const sl = block && [...block.querySelectorAll("div")].find((d) => /Shopping List/i.test(d.textContent || ""));
    if (sl) for (const row of sl.querySelectorAll(".flex")) {
      const sp = row.querySelectorAll("span");
      if (sp.length >= 2) out.push({ item: sp[0].textContent.trim(), qty: parseInt(sp[1].textContent.replace(/\D/g, ""), 10) || 1 });
    }
    return out;
  });
  log("shopping list:", JSON.stringify(list));

  // pick each item: go to its aisle (grid cell), type name + qty, add to bag
  for (const { item, qty } of list) {
    const cell = page.locator(`main button:has-text("${item}")`).first();
    if (await cell.count()) { await cell.click().catch(() => {}); await page.waitForTimeout(2500); } // move + countdown
    await page.fill("input[placeholder='Type item name...']", item).catch(() => {});
    await page.fill("main input[type='number']", String(qty)).catch(() => {});
    await page.click("#addtobag").catch(() => {});
    await page.waitForTimeout(700);
  }

  await page.click("#checkout_and_deliver");
  // either delivery screen (GameState 5) or error
  const delivering = await page.waitForSelector("text=Deliver Orders", { timeout: 8000 }).then(() => true).catch(() => false);
  if (delivering) {
    await page.waitForTimeout(600);
    await shot("task_delivery");
    await shotPdf("task_delivery");
    // click every Deliver button, waiting out each countdown
    for (let i = 0; i < 4; i++) {
      const btn = page.locator("button:has-text('Deliver')").first();
      if (!(await btn.count())) break;
      await btn.click().catch(() => {});
      await page.waitForTimeout(4000); // delivery countdown
    }
  } else {
    log("checkout did not reach delivery (items may not validate); capturing current state");
    await shot("task_instore_after_checkout");
  }

  // wait for game over
  const over = await page.waitForSelector("text=/Your Stats|Game Over|Results Saved/", { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(1500);
  if (over) { await shot("score_gameover"); await shotPdf("score_gameover"); log("GAME OVER reached"); }
  else { log("game over not reached; capturing whatever is shown"); await shot("score_gameover_partial"); }

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
