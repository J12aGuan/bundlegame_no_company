// CHI participant probe: drive the REAL game (production +page.svelte) on the LOCAL emulator
// as a SCRIPTED participant, then read back the persisted diagnosis_history. This is a
// SYSTEM-DISCRIMINATION probe, not human efficacy: it checks that the diagnosis TRACKS the
// scripted behaviour (it re-targets or abstains only when the scripted choices actually
// change, and keeps flagging a leak that persists), not whether feedback helps real people.
//
// Prereqs: firebase emulators:start (firebase.emulator.json), seed-emulator.mjs --full applied,
// and the dev app running with VITE_USE_FIREBASE_EMULATOR=true (see docs/shared/EMULATOR_SMOKE.md).
//
// Usage: node scripts/chi-participant-probe.mjs --type=mix|overbundler|payout --learn=true|false [--id=<id>]
//   type=mix         : over-bundles AND chases payout (ranks bundles by total earnings, pairs allowed)
//   type=overbundler : maximises bundle SIZE (pure over-bundling -> W1)
//   type=payout      : single highest-paying order, no over-bundle (pure payout -> W3)
//   learn=true       : corrects whatever axis the live diagnosis coaches (W1 -> stop over-bundling,
//                      W3 -> rank by rate); learn=false ignores the coaching (the leak should persist).
import { chromium } from "playwright-core";
import { generateAuthToken } from "../src/lib/authToken.js";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const arg = (n, d) => { const h = process.argv.slice(2).find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const TYPE = arg("type", "mix");
const LEARN = arg("learn", "true") === "true";
const ID = arg("id", `probe_${TYPE}_${LEARN ? "learn" : "persist"}`);
const HOST = arg("host", "127.0.0.1");
const PORT = Number(arg("port", 8080));
const PROJECT = arg("project", "bundling-63c10");
const URL = arg("url", "http://localhost:5174/");
process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORT}`;
if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0|::1)$/.test(HOST)) { console.error("REFUSED: this probe only runs against a LOCAL emulator."); process.exit(2); }
const db = getFirestore(initializeApp({ projectId: PROJECT }));

// Initial bias + selection key by type. The 'key' ranks legal (single-store) bundles.
const START = {
  mix: { key: "earn", overBundle: true },          // chase earnings, allow over-bundles
  overbundler: { key: "size", overBundle: true },  // maximise bundle size (pure over-bundling)
  payout: { key: "earn", overBundle: false },       // single highest-paying order
}[TYPE] || { key: "earn", overBundle: true };
const bias = { ...START };
function applyCoaching(target) {
  if (!LEARN) return;                                 // non-learner ignores the coaching
  if (target === "W1") bias.overBundle = false;       // stop over-bundling
  else if (target === "W3") bias.key = "rate";        // rank by rate, not earnings
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext()).newPage();
page.on("dialog", async (d) => { await d.accept().catch(() => {}); });
const txt = async () => (await page.$eval("body", (b) => b.innerText).catch(() => ""));
const roundNum = async () => { const m = (await txt()).match(/Round:\s*(\d+)/); return m ? Number(m[1]) : null; };
const has = async (s) => (await txt()).includes(s);
const clickText = async (t) => { const b = await page.$(`button:has-text(${JSON.stringify(t)})`); if (b && !(await b.isDisabled().catch(() => false))) { await b.click().catch(() => {}); return true; } return false; };
const waitGone = async (s, ms = 13000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!(await has(s))) return true; await page.waitForTimeout(150); } return false; };
const diagTarget = async () => { const s = await db.doc(`Users/${ID}/Summary/summary`).get(); const dh = s.data()?.summaryByScenarioSetVersionId?.chi_dynamic_v1?.researchStudy?.diagnosis_history || []; return dh.at(-1)?.learning_target ?? null; };

async function parseOrders() {
  return page.$$eval("button:has-text('Add to Tasks')", (btns) => btns.map((b) => {
    let card = b.closest("div");
    for (let i = 0; i < 6 && card && !/\$\d/.test(card.innerText || ""); i += 1) card = card.parentElement;
    const t = card?.innerText || "";
    return { store: (t.split("\n")[0] || "").trim(), earn: Number((t.match(/\$(\d+)/) || [])[1] || 0), time: Number((t.match(/modeled\s*(\d+)\s*s/) || [])[1] || 1) };
  }));
}
function selectBundle(orders) {
  const byStore = {}; orders.forEach((o, i) => { (byStore[o.store] ||= []).push(i); });
  const cands = [];
  for (const g of Object.values(byStore)) {
    for (const i of g) cands.push({ idx: [i], earn: orders[i].earn, time: orders[i].time, size: 1 });
    if (bias.overBundle && g.length >= 2) for (let a = 0; a < g.length; a += 1) for (let b = a + 1; b < g.length; b += 1) cands.push({ idx: [g[a], g[b]], earn: orders[g[a]].earn + orders[g[b]].earn, time: orders[g[a]].time + orders[g[b]].time, size: 2 });
  }
  for (const c of cands) c.rate = c.earn / Math.max(1, c.time);
  return cands.sort((x, y) => (y[bias.key] - x[bias.key]) || (y.earn - x.earn))[0].idx;
}
async function playRound() {
  const orders = await parseOrders(); if (!orders.length) return;
  const add = await page.$$("button:has-text('Add to Tasks')");
  for (const i of selectBundle(orders)) { if (add[i]) { await add[i].click().catch(() => {}); await page.waitForTimeout(180); } }
  if (!(await clickText("Confirm Order"))) return;
  await page.waitForTimeout(800); await clickText("Start Picking"); await page.waitForTimeout(800);
  for (const [item, qty] of [["apple", 1], ["banana", 2]]) {
    const cell = await page.$(`button:has-text(${JSON.stringify(item)})`);
    if (cell) { await cell.click().catch(() => {}); await waitGone("Moving to aisle", 6000); await page.waitForTimeout(220); }
    await page.fill("input[placeholder='Type item name...']", item).catch(() => {});
    for (const qi of await page.$$("input[type=number]")) await qi.fill(String(qty)).catch(() => {});
    await page.click("#addtobag").catch(() => {}); await page.waitForTimeout(260);
  }
  await page.click("#checkout_and_deliver").catch(() => {}); await page.waitForTimeout(900);
  for (let d = 0; d < 16; d += 1) { if (await has("Driving to")) { await waitGone("Driving to"); await page.waitForTimeout(280); continue; } const b = await page.$("button:has-text('Deliver')"); if (b && !(await b.isDisabled().catch(() => false))) { await b.click().catch(() => {}); await page.waitForTimeout(360); continue; } break; }
  await page.waitForTimeout(700);
}

await page.goto(URL, { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await page.fill("#main-user-id", ID); await page.fill("#main-user-token", generateAuthToken(ID)); await page.click("#start");
await page.waitForTimeout(3500);
console.log(`[${ID}] type=${TYPE} learn=${LEARN} | entered at round ${await roundNum()}`);

let guard = 0, prev = 0, stuck = 0, lastDiag = "init";
while (guard++ < 130) {
  if (await has("A few quick questions")) { const gs = await page.$$("div.flex.gap-2"); for (const g of gs) { const bs = await g.$$("button"); if (bs.length >= 3) await bs[Math.floor(bs.length / 2)].click().catch(() => {}); } await clickText("Continue"); await page.waitForTimeout(2600); continue; }
  if (await has("Result Code") || await has("session is complete")) { console.log("  end screen"); break; }
  if (await has("Driving to") || await has("Deliver Orders")) { await page.waitForTimeout(700); continue; }
  const r = await roundNum(); if (r == null) { await page.waitForTimeout(700); continue; }
  const tgt = await diagTarget();
  if (tgt !== lastDiag) { console.log(`  diagnosis target -> ${tgt} (at round ${r}); ${LEARN ? "participant corrects it" : "participant IGNORES it"}`); applyCoaching(tgt); lastDiag = tgt; }
  if (await page.$("button:has-text('Add to Tasks')")) {
    await playRound(); const nr = await roundNum();
    if (nr === prev) { stuck += 1; if (stuck > 5) { console.log("  STUCK at", nr); break; } } else { stuck = 0; if (nr % 5 === 0) console.log(`  ...round ${nr} (key=${bias.key}, overBundle=${bias.overBundle})`); }
    prev = nr;
  } else { await page.waitForTimeout(600); }
}

// read back the persisted diagnosis_history
const rs = (await db.doc(`Users/${ID}/Summary/summary`).get()).data()?.summaryByScenarioSetVersionId?.chi_dynamic_v1?.researchStudy || {};
console.log(`\n[${ID}] finished. arm=${rs.assigned_arm}. diagnosis_history:`);
for (const d of (rs.diagnosis_history || [])) console.log(`  r${d.round} [${d.trigger}] -> target=${d.learning_target} dominant=${d.dominant_weakness} | W1/W2/W3=${[d.strengths?.W1, d.strengths?.W2, d.strengths?.W3].map((x) => x == null ? "?" : (+x).toFixed(2)).join("/")}`);
await browser.close();
process.exit(0);
