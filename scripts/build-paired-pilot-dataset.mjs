// Build the SEEDABLE pilot dataset for the paired calibration study: the 27 frozen-data menus
// (scenario_set = paired_pilot_unaided_v1), with the pilot-era cities + store grid EMBEDDED in the
// bundle so the served scoring is isolated from the (drifted) global config. Sources are all committed:
//   _raw_pull/scenario_bundle.json (mainGame orders+items, scenarios, optimal/best_bundle_ids)
//   frozen_inputs/pilot_{stores,cities}.json (exact pilot-era inputs; Sprouts Farmers Market -> Sprouts)
//   pilot_decisions_deployed.csv (defines WHICH scenarios are the frozen-data rounds, and the target scores)
//
// Run directly to build + self-validate (Gate A: re-score every frozen decision through the deployed
// scorer and confirm it reproduces the frozen scores within 1e-6 with the oracle matching):
//   node scripts/build-paired-pilot-dataset.mjs            # validate only
//   node scripts/build-paired-pilot-dataset.mjs --out FILE # validate + write the seedable bundle JSON
import { readFileSync, writeFileSync } from "fs";
import { scoreBundle } from "../src/lib/analysis/engine.js";
import { PAIRED_PLAN } from "../src/lib/pairedCalibration.js";

const DIR = "publishing/export_for_analysis";
const SCEN_SET = PAIRED_PLAN.find((p) => p.part === "pilot_unaided").scenario_set;

export function buildPairedPilotDataset() {
  const src = JSON.parse(readFileSync(`${DIR}/_raw_pull/scenario_bundle.json`, "utf8"));
  // the frozen-data rounds: the distinct scenarios that appear in the frozen pilot dataset
  const decLines = readFileSync(`${DIR}/pilot_decisions_deployed.csv`, "utf8").trim().split(/\r?\n/);
  const dH = decLines[0].split(",");
  const sidCol = dH.indexOf("scenario_id");
  const frozenScenarioIds = new Set(decLines.slice(1).map((l) => l.split(",")[sidCol]));

  const scenarios = (src.scenarios || []).filter((s) => frozenScenarioIds.has(String(s.scenario_id)));
  const keepOrderIds = new Set(scenarios.flatMap((s) => s.order_ids || []));
  const orders = (src.orders || []).filter((o) => keepOrderIds.has(String(o.id)));
  const optimal = (src.optimal || []).filter((o) => frozenScenarioIds.has(String(o.scenario_id)));

  // pilot-era inputs, embedded (Sprouts Farmers Market -> Sprouts so the STORE_NAME_ALIASES redirect resolves)
  const gridRaw = JSON.parse(readFileSync(`${DIR}/frozen_inputs/pilot_stores.json`, "utf8"));
  const stores = (Array.isArray(gridRaw) ? gridRaw : gridRaw.stores || [])
    .map((s) => (String(s.store) === "Sprouts Farmers Market" ? { ...s, store: "Sprouts" } : s));
  const citiesRaw = JSON.parse(readFileSync(`${DIR}/frozen_inputs/pilot_cities.json`, "utf8"));
  const cities = { travelTimes: citiesRaw.travelTimes || {}, startinglocation: String(citiesRaw.startinglocation || "Berkeley"), distances: {} };

  return {
    metadata: { scenario_set: SCEN_SET, source: "frozen pilot (mainGame) rounds + pilot-era inputs", rounds: scenarios.length },
    scenarios, orders, optimal,
    cities, stores, // EMBEDDED scoring inputs (loadGame prefers these over the global config)
  };
}

// ---- Gate A self-validation on the BUILT bundle ----
function validate(ds) {
  const ordersById = Object.fromEntries(ds.orders.map((o) => [String(o.id), o]));
  const oracleBySid = Object.fromEntries(ds.optimal.map((o) => [String(o.scenario_id), (o.best_bundle_ids || []).map(String)]));
  const storeDataset = { stores: ds.stores };
  const citiesDataset = ds.cities;
  const norm = (a) => (a || []).map(String).slice().sort().join("+");
  const sc = (ids, city) => scoreBundle({ bundleIds: ids.map(String), ordersById, currentCity: city, citiesDataset, storeDataset }).score || 0;

  const lines = readFileSync(`${DIR}/pilot_decisions_deployed.csv`, "utf8").trim().split(/\r?\n/);
  const H = lines[0].split(","); const c = (n) => H.indexOf(n);
  let n = 0, ok = 0, okReg = 0, okOracle = 0, maxD = 0;
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i].split(",");
    const sid = r[c("scenario_id")], city = r[c("current_city")];
    const chosen = (r[c("chosen_bundle")] || "").split("+").filter(Boolean);
    const oracleIds = oracleBySid[sid] || [];
    if (!chosen.length || chosen.some((id) => !ordersById[id]) || !oracleIds.length) continue;
    n++;
    const csc = sc(chosen, city), osc = sc(oracleIds, city);
    const reg = osc > 0 ? Math.max(0, (osc - csc) / osc) : 0;
    maxD = Math.max(maxD, Math.abs(csc - parseFloat(r[c("chosen_score_deployed")])));
    if (Math.abs(csc - parseFloat(r[c("chosen_score_deployed")])) < 1e-6) ok++;
    if (Math.abs(reg - parseFloat(r[c("percent_regret_deployed")])) < 1e-6) okReg++;
    if (norm(oracleIds) === norm((r[c("oracle_bundle_deployed")] || "").split("+").filter(Boolean))) okOracle++;
  }
  return { n, ok, okReg, okOracle, maxD, pass: ok === n && okReg === n && okOracle === n };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-paired-pilot-dataset.mjs")) {
  const ds = buildPairedPilotDataset();
  console.log(`built ${SCEN_SET}: ${ds.scenarios.length} scenarios, ${ds.orders.length} orders, ${ds.optimal.length} optimal, ${ds.stores.length} stores (embedded cities+grid)`);
  const v = validate(ds);
  console.log(`Gate A on built bundle: chosen ${v.ok}/${v.n}, regret ${v.okReg}/${v.n}, oracle ${v.okOracle}/${v.n}  max|diff| ${v.maxD.toExponential(2)}  -> ${v.pass ? "PASS" : "FAIL"}`);
  const outIdx = process.argv.indexOf("--out");
  if (outIdx > 0 && process.argv[outIdx + 1]) { writeFileSync(process.argv[outIdx + 1], JSON.stringify(ds)); console.log(`wrote ${process.argv[outIdx + 1]}`); }
  process.exit(v.pass ? 0 : 1);
}
