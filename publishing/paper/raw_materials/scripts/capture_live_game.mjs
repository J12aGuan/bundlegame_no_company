/**
 * GENUINE in-game capture: authenticates as a real participant and plays the
 * real deployed game, capturing each store's in-store picking view (the actual
 * aisle grid) the first time that store is entered. Rounds are completed
 * (pick exact items -> checkout -> deliver) to advance until all 4 stores are seen.
 *
 * Screenshots are written to /tmp/bg_shots (outside the vite-watched tree) and
 * copied into figures/screenshots afterwards, so file writes don't reload the page.
 *
 * Prereq: dev server up (npm run dev). Run: node paper/raw_materials/capture_live_game.mjs
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = "/tmp/bg_shots";
fs.mkdirSync(SHOTS, { recursive: true });
const BASE = "http://localhost:5173";
const USER = "bobalab";
const TOKEN = "FC1F-8AA4-564C-2E37";
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 4; // high-DPI raster (was 2)
// Fixed print viewport so the vector PDF matches the on-screen layout 1:1.
const PDF_OPTS = { width: `${VIEWPORT.width}px`, height: `${VIEWPORT.height}px`, printBackground: true, pageRanges: "1" };
const log = (...a) => console.log("[live]", ...a);

const bundle = JSON.parse(fs.readFileSync(path.join(HERE, "..", "sources", "scenario_bundle.json"), "utf-8"));
const obj = Object.fromEntries(bundle.orders.map((o) => [o.id, o]));
const scenByRound = Object.fromEntries(bundle.scenarios.map((s) => [s.round, s]));

const STORE_KEY = {
  "Berkeley Bowl": "berkeley_bowl", "Sprouts Farmers Market": "sprouts",
  "Target": "target", "Safeway": "safeway",
};
const captured = new Set();
const MAX_ROUNDS = 9;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function currentRound(page) {
  return page.evaluate(() => {
    const m = (document.body.innerText.match(/Round:\s*(\d+)\s*\/\s*\d+/) || [])[1];
    return m ? Number(m) : null;
  });
}

async function authenticate(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#main-user-id", { timeout: 30000 });
  await page.fill("#main-user-id", USER);
  await page.fill("#main-user-token", TOKEN);
  await page.click("#start");
  await page.waitForSelector("text=Available Orders", { timeout: 30000 });
  await sleep(1500);
}

// choose which store to enter this round: prefer an uncaptured store present in the menu
function chooseStore(round) {
  const sc = scenByRound[round];
  const stores = sc.order_ids.map((id) => obj[id].store);
  const uniq = [...new Set(stores)];
  const need = uniq.find((s) => !captured.has(s));
  return need || uniq[0];
}

async function selectStoreOrders(page, round, store) {
  const sc = scenByRound[round];
  // take just ONE order at `store` — enough to enter the store + complete/advance the round
  const i = sc.order_ids.findIndex((id) => obj[id].store === store);
  const addButtons = await page.$$("button:has-text('Add to Tasks')");
  if (addButtons[i]) { await addButtons[i].click(); await sleep(300); }
  await page.waitForSelector("#confirmorder", { timeout: 10000 });
  await page.click("#confirmorder");
  return [sc.order_ids[i]]; // single selected order id
}

async function waitPicking(page) {
  // GameState 1: "Item to Be Picked" visible and not "Moving to aisle..."
  for (let t = 0; t < 120; t++) {
    const st = await page.evaluate(() => ({
      pick: !!document.querySelector("input[placeholder='Type item name...']"),
      moving: /Moving to aisle/.test(document.body.innerText),
    }));
    if (st.pick && !st.moving) return true;
    await sleep(250);
  }
  return false;
}

async function pickAndDeliver(page, selectedIds) {
  await waitPicking(page);
  // union of items across selected orders
  const items = [...new Set(selectedIds.flatMap((id) => Object.keys(obj[id].items).map((k) => k.toLowerCase())))];
  for (const item of items) {
    // click the grid CELL button whose letters-only text == item (grid cells have min-h-[60px])
    const clicked = await page.evaluate((it) => {
      const cell = [...document.querySelectorAll("button")].find(
        (b) => /min-h/.test(b.className) && b.textContent.replace(/[^a-z]/gi, "").toLowerCase() === it);
      if (cell) { cell.click(); return true; } return false;
    }, item);
    if (!clicked) { log("  cell not found:", item); continue; }
    // VERIFY-then-type: wait until the highlighted (green) grid cell == item and not moving
    let at = false;
    for (let t = 0; t < 80; t++) {
      const g = await page.evaluate(() => {
        const moving = /Moving to aisle/.test(document.body.innerText);
        const cur = [...document.querySelectorAll("button")].find(
          (b) => /border-green-500/.test(b.className) && /min-h/.test(b.className));
        return { moving, txt: cur ? cur.textContent.replace(/[^a-z]/gi, "").toLowerCase() : null };
      });
      if (!g.moving && g.txt === item) { at = true; break; }
      await sleep(250);
    }
    if (!at) { log("  could not reach cell:", item); continue; }
    await page.fill("input[placeholder='Type item name...']", item);
    const qtyInputs = await page.$$("input[type='number']");
    for (let k = 0; k < selectedIds.length; k++) {
      const need = obj[selectedIds[k]].items[item] || 0;
      if (qtyInputs[k]) await qtyInputs[k].fill(need ? String(need) : "");
    }
    await page.click("#addtobag");
    await sleep(350);
  }
  await page.click("#checkout_and_deliver");
  // GameState 5 delivery, or GameState 4 error
  await sleep(800);
  if (await page.evaluate(() => /Incorrect Items/.test(document.body.innerText))) {
    throw new Error("checkout rejected (incorrect items)");
  }
  // deliver every order
  for (let guard = 0; guard < 8; guard++) {
    const delBtns = await page.$$("button:has-text('Deliver')");
    if (delBtns.length === 0) break;
    await delBtns[0].click().catch(() => {});
    // wait for the delivery countdown to clear (button count drops / decision returns)
    for (let t = 0; t < 80; t++) {
      await sleep(300);
      const driving = await page.evaluate(() => /Driving to/.test(document.body.innerText));
      const back = await page.evaluate(() => /Available Orders/.test(document.body.innerText));
      if (back) return;
      if (!driving) break;
    }
  }
  // wait for next decision screen
  await page.waitForSelector("text=Available Orders", { timeout: 30000 }).catch(() => {});
  await sleep(1200);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { log("DIALOG:", d.message()); d.dismiss().catch(() => {}); });
  await authenticate(page);

  // Vector PDF of the current full screen (screen media keeps the on-screen layout).
  const pdfShot = async (n) => {
    await page.emulateMedia({ media: "screen" });
    await page.pdf({ path: path.join(SHOTS, `${n}.pdf`), ...PDF_OPTS });
    log(`saved ${n}.pdf`);
  };

  // capture the genuine decision screen + study-arm panel once
  await page.screenshot({ path: path.join(SHOTS, "live_decision_round1.png") });
  await pdfShot("live_decision_round1");
  log("saved live_decision_round1.png");

  for (let step = 0; step < MAX_ROUNDS && captured.size < 4; step++) {
    const round = await currentRound(page);
    if (!round) { log("no round marker; stop"); break; }
    const store = chooseStore(round);
    const isNew = !captured.has(store);
    log(`round ${round}: entering ${store}${isNew ? " (NEW -> capture)" : ""}`);
    const selectedIds = await selectStoreOrders(page, round, store);
    await page.waitForSelector("#startorder", { timeout: 30000 });
    await sleep(400);
    await page.click("#startorder");
    const ok = await waitPicking(page);
    if (ok && isNew) {
      const key = STORE_KEY[store];
      await page.screenshot({ path: path.join(SHOTS, `live_store_interior_${key}.png`) });
      await pdfShot(`live_store_interior_${key}`);
      // sidecar
      fs.writeFileSync(path.join(SHOTS, `live_store_interior_${key}.txt`),
        [`file: live_store_interior_${key}.png`, `figure_type: store_interior (LIVE in-game)`,
         `store: ${store}`, `city: ${obj[scenByRound[round].order_ids.find((id) => obj[id].store === store)].city}`,
         `scenario_set: mainGame_2026_03_20_14_26_36`, `round_index: ${round}`,
         `order_ids: ${JSON.stringify(selectedIds)}`, `participant: ${USER}`,
         `viewport: ${VIEWPORT.width}x${VIEWPORT.height}`, `device_pixel_ratio: ${SCALE}`,
         `rendered_pixels: ${VIEWPORT.width * SCALE}x${VIEWPORT.height * SCALE}`,
         `crop: none (full viewport)`, `source: genuine authenticated play-through of deployed game`].join("\n") + "\n");
      captured.add(store);
      log(`  captured live_store_interior_${key}.png  (have: ${[...captured].join(", ")})`);
    }
    try {
      await pickAndDeliver(page, selectedIds);
    } catch (e) {
      log(`  round ${round} completion FAILED: ${e.message}`);
      await page.screenshot({ path: path.join(SHOTS, `live_fail_round${round}.png`) });
      break;
    }
  }
  log("DONE. captured stores:", [...captured].join(", ") || "none");
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
