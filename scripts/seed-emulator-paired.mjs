/**
 * Seed BOTH paired-calibration datasets into the LOCAL Firestore emulator (Admin SDK; never reaches
 * production). Part 1 (paired_pilot_unaided_v1) is the 27 frozen-data menus with the pilot-era
 * cities/grid EMBEDDED and an UNAIDED protocol; part 2 (paired_enriched35_aided_v1) is the CHI 35-round
 * set with the MARGINAL (directed-teaching) protocol. centralConfig boots part 1; the in-game sequencer
 * (advancePairedPhase) auto-advances to part 2 under the same token.
 *
 *   firebase emulators:start --only firestore,auth --config firebase.emulator.json --project demo-bundlegame
 *   node scripts/seed-emulator-paired.mjs            # emulator
 *   node scripts/seed-emulator-paired.mjs --project=<id>
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildChiSeedPayload, buildSeededEntry } from "../src/lib/chiSeed.js";
import { CHI_CITY_TRAVEL, CHI_STARTING_CITY, CHI_AB_STORES, CHI_C_STORES, CHI_STORE_LAYOUTS } from "../src/lib/chiScenarioDesign.js";
import { buildChiStudyProtocol } from "../src/lib/researchStudy.js";
import { buildPairedPilotDataset } from "./build-paired-pilot-dataset.mjs";
import { PAIRED_PLAN } from "../src/lib/pairedCalibration.js";

const arg = (n, d) => { const h = process.argv.slice(2).find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const HOST = arg("host", "127.0.0.1"), PORT = Number(arg("port", 8080));
const PROJECT_ID = arg("project", "demo-bundlegame");
process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORT}`;
if (!/^(127\.0\.0\.1|localhost|::1)$/.test(HOST)) { console.error(`REFUSED: non-local host '${HOST}'.`); process.exit(2); }

const PILOT_SET = PAIRED_PLAN[0].scenario_set;   // paired_pilot_unaided_v1
const AIDED_SET = PAIRED_PLAN[1].scenario_set;   // paired_enriched35_aided_v1

// part 1 protocol: UNAIDED (disabled), so assignStudyArm returns nothing and no feedback gating applies;
// the pilot phase is byte-identical scoring (embedded pilot-era inputs) with no recommendation.
const pilotProtocol = {
  protocol_id: "paired_pilot_unaided_v1", protocol_version: "paired_pilot_unaided_v1",
  title: "Paired calibration - pilot (unaided)", enabled: false, expected_total_rounds: 27,
  policy_arms: [], phase_plan: [], survey_questions: [],
};
// part 2 protocol: the CHI marginal study, but every arm forced to marginal (directed teaching for all).
const aidedProtocol = (() => {
  const p = buildChiStudyProtocol();
  p.policy_arms = p.policy_arms.filter((a) => a.id === "marginal");
  return p;
})();

function entranceOf(grid) { for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) if (String(grid[r][c]).toLowerCase() === "entrance") return [r, c]; return [0, 0]; }
function chiStores() {
  const FALLBACK = [["Entrance", "Apple", "Banana"]];
  return [...CHI_AB_STORES, ...CHI_C_STORES].map((s, i) => { const g = CHI_STORE_LAYOUTS[s.store]?.grid || FALLBACK;
    return { store: s.store, city: s.city, id: `store_${i}`, Entrance: entranceOf(g), cellDistance: CHI_STORE_LAYOUTS[s.store]?.cellDistance ?? 700, locations: g.map((row) => ({ cells: row })) }; });
}

async function main() {
  // ---- build both dataset entries ----
  const pilotDS = buildPairedPilotDataset();
  const pilotEntry = {
    scenarios: pilotDS.scenarios, orders: pilotDS.orders, optimal: pilotDS.optimal,
    cities: pilotDS.cities, stores: pilotDS.stores, // EMBEDDED pilot-era inputs (loadGame prefers these)
    metadata: { datasetName: PILOT_SET, scenarioSetVersionId: PILOT_SET, skip_protocol_validation: true, researchStudy: pilotProtocol },
  };
  const aidedPayload = buildChiSeedPayload({ versionId: AIDED_SET });
  const aidedEntry = buildSeededEntry(aidedPayload);
  aidedEntry.metadata = { ...(aidedEntry.metadata || {}), scenarioSetVersionId: AIDED_SET, skip_protocol_validation: true, researchStudy: aidedProtocol };

  const centralConfig = {
    game: { timeLimit: 3000, thinkTime: 0, gridSize: 3, auth: true, ordersShown: 4, roundTimeLimit: 600, penaltyTimeout: 0, tips: false, waiting: false, refresh: false, expire: false },
    scenario_set: PILOT_SET, research_protocol: pilotProtocol,
  };

  const app = initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore(app);
  console.log(`paired seed -> emulator ${HOST}:${PORT}, project '${PROJECT_ID}'`);
  await db.doc("MasterData/datasets").set({ datasets: { [PILOT_SET]: pilotEntry, [AIDED_SET]: aidedEntry } }, { merge: true });
  await db.doc("MasterData/centralConfig").set(centralConfig, { merge: true });
  await db.doc("MasterData/store").set({ stores: chiStores() }, { merge: true });          // aided-phase grids; pilot uses embedded
  await db.doc("MasterData/cities").set({ startinglocation: CHI_STARTING_CITY, travelTimes: CHI_CITY_TRAVEL }, { merge: true });
  await db.doc("MasterData/emojis").set({ emojis: {} }, { merge: true });
  await db.doc(`ResearchProtocols/${aidedProtocol.protocol_id}`).set({ ...aidedProtocol, dataset_root: AIDED_SET, scenario_set_version_id: AIDED_SET }, { merge: true });

  // read-back
  const back = (await db.doc("MasterData/datasets").get()).data()?.datasets || {};
  const cc = (await db.doc("MasterData/centralConfig").get()).data() || {};
  const okP = Array.isArray(back[PILOT_SET]?.scenarios) && back[PILOT_SET].scenarios.length === 27;
  const okA = Array.isArray(back[AIDED_SET]?.scenarios) && back[AIDED_SET].scenarios.length === 35;
  console.log(`  ${PILOT_SET}: ${back[PILOT_SET]?.scenarios?.length ?? 0} scenarios, ${back[PILOT_SET]?.orders?.length ?? 0} orders, embedded cities=${!!back[PILOT_SET]?.cities} grid=${back[PILOT_SET]?.stores?.length ?? 0} -> ${okP ? "OK" : "FAIL"}`);
  console.log(`  ${AIDED_SET}: ${back[AIDED_SET]?.scenarios?.length ?? 0} scenarios, arms=[${(aidedProtocol.policy_arms || []).map((a) => a.id).join(",")}] -> ${okA ? "OK" : "FAIL"}`);
  console.log(`  centralConfig.scenario_set=${cc.scenario_set}, auth=${cc.game?.auth} -> ${cc.scenario_set === PILOT_SET ? "OK" : "FAIL"}`);
  console.log(okP && okA && cc.scenario_set === PILOT_SET ? "\nDONE: a fresh authed participant boots pilot (27, unaided), then auto-advances to aided (35, marginal) under the same token." : "\nCHECK above");
  process.exit(okP && okA && cc.scenario_set === PILOT_SET ? 0 : 1);
}
main().catch((e) => { console.error("paired seed failed:", e); process.exit(1); });
