// REGENERATION SCRIPT for the frozen Section-5 deployed-scored pilot inputs. READ-ONLY (no live writes).
//
// What it does: reads the per-decision pilot data + dataset from Firestore (read-only) and the committed
// pilot-era inputs (frozen_inputs/pilot_stores.json + pilot_cities.json), reconstructs the cross-city
// matrix from recorded crosses as an independent cross-check, re-scores every decision with the REAL
// deployed scorer (analysis/engine.scoreBundle = item-access savings; oracle = the dataset's static
// best_bundle_ids), validates against the 55 stored deployed rows (expects 55/55 within 1e-6), and emits:
//   pilot_decisions_deployed.csv, frozen_bundle_menu_data.csv, reconstructed_cities_matrix.csv
// Participant ids are pseudonymized to stable tokens (p001..). Provenance: FROZEN_INPUTS_README.md.
//   node scripts/freeze-section5-deployed.mjs "C:/path/to/service-account.json"
import { readFileSync, writeFileSync, existsSync } from "fs";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { scoreBundle as deployedScoreBundle } from "../src/lib/analysis/engine.js";
import { enumerateLegalBundles } from "../src/lib/chiScenarioDesign.js";
const keyPath = process.argv[2];
if (!keyPath) { console.error("Pass the service-account key path."); process.exit(2); }
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
delete process.env.FIRESTORE_EMULATOR_HOST;
const db = getFirestore(initializeApp({ credential: applicationDefault(), projectId: "bundling-63c10" }, "reconfreeze"));
const PILOT = "mainGame_2026_03_20_14_26_36";
const DIR = "publishing/export_for_analysis";

const entry = (await db.doc("MasterData/datasets").get()).data()?.datasets?.mainGame || {};
const ordersById = Object.fromEntries((entry.orders || []).map((o) => [o.id, o]));
const scenById = Object.fromEntries((entry.scenarios || []).map((s) => [s.scenario_id, s]));
const optById = Object.fromEntries((entry.optimal || []).map((o) => [o.scenario_id, o]));
const liveCities = (await db.doc("MasterData/cities").get()).data() || {};
const liveTT = liveCities.travelTimes || {};
// EXACT pilot-era store grid + cities from the raw Firestore pull preserved for the paper. Rename
// "Sprouts Farmers Market" -> "Sprouts" so the (recently added) bundleTime STORE_NAME_ALIASES redirect
// resolves to a real grid; the pilot had no alias and matched the legacy name directly.
const pilotGrid = JSON.parse(readFileSync(`${DIR}/frozen_inputs/pilot_stores.json`, "utf8"));
const storeDataset = { stores: (Array.isArray(pilotGrid) ? pilotGrid : (pilotGrid.stores || [])).map((s) => String(s.store) === "Sprouts Farmers Market" ? { ...s, store: "Sprouts" } : s) };
const rawPullCities = JSON.parse(readFileSync(`${DIR}/frozen_inputs/pilot_cities.json`, "utf8"));
const pilotTT = rawPullCities.travelTimes || {};
const startCity = String(liveCities.startinglocation || "Berkeley");
const cityOf = (id) => String(ordersById[id]?.city || "");
const pickOf = (o) => Math.max(0, (Number(o.estimatedTime) || 0) - (Number(o.localTravelTime) || 0));

// token map
let tokenOf = {}; const mapPath = `${DIR}/pilot_pseudonym_map.csv`;
if (existsSync(mapPath)) { const L = readFileSync(mapPath, "utf8").trim().split("\n"); for (let i = 1; i < L.length; i++) { const [id, t] = L[i].split(","); tokenOf[id] = t; } }

// ---- gather participants + decisions (chosen, recorded cross, stored current_city) ----
const users = await db.collection("Users").listDocuments();
const parts = [];
for (const u of users) {
  const aSnap = await u.collection("Action").get().catch(() => null);
  let lmap = null; if (aSnap) for (const d of aSnap.docs) { const x = d.data()?.actionsByScenarioSetVersionId?.[PILOT]; if (x?.actionsByScenarioId) lmap = x.actionsByScenarioId; }
  if (!lmap) continue;
  const acts = await u.collection("Actions").get().catch(() => null);
  const rich = {};
  if (acts) for (const d of acts.docs) { const x = d.data(); if (String(x.scenarioSetVersionId) === PILOT && x.round_index != null) rich[String(x.scenario_id)] = { current_city: String(x.current_city || ""), oracle: (x.best_bundle_ids || []).map(String).sort().join("+"), regret: typeof x.percent_regret === "number" ? x.percent_regret : parseFloat(x.percent_regret) }; }
  parts.push({ id: u.id, lmap, rich });
}
// Pseudonymize: prefer the local re-id map (gitignored); otherwise assign stable tokens deterministically
// in sorted-id order (matches scripts/pseudonymize-pilot-export.mjs), so a fresh clone reproduces p001.. .
if (Object.keys(tokenOf).length === 0) parts.map((p) => p.id).sort().forEach((id, i) => { tokenOf[id] = `p${String(i + 1).padStart(3, "0")}`; });
for (const p of parts) p.token = tokenOf[p.id] || p.id;

// ---- STEP 1: reconstruct the matrix from recorded crosses ----
const obs = {};  // "from->to" -> [cross values]
const addObs = (from, to, c, reliable) => { if (!from || !to || from === to) return; (obs[`${from}->${to}`] ??= []).push({ c, reliable }); };
for (const p of parts) {
  const sids = Object.keys(p.lmap).filter((s) => Array.isArray(p.lmap[s]?.orderSummary) && p.lmap[s].orderSummary.length).sort((a, b) => (Number(a.replace(/\D/g, "")) || 0) - (Number(b.replace(/\D/g, "")) || 0));
  let curRecon = startCity;
  for (const sid of sids) {
    const chosen = p.lmap[sid].orderSummary.map(String); const toCity = cityOf(chosen[0]);
    const rec = Number(p.lmap[sid]?.timeSummary?.cityTravelTime);
    const stored = p.rich[sid]?.current_city;
    const fromCity = stored || curRecon;                 // stored = reliable; round-1 (Berkeley) reliable too
    const reliable = Boolean(stored) || curRecon === startCity && sid === sids[0];
    if (Number.isFinite(rec)) addObs(fromCity, toCity, rec, reliable);
    if (toCity) curRecon = toCity;
  }
}
const CITIES = [...new Set((entry.orders || []).map((o) => String(o.city)))];
const mode = (vals) => { const r = {}; let best = null, bestN = 0; for (const v of vals) { const k = Math.round(v * 2) / 2; r[k] = (r[k] || 0) + 1; if (r[k] > bestN) { bestN = r[k]; best = k; } } return best; };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const std = (a) => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
const reconTT = {}; const pairRows = []; let well = 0, poor = 0, zero = 0, fellBack = 0;
for (const from of CITIES) { reconTT[from] = reconTT[from] || {}; reconTT[from][from] = 0;
  for (const to of CITIES) { if (from === to) continue;
    const list = (obs[`${from}->${to}`] || []).map((o) => o.c);
    const relList = (obs[`${from}->${to}`] || []).filter((o) => o.reliable).map((o) => o.c);
    let val, ident;
    if (list.length === 0) { val = Number(liveTT?.[from]?.[to]) || 0; ident = "ZERO-OBS->live-fallback"; zero++; fellBack++; }
    else { val = mode(relList.length >= 3 ? relList : list); const sd = std(list);
      const tight = sd <= 1.0; const enough = list.length >= 5;
      ident = (tight && enough) ? "well" : "poor"; if (ident === "well") well++; else poor++; }
    reconTT[from][to] = val;
    const L = list;
    pairRows.push({ from_city: from, to_city: to, reconstructed_cross: val, obs_count: L.length, reliable_obs: relList.length, min: L.length ? Math.min(...L) : "", median: L.length ? median(L) : "", max: L.length ? Math.max(...L) : "", std: L.length ? +std(L).toFixed(2) : "", live_value: Number(liveTT?.[from]?.[to]) || 0, identification: ident });
  }
}

// cross-check: reconstructed matrix vs the exact raw-pull pilot matrix
let xcheckOK = 0, xcheckN = 0; for (const f of CITIES) for (const t of CITIES) if (f !== t) { xcheckN++; if (Number(reconTT[f]?.[t]) === Number(pilotTT[f]?.[t])) xcheckOK++; }
console.log(`\nCROSS-CHECK: reconstructed matrix == exact raw-pull pilot matrix on ${xcheckOK}/${xcheckN} pairs`);
// ---- scorer uses the EXACT raw-pull pilot cities matrix ----
const reconCities = { travelTimes: pilotTT, startinglocation: startCity };
const score = (ids, currentCity) => { const r = deployedScoreBundle({ bundleIds: ids, ordersById, currentCity, citiesDataset: reconCities, storeDataset }); return { score: Number(r.score) || 0, time: Number(r.modeled_time) || 0, earnings: Number(r.earnings) || 0 }; };
const menuOf = (sid) => { const s = scenById[sid] || {}; return (s.order_ids || Object.keys(ordersById).filter((id) => id.startsWith(sid.replace("Scenario", "Order")))).filter((id) => ordersById[id]); };
const feasible = (sid) => enumerateLegalBundles(menuOf(sid), ordersById, Number((scenById[sid] || {}).max_bundle) || 3);
const norm = (a) => (a || []).map(String).slice().sort().join("+");
// The DEPLOYED oracle is the dataset's static generation-time optimal (best_bundle_ids), scored under the
// decision's current city - NOT a per-decision argmax (verified: argmax flips on 10/55, static matches 55/55).
const oracleOf = (sid, city) => { const ids = (optById[sid]?.best_bundle_ids || []).map(String); return ids.length ? { ids, s: score(ids, city) } : null; };
const reconCross = (toC, fromC) => { const v = pilotTT?.[fromC]?.[toC]; return (!toC || !fromC || toC === fromC || !Number.isFinite(Number(v))) ? 0 : Number(v); };

// ---- STEP 3: validate vs the 55 stored rows ----
let valN = 0, valOK = 0; const misses = [];
for (const p of parts) for (const [sid, g] of Object.entries(p.rich)) {
  if (!Number.isFinite(g.regret) || !p.lmap[sid]?.orderSummary) continue;
  const chosen = p.lmap[sid].orderSummary.map(String); const city = g.current_city; valN++;
  const orc = oracleOf(sid, city); const sc = score(chosen, city);
  const reg = orc && orc.s.score > 0 ? Math.max(0, (orc.s.score - sc.score) / orc.s.score) : 0;
  if (Math.abs(reg - g.regret) < 1e-6) valOK++; else if (misses.length < 12) misses.push(`r${sid.replace(/\D/g, "")} multi=${chosen.length > 1 || (orc?.ids.length || 1) > 1} d=${(reg - g.regret).toFixed(4)}`);
}

// ---- REPORT Steps 1-3 ----
console.log(`=== STEP 1-2: reconstructed matrix identifiability (${pairRows.length} ordered pairs, ${CITIES.length} cities) ===`);
console.log("from -> to        recon  obs(rel)  min/med/max  std   live   ident");
for (const r of pairRows.sort((a, b) => (a.from_city + a.to_city).localeCompare(b.from_city + b.to_city)))
  console.log(`${(r.from_city + " -> " + r.to_city).padEnd(28)} ${String(r.reconstructed_cross).padStart(4)}  ${String(r.obs_count).padStart(3)}(${String(r.reliable_obs).padStart(3)})  ${String(r.min)}/${String(r.median)}/${String(r.max)}`.padEnd(70) + ` ${String(r.std).padStart(4)}  ${String(r.live_value).padStart(4)}  ${r.identification}`);
console.log(`\nidentification summary: well ${well}, poor ${poor}, zero-obs(live-fallback) ${zero}`);
const dispersed = pairRows.filter((r) => typeof r.std === "number" && r.std > 2.0 && r.obs_count >= 5);
console.log(`FLAG dispersed pairs (std>2, >=5 obs -> possible path-dependence): ${dispersed.length ? dispersed.map((r) => `${r.from_city}->${r.to_city}(std ${r.std})`).join(", ") : "none"}`);
console.log(`\n=== STEP 3: validation vs the 55 stored rows (reconstructed matrix) ===`);
console.log(`  match percent_regret_deployed within 1e-6: ${valOK}/${valN}  (was 26/55 with the live matrix)`);
if (misses.length) console.log("  residual misses:", misses.join(" | "));

// ---- STEP 4: freeze if >=50/55 ----
if (valOK < 50) { console.log(`\nSTEP 4 SKIPPED: ${valOK}/${valN} < 50/55 -> NOT freezing. Reporting only.`); process.exit(0); }
console.log(`\n=== STEP 4: ${valOK}/${valN} >= 50 -> FREEZING ===`);
const decRows = [], menuRows = []; const perPart = {}; let participants = 0;
for (const p of parts) {
  participants++; const sids = Object.keys(p.lmap).filter((s) => Array.isArray(p.lmap[s]?.orderSummary) && p.lmap[s].orderSummary.length).sort((a, b) => (Number(a.replace(/\D/g, "")) || 0) - (Number(b.replace(/\D/g, "")) || 0));
  perPart[p.token] = sids.length; let curRecon = startCity;
  for (const sid of sids) {
    const chosen = p.lmap[sid].orderSummary.map(String); const g = p.rich[sid];
    const city = g?.current_city || curRecon; const menu = menuOf(sid);
    const cs = score(chosen, city); const orc = oracleOf(sid, city); const oIds = orc ? orc.ids : []; const oScore = orc ? orc.s.score : 0;
    const regret = oScore > 0 ? Math.max(0, (oScore - cs.score) / oScore) : 0;
    const rtOf = (oracleIds) => { const ids = menu; const byS = {}; for (const id of ids) (byS[ordersById[id].store] ??= []).push(id); const mg = Math.max(1, ...Object.values(byS).map((x) => x.length)); return mg <= 1 ? "single" : (oracleIds.length >= 2 ? "bundle_correct" : "over_bundle"); };
    const row = { participant_token: p.token, round: Number(sid.replace(/\D/g, "")) || "", scenario_id: sid, current_city: city, stored_current_city: g?.current_city || "" };
    menu.slice(0, 4).forEach((id, i) => { const o = ordersById[id]; row[`order${i + 1}_id`] = id; row[`order${i + 1}_store`] = o.store; row[`order${i + 1}_city`] = o.city; row[`order${i + 1}_earnings`] = o.earnings; row[`order${i + 1}_pick`] = +pickOf(o).toFixed(3); row[`order${i + 1}_local`] = o.localTravelTime; row[`order${i + 1}_cross`] = +reconCross(o.city, city).toFixed(3); });
    row.chosen_bundle = chosen.join("+"); row.chosen_score_deployed = +cs.score.toFixed(6);
    row.oracle_bundle_deployed = oIds.join("+"); row.oracle_score_deployed = +oScore.toFixed(6);
    row.percent_regret_deployed = +regret.toFixed(6); row.oracle_size_deployed = oIds.length;
    row.round_type = rtOf(norm(optById[sid]?.best_bundle_ids).split("+").filter(Boolean)); row.round_type_deployed = rtOf(oIds);
    row.stored_oracle_deployed = g?.oracle || ""; row.stored_regret_deployed = (g && Number.isFinite(g.regret)) ? +g.regret.toFixed(6) : "";
    row.oracle_path_sensitive = norm(oIds) !== norm(optById[sid]?.best_bundle_ids) ? 1 : 0;
    decRows.push(row);
    for (const b of feasible(sid)) { const bids = b.map(String); const s = score(bids, city); const os = bids.map((id) => ordersById[id]);
      const rp = os.reduce((a, o) => a + pickOf(o), 0), rl = os.reduce((a, o) => a + (Number(o.localTravelTime) || 0), 0), rx = reconCross(os[0].city, city);
      menuRows.push({ participant_token: p.token, round: Number(sid.replace(/\D/g, "")) || "", scenario_id: sid, bundle_ids: bids.join("+"), bundle_size: bids.length, payout: os.reduce((a, o) => a + (Number(o.earnings) || 0), 0), picking_time: +rp.toFixed(3), local_travel: +rl.toFixed(3), cross_city_travel: +rx.toFixed(3), overlap_savings: +Math.max(0, rp + rl + rx - s.time).toFixed(3), total_time: +s.time.toFixed(3), score: +s.score.toFixed(6), is_oracle: norm(bids) === norm(oIds) ? 1 : 0, is_chosen: norm(bids) === norm(chosen) ? 1 : 0 }); }
    if (cityOf(chosen[0])) curRecon = cityOf(chosen[0]);
  }
}
const writeCsv = (rows, path) => { const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]; writeFileSync(path, [cols.join(",")].concat(rows.map((r) => cols.map((c) => { const v = r[c] ?? ""; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","))).join("\n") + "\n"); };
writeCsv(decRows, `${DIR}/pilot_decisions_deployed.csv`);
writeCsv(menuRows, `${DIR}/frozen_bundle_menu_data.csv`);
writeCsv(pairRows, `${DIR}/reconstructed_cities_matrix.csv`);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const regs = decRows.map((r) => r.percent_regret_deployed); const opt = decRows.filter((r) => r.percent_regret_deployed === 0).length;
const oSize = decRows.reduce((a, r) => { a[r.oracle_size_deployed] = (a[r.oracle_size_deployed] || 0) + 1; return a; }, {});
console.log(`\nwrote pilot_decisions_deployed.csv (${decRows.length}), frozen_bundle_menu_data.csv (${menuRows.length}), reconstructed_cities_matrix.csv (${pairRows.length})`);
console.log("=== HEADLINE under the frozen artifact ===");
console.log(`  optimal-choice rate: ${(100 * opt / decRows.length).toFixed(2)}%`);
console.log(`  percent_regret_deployed: mean ${mean(regs).toFixed(4)}, median ${med(regs).toFixed(4)}`);
console.log(`  bundle rate (chosen>=2): ${(100 * decRows.filter((r) => (r.chosen_bundle || "").split("+").length >= 2).length / decRows.length).toFixed(2)}%`);
console.log(`  oracle_size_deployed: ${JSON.stringify(oSize)}`);
console.log(`  participants ${participants}, rows ${decRows.length}, mean rounds ${mean(Object.values(perPart)).toFixed(1)}`);
process.exit(0);
