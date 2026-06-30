// Drive the PRODUCTION game (+page.svelte) headless for 35 rounds with a planted bias against
// the local Firestore emulator (docs/shared/EMULATOR_SMOKE.md). Authenticates via generateAuthToken(id),
// selects per bias, completes store-pick + delivery, answers the r15 survey at midpoint so
// diagnosis_history reflects BEHAVIOUR + the live spanning estimator. Read back with
// scripts/readback-emulator.mjs.  Usage: node scripts/drive-emulator-game.mjs <id> <bias>
//   bias: payout_H | payout_bundle | pickneglect | mix
import { chromium } from "playwright-core";
import { generateAuthToken } from "../src/lib/authToken.js";

const ID = process.argv[2] || "p_drive";
const BIAS = process.argv[3] || "pickneglect";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext()).newPage();
page.on("dialog", async (d) => { await d.accept().catch(() => {}); });
page.on("console", (m) => { const t = m.text(); if (/Round complete|finishSuccess/.test(t)) {} });

const txt = async () => (await page.$eval("body", (b) => b.innerText).catch(() => ""));
const roundNum = async () => { const m = (await txt()).match(/Round:\s*(\d+)/); return m ? Number(m[1]) : null; };
const has = async (s) => (await txt()).includes(s);
const clickText = async (t) => { const b = await page.$(`button:has-text(${JSON.stringify(t)})`); if (b && !(await b.isDisabled().catch(() => false))) { await b.click().catch(() => {}); return true; } return false; };
const waitGone = async (s, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await has(s))) return true; await page.waitForTimeout(150); } return false; };

// Parse the available-order cards on the select screen: store + $earnings + modeled time, in
// DOM order (matching the "Add to Tasks" buttons).
async function parseOrders() {
  return page.$$eval("button:has-text('Add to Tasks')", (btns) => btns.map((b) => {
    let card = b.closest("div");
    for (let i = 0; i < 6 && card && !/\$\d/.test(card.innerText || ""); i += 1) card = card.parentElement;
    const t = (card?.innerText || "");
    const store = (t.split("\n")[0] || "").trim();
    const earn = Number((t.match(/\$(\d+)/) || [])[1] || 0);
    const modeled = Number((t.match(/modeled\s*(\d+)\s*s/) || [])[1] || 0);
    return { store, earn, modeled };
  }));
}

// Bias -> indices to select. Bundles must be SINGLE-STORE (legal action mask), so over-bundle
// variants only ever group within one store; on a menu with no same-store pair they pick a
// single order. payout_H always takes the single highest-paying order (H on traps).
function selectByBias(orders, bias) {
  const byStore = {};
  orders.forEach((o, i) => { (byStore[o.store] ||= []).push(i); });
  const multi = Object.values(byStore).filter((g) => g.length >= 2);
  const single = (key) => [orders.map((o, i) => i).reduce((a, i) => (orders[i][key] > orders[a][key] ? i : a), 0)];
  if (bias === "payout_H") return single("earn");
  if (!multi.length) return bias === "pickneglect" ? single("modeled") : single("earn");
  const score = bias === "pickneglect"
    ? (g) => g.reduce((s, i) => s + orders[i].modeled, 0) // over-bundle for pick load
    : (g) => g.reduce((s, i) => s + orders[i].earn, 0);   // over-bundle for earnings (payout_bundle / mix)
  return multi.sort((a, b) => score(b) - score(a))[0];
}

async function handleSurvey() {
  // answer every question at the midpoint (button labelled "3" for a 1-5 scale), then Continue
  const groups = await page.$$("div.flex.gap-2");
  for (const g of groups) {
    const btns = await g.$$("button");
    if (btns.length >= 3) await btns[Math.floor(btns.length / 2)].click().catch(() => {});
  }
  await page.waitForTimeout(300);
  await clickText("Continue");
  await page.waitForTimeout(2500);
}

async function playRound() {
  const orders = await parseOrders();
  if (!orders.length) return false;
  const pick = selectByBias(orders, BIAS);
  const addBtns = await page.$$("button:has-text('Add to Tasks')");
  for (const i of pick) { if (addBtns[i]) { await addBtns[i].click().catch(() => {}); await page.waitForTimeout(200); } }
  if (!(await clickText("Confirm Order"))) return false;
  await page.waitForTimeout(900);
  await clickText("Start Picking");
  await page.waitForTimeout(900);
  // pick apple x1, banana x2 for every selected order
  for (const [item, qty] of [["apple", 1], ["banana", 2]]) {
    const cell = await page.$(`button:has-text(${JSON.stringify(item)})`);
    if (cell) { await cell.click().catch(() => {}); await waitGone("Moving to aisle", 6000); await page.waitForTimeout(250); }
    await page.fill("input[placeholder='Type item name...']", item).catch(() => {});
    const qtys = await page.$$("input[type=number]");
    for (const qi of qtys) await qi.fill(String(qty)).catch(() => {});
    await page.click("#addtobag").catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.click("#checkout_and_deliver").catch(() => {});
  await page.waitForTimeout(1000);
  // fully resolve delivery: wait out each "Driving to" countdown and deliver every order,
  // until no countdown and no Deliver button remain (the round then auto-advances).
  for (let d = 0; d < 16; d += 1) {
    if (await has("Driving to")) { await waitGone("Driving to", 13000); await page.waitForTimeout(300); continue; }
    const db = await page.$("button:has-text('Deliver')");
    if (db && !(await db.isDisabled().catch(() => false))) { await db.click().catch(() => {}); await page.waitForTimeout(400); continue; }
    break;
  }
  await page.waitForTimeout(800);
  return true;
}

await page.goto("http://localhost:5174/", { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await page.fill("#main-user-id", ID); await page.fill("#main-user-token", generateAuthToken(ID)); await page.click("#start");
await page.waitForTimeout(3500);
console.log(`[${ID}/${BIAS}] entered at round`, await roundNum());

let guard = 0, stuck = 0, prev = 0;
while (guard++ < 120) {
  if (await has("A few quick questions")) { console.log("  survey @ round", await roundNum()); await handleSurvey(); continue; }
  if (await has("Result Code") || await has("Qualtrics") || await has("session is complete") || await has("Completion")) { console.log("  end screen reached"); break; }
  if (await has("Driving to") || await has("Deliver Orders")) { await page.waitForTimeout(800); continue; } // mid-delivery
  const r = await roundNum();
  if (r == null) { await page.waitForTimeout(800); continue; }
  if (r >= 35 && stuck > 2) break; // likely finished
  if (await page.$("button:has-text('Add to Tasks')")) {
    const ok = await playRound();
    const nr = await roundNum();
    if (nr === prev) { stuck += 1; if (stuck > 4) { console.log(`  STUCK at round ${nr} ok=${ok} btns=${JSON.stringify([...new Set(await page.$$eval("button", (e) => e.map((x) => (x.innerText || "").trim()).filter(Boolean)))].slice(0, 10))} body=${(await txt()).replace(/\n+/g, " ").slice(0, 200)}`); break; } }
    else { stuck = 0; if (nr % 5 === 0) console.log("  ...round", nr); }
    prev = nr;
  } else {
    stuck += 1;
    if (stuck > 4) { console.log(`  IDLE at round ${r} btns=${JSON.stringify([...new Set(await page.$$eval("button", (e) => e.map((x) => (x.innerText || "").trim()).filter(Boolean)))].slice(0, 10))} body=${(await txt()).replace(/\n+/g, " ").slice(0, 220)}`); break; }
    await page.waitForTimeout(700);
  }
}
console.log(`[${ID}/${BIAS}] finished at round`, await roundNum());
await browser.close();
