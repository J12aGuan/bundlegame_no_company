/**
 * Seed the CHI dynamic-counterfactual dataset into the LOCAL Firestore EMULATOR (B: the
 * pilot smoke-test unblock). Unlike scripts/seed-chi-dataset.mjs (which imports the
 * browser-only firebaseConfig and so cannot run in plain Node), this seeder uses the
 * Firebase ADMIN SDK pointed at the emulator via FIRESTORE_EMULATOR_HOST. The admin SDK
 * (a) bypasses security rules — so it can write MasterData without an admin auth dance —
 * and (b) talks ONLY to the local emulator, so it can NEVER reach the bundling-63c10
 * production project.
 *
 * It reuses the PURE seed payload + entry builders from src/lib/chiSeed.js (the single
 * source of truth for the persisted shape) and writes the same MasterData/datasets doc the
 * app reads via getExperimentScenarios. Only the dataset doc path + root-id resolver are
 * replicated here (a small, stable contract verified by tests/js/chi-seed-roundtrip).
 *
 * Run (with `firebase emulators:start` already running — see docs/EMULATOR_SMOKE.md):
 *   node scripts/seed-emulator.mjs
 *   node scripts/seed-emulator.mjs --version=chi_dynamic_v1 --host=127.0.0.1 --port=8080
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildChiSeedPayload, buildSeededEntry, rehydrateScenariosFromEntry } from "../src/lib/chiSeed.js";
import { validateChiScenarioSet, CHI_CITY_TRAVEL, CHI_STARTING_CITY, CHI_AB_STORES, CHI_C_STORES } from "../src/lib/chiScenarioDesign.js";
import { buildChiStudyProtocol } from "../src/lib/researchStudy.js";

const FULL = process.argv.slice(2).includes("--full");

const arg = (name, dflt) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const HOST = arg("host", process.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1");
const PORT = Number(arg("port", process.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT || 8080));
const VERSION = arg("version", process.env.CHI_SEED_VERSION || "chi_dynamic_v1");
const PROJECT_ID = arg("project", process.env.VITE_FIREBASE_PROJECT_ID || "demo-bundlegame");

// Same root-id resolution the app loader uses (firebaseDB.resolveDatasetRootFromId), so the
// seeded key matches what getExperimentScenarios(VERSION) will compute on read.
const resolveDatasetRoot = (id = "") => String(id || "").trim().replace(/\.json$/i, "")
  .replace(/(Scenarios|Orders|Optimal)(?=_|$)/ig, "")
  .replace(/(_scenarios|_orders|_optimal)$/i, "")
  .replace(/__+/g, "_").replace(/^_|_$/g, "").trim();

// SAFETY: route the Admin SDK to the LOCAL emulator before it initializes. Without this the
// admin SDK would try real Firestore; with it, every call is local. Refuse to run if the
// host does not look local (a guard against ever pointing this at prod).
process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORT}`;
if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0|::1)$/.test(HOST)) {
  console.error(`REFUSED: emulator host '${HOST}' is not local. This script only seeds a LOCAL emulator.`);
  process.exit(2);
}

// Minimal masterdata the production +page.svelte boots on (only seeded with --full). The
// CHI protocol is 35-round; the protocol is embedded three ways so whichever path the app
// resolves it from finds it: central config research_protocol, the dataset metadata
// (loadResearchRuntime fallback), and a ResearchProtocols collection entry.
function buildMasterData(root) {
  const protocol = buildChiStudyProtocol();
  // Force the MARGINAL pilot arm: restrict policy_arms to marginal only, so assignStudyArm
  // (stable-hash over the weighted arms) returns marginal for EVERY participant and the
  // counterfactual feedback renders in the ON blocks. This is the legitimate marginal-pilot
  // configuration ("pilot = marginal only"), not a test hack.
  const marginalArms = protocol.policy_arms.filter((a) => a.id === "marginal");
  protocol.policy_arms = marginalArms.length ? marginalArms : protocol.policy_arms;
  const protocolEntry = {
    ...protocol,
    dataset_root: root,
    scenario_set_version_id: root,
    updated_at: new Date().toISOString(),
  };
  const centralConfig = {
    // auth:true so needsAuth gates ON the participant persistence (saveRoundSummaryAction +
    // the CHI saves require needsAuth + a real id). The driver authenticates with
    // generateAuthToken(id), which authenticateUser validates (Auth/<token> doc).
    game: { timeLimit: 1200, thinkTime: 0, gridSize: 3, auth: true, ordersShown: 4, roundTimeLimit: 600, penaltyTimeout: 0, tips: false, waiting: false, refresh: false, expire: false },
    scenario_set: root,
    research_protocol: protocol,
  };
  // Each store needs a pickable aisle grid: an Entrance + the default item cells (orders with
  // empty items get {Apple:1, Banana:2} from home.svelte). Firestore can't nest arrays, so each
  // grid row is encoded {cells:[...]} (getStoresData.decodeStore reverses it). Small cellDistance
  // keeps the aisle-travel countdown fast for the headless drive.
  const STORE_GRID = [{ cells: ["Entrance", "Apple", "Banana"] }];
  const stores = [...CHI_AB_STORES, ...CHI_C_STORES].map((s, i) => ({
    store: s.store, city: s.city, id: `store_${i}`,
    Entrance: [0, 0], cellDistance: 30, locations: STORE_GRID,
  }));
  const cities = { startinglocation: CHI_STARTING_CITY, travelTimes: CHI_CITY_TRAVEL };
  return { protocol, protocolEntry, centralConfig, stores, cities };
}

async function main() {
  const payload = buildChiSeedPayload({});
  payload.versionId = VERSION;

  // Validate in-memory AND after a rehydrate round-trip (same as the dry-run seeder).
  const entry = buildSeededEntry(payload);
  const md = FULL ? buildMasterData(resolveDatasetRoot(VERSION)) : null;
  if (md) entry.metadata = { ...(entry.metadata || {}), researchStudy: md.protocol }; // loadResearchRuntime fallback
  const vIn = validateChiScenarioSet({ scenarios: payload.scenarios });
  const vOut = validateChiScenarioSet({ scenarios: rehydrateScenariosFromEntry(entry) });
  console.log(`\nCHI emulator seed — version '${VERSION}'  (Firestore emulator ${HOST}:${PORT}, project '${PROJECT_ID}')`);
  console.log(`  scenarios: ${payload.scenarios.length}  orders: ${payload.orders.length}`);
  console.log(`  validate (in-memory):  ${vIn.ok ? "OK" : "FAIL\n    - " + vIn.errors.join("\n    - ")}`);
  console.log(`  validate (rehydrated): ${vOut.ok ? "OK" : "FAIL\n    - " + vOut.errors.join("\n    - ")}`);
  if (!vIn.ok || !vOut.ok) { console.error("\nABORT: payload did not validate; not seeding."); process.exit(1); }

  const app = initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore(app);
  const root = resolveDatasetRoot(VERSION);
  try {
    await db.doc("MasterData/datasets").set({ datasets: { [root]: entry } }, { merge: true });
    // read-back so a silent failure (e.g. emulator not running) surfaces loudly.
    const snap = await db.doc("MasterData/datasets").get();
    const back = snap.exists ? (snap.data()?.datasets?.[root] || null) : null;
    if (!back || !Array.isArray(back.scenarios) || back.scenarios.length !== payload.scenarios.length) {
      throw new Error("read-back mismatch (is the emulator running and the port correct?)");
    }
    console.log(`  WROTE MasterData/datasets -> datasets.${root} (${back.scenarios.length} scenarios, ${back.orders?.length ?? 0} orders).`);
    if (md) {
      await db.doc("MasterData/centralConfig").set(md.centralConfig, { merge: true });
      await db.doc("MasterData/store").set({ stores: md.stores }, { merge: true });
      await db.doc("MasterData/cities").set(md.cities, { merge: true });
      await db.doc("MasterData/emojis").set({ emojis: {} }, { merge: true });
      await db.doc(`ResearchProtocols/${md.protocol.protocol_id}`).set(md.protocolEntry, { merge: true });
      console.log(`  WROTE (--full) centralConfig(scenario_set=${root}, auth=true), ${md.stores.length} stores, cities(${Object.keys(md.cities.travelTimes).length}), emojis, ResearchProtocols/${md.protocol.protocol_id}`);
      console.log(`  protocol: ${md.protocol.protocol_version} / ${md.protocol.expected_total_rounds} rounds, enabled=${md.protocol.enabled}, policy_arms=[${(md.protocol.policy_arms || []).map((a) => a.id).join(",")}]`);
    }
    console.log("\nNext: run the dev app with VITE_USE_FIREBASE_EMULATOR=true and play the real game.");
    if (!md) console.log("      (use --full to also seed centralConfig/protocol/stores/cities so the production game boots.)\n");
  } catch (err) {
    console.error("\nSEED FAILED:", err?.message || err);
    console.error("Start the emulator first:  firebase emulators:start   (see docs/EMULATOR_SMOKE.md)\n");
    process.exit(1);
  }
  process.exit(0);
}
main().catch((e) => { console.error("seed-emulator failed:", e); process.exit(1); });
