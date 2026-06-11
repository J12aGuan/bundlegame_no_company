/**
 * Renders the two "worked example" figures for mainGameScenario12 (round 12),
 * matching the style of task_decision_empty.png. Real scenario data (no mocks).
 *   menu_worked_example.png          - all four orders, none selected
 *   menu_worked_example_selected.png - orders 45, 47, 48 selected + confirm summary
 * Run with the dev server up:  node paper/figures/screenshots/capture_worked_example.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BG_URL || "http://localhost:5173";
const ROUND = 12;                 // mainGameScenario12
const SELECT_IDS = ["mainGameOrder45", "mainGameOrder47", "mainGameOrder48"];
const log = (...a) => console.log("[worked]", ...a);

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--enable-webgl"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  const shot = (n, o = {}) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...o }).then(() => log("saved", n + ".png"));
  const cleanChrome = () => page.evaluate(() => {
    for (const el of document.querySelectorAll("section div")) {
      if (el.className && String(el.className).includes("rounded-2xl") && /Study Arm/i.test(el.textContent || "")) {
        el.style.display = "none";
      }
    }
  });

  // entry (no-auth dev path, no Firestore write)
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#start", { timeout: 30000 });
  await page.evaluate(() => window.__bundle && window.__bundle.needsAuth.set(false));
  await page.waitForTimeout(500);
  await page.click("#start");
  await page.waitForSelector("h2:has-text('Available Orders')", { timeout: 30000 });
  await page.waitForTimeout(2000);

  // pin scenario 12
  await page.evaluate((r) => {
    const b = window.__bundle;
    b.orders.set([]);
    b.gameText.update((t) => ({ ...t, selector: "None selected" }));
    b.currentRound.set(r);
  }, ROUND);
  await page.waitForTimeout(1800);
  await page.click("button:has-text('Skip')").catch(() => {});
  await cleanChrome();
  await page.waitForTimeout(2500); // let MapTiler tiles settle

  // report the per-order payouts actually rendered, read from the DOM
  const rendered = await page.evaluate(() => {
    const out = [];
    for (const card of document.querySelectorAll("section .grid.grid-cols-2 > div")) {
      const store = card.querySelector("h3")?.textContent?.trim();
      const city = card.querySelector("p")?.textContent?.replace(/[^\w ]/g, "").trim();
      const pay = card.querySelector("span.text-green-600")?.textContent?.trim();
      out.push({ store, city, pay });
    }
    return out;
  });
  log("rendered cards:", JSON.stringify(rendered));

  // SHOT 1: empty menu
  await shot("menu_worked_example");

  // SHOT 2: select orders 45, 47, 48 (DOM order is 45,46,47,48 -> indices 0,2,3)
  const cards = await page.$$("section .grid.grid-cols-2 > div");
  for (const idx of [0, 2, 3]) { await cards[idx].click().catch(() => {}); await page.waitForTimeout(300); }
  await cleanChrome();
  await page.waitForTimeout(400);
  const confirm = await page.evaluate(() => document.querySelector("#confirmorder")?.textContent?.trim());
  log("confirm summary:", confirm);
  await shot("menu_worked_example_selected");

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
