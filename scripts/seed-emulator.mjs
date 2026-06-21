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
import { validateChiScenarioSet } from "../src/lib/chiScenarioDesign.js";

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

async function main() {
  const payload = buildChiSeedPayload({});
  payload.versionId = VERSION;

  // Validate in-memory AND after a rehydrate round-trip (same as the dry-run seeder).
  const entry = buildSeededEntry(payload);
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
    console.log("\nNext: in the running dev app (VITE_USE_FIREBASE_EMULATOR=true), set central config scenario_set");
    console.log(`      to '${VERSION}', then play the real game. The default scenario_set is NOT changed here.\n`);
  } catch (err) {
    console.error("\nSEED FAILED:", err?.message || err);
    console.error("Start the emulator first:  firebase emulators:start   (see docs/EMULATOR_SMOKE.md)\n");
    process.exit(1);
  }
  process.exit(0);
}
main().catch((e) => { console.error("seed-emulator failed:", e); process.exit(1); });
