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
import { validateChiScenarioSet, CHI_CITY_TRAVEL, CHI_STARTING_CITY, CHI_AB_STORES, CHI_C_STORES, CHI_STORE_LAYOUTS } from "../src/lib/chiScenarioDesign.js";
import { buildChiStudyProtocol, buildChiFoundationalStudyProtocol } from "../src/lib/researchStudy.js";

const FULL = process.argv.slice(2).includes("--full");
// Foundational mode: seed the redesigned set under chi_foundational_v1 with the NON-personalized
// foundational protocol (arms control/counterfactual/aggregate, diagnosis dormant). Default mode
// remains the dynamic marginal pilot under chi_dynamic_v1.
const FOUNDATIONAL = process.argv.slice(2).includes("--foundational");
// Main study (--main): the FULL four-arm dynamic study (control/aggregate/marginal/oracle), NOT the
// marginal-only pilot. This is the June 30 (Experiment 2) configuration: enriched 4-order menus +
// the dynamic protocol + the sign-survival gate, all four arms at equal weight.
const MAIN = process.argv.slice(2).includes("--main");

const arg = (name, dflt) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const HOST = arg("host", process.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1");
const PORT = Number(arg("port", process.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT || 8080));
const VERSION = arg("version", process.env.CHI_SEED_VERSION || (FOUNDATIONAL ? "chi_foundational_v1" : "chi_dynamic_v1"));
const PROJECT_ID = arg("project", process.env.VITE_FIREBASE_PROJECT_ID || "demo-bundlegame");

// Same root-id resolution the app loader uses (firebaseDB.resolveDatasetRootFromId), so the
// seeded key matches what getExperimentScenarios(VERSION) will compute on read.
const resolveDatasetRoot = (id = "") => String(id || "").trim().replace(/\.json$/i, "")
  .replace(/(Scenarios|Orders|Optimal)(?=_|$)/ig, "")
  .replace(/(_scenarios|_orders|_optimal)$/i, "")
  .replace(/__+/g, "_").replace(/^_|_$/g, "").trim();

// Target selection. DEFAULT is the LOCAL emulator: route the Admin SDK to it before init, and
// refuse any non-local host. --live targets the REAL project and is strongly guarded so it
// cannot run by accident (see docs/DEPLOY.md): it requires CHI_SEED_LIVE=1, a non-demo
// --project, and ambient admin credentials (gcloud application-default login, or
// GOOGLE_APPLICATION_CREDENTIALS). In --live mode FIRESTORE_EMULATOR_HOST is left unset so the
// admin SDK writes to the real project.
const LIVE = process.argv.slice(2).includes("--live");
if (LIVE) {
  if (process.env.CHI_SEED_LIVE !== "1") {
    console.error("REFUSED: --live requires CHI_SEED_LIVE=1 (guard against accidental live seeding).");
    process.exit(2);
  }
  if (!PROJECT_ID || /^demo-/.test(PROJECT_ID)) {
    console.error(`REFUSED: --live needs a real --project=<id> (got '${PROJECT_ID}').`);
    process.exit(2);
  }
  delete process.env.FIRESTORE_EMULATOR_HOST; // write to the REAL project, not an emulator
} else {
  process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PORT}`;
  if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0|::1)$/.test(HOST)) {
    console.error(`REFUSED: emulator host '${HOST}' is not local. Use --live to seed a real project.`);
    process.exit(2);
  }
}

// Minimal masterdata the production +page.svelte boots on (only seeded with --full). The
// CHI protocol is 35-round; the protocol is embedded three ways so whichever path the app
// resolves it from finds it: central config research_protocol, the dataset metadata
// (loadResearchRuntime fallback), and a ResearchProtocols collection entry.
function buildMasterData(root) {
  let protocol;
  if (FOUNDATIONAL) {
    // Foundational study: the non-personalized protocol (diagnosis dormant). Keep ALL arms so
    // assignStudyArm randomly assigns control / counterfactual / aggregate across participants.
    protocol = buildChiFoundationalStudyProtocol();
  } else {
    protocol = buildChiStudyProtocol();
    if (!MAIN) {
      // PILOT (default): force the MARGINAL pilot arm so assignStudyArm returns marginal for EVERY
      // participant and the counterfactual feedback renders in the ON blocks ("pilot = marginal only").
      const marginalArms = protocol.policy_arms.filter((a) => a.id === "marginal");
      protocol.policy_arms = marginalArms.length ? marginalArms : protocol.policy_arms;
    }
    // --main keeps all four arms (control/aggregate/marginal/oracle) at equal weight (June 30 study).
  }
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
    game: { timeLimit: 3000, thinkTime: 0, gridSize: 3, auth: true, ordersShown: 4, roundTimeLimit: 600, penaltyTimeout: 0, tips: false, waiting: false, refresh: false, expire: false },
    scenario_set: root,
    research_protocol: protocol,
  };
  // Each store carries its REAL aisle grid from CHI_STORE_LAYOUTS so the in-store picking UI
  // renders the actual 3x3 layout and every fruit an order lists is findable, and the runtime's
  // aisle-walk pick time matches the design's layout-derived pick (cellDistance in ms; pick =
  // walk*cellDistance/1000 + 3s/unique item). Firestore can't nest arrays, so each grid row is
  // encoded {cells:[...]} (getStoresData.decodeStore reverses it).
  const entranceOf = (grid) => {
    for (let r = 0; r < grid.length; r += 1) for (let c = 0; c < grid[r].length; c += 1) {
      if (String(grid[r][c]).toLowerCase() === "entrance") return [r, c];
    }
    return [0, 0];
  };
  const FALLBACK_GRID = [["Entrance", "Apple", "Banana"]];
  const stores = [...CHI_AB_STORES, ...CHI_C_STORES].map((s, i) => {
    const layout = CHI_STORE_LAYOUTS[s.store];
    const grid = layout?.grid || FALLBACK_GRID;
    return {
      store: s.store, city: s.city, id: `store_${i}`,
      Entrance: entranceOf(grid),
      cellDistance: layout?.cellDistance ?? 700,
      locations: grid.map((row) => ({ cells: row })),
    };
  });
  const cities = { startinglocation: CHI_STARTING_CITY, travelTimes: CHI_CITY_TRAVEL };
  return { protocol, protocolEntry, centralConfig, stores, cities };
}

async function main() {
  // versionId stamps the dataset metadata.scenarioSetVersionId so records are separable by id.
  const payload = buildChiSeedPayload({ versionId: VERSION });

  // Validate in-memory AND after a rehydrate round-trip (same as the dry-run seeder).
  const entry = buildSeededEntry(payload);
  const md = FULL ? buildMasterData(resolveDatasetRoot(VERSION)) : null;
  if (md) entry.metadata = { ...(entry.metadata || {}), researchStudy: md.protocol }; // loadResearchRuntime fallback
  const vIn = validateChiScenarioSet({ scenarios: payload.scenarios });
  const vOut = validateChiScenarioSet({ scenarios: rehydrateScenariosFromEntry(entry) });
  console.log(`\nCHI seed — version '${VERSION}'  (${LIVE ? `LIVE project '${PROJECT_ID}'` : `emulator ${HOST}:${PORT}, project '${PROJECT_ID}'`})`);
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
      // Self-verify the repoint + protocol link took, so this one command is confirmable on a
      // live project: the active studyProtocol resolves from this ResearchProtocols entry, and
      // arm assignment + phase recognition follow from its policy_arms + phase_plan.
      const cc = (await db.doc("MasterData/centralConfig").get()).data() || {};
      const rp = (await db.doc(`ResearchProtocols/${md.protocol.protocol_id}`).get()).data() || {};
      const armIds = (rp.policy_arms || []).map((a) => a.id).join(",");
      const phases = (rp.phase_plan || []).map((p) => p.id).join("");
      // Dormancy fingerprint for the foundational protocol: no survey/diagnose/rediagnose triggers.
      const phaseA = (rp.phase_plan || []).find((p) => p.id === "A") || {};
      const offBlocks = ((rp.phase_plan || []).find((p) => p.id === "B")?.blocks || []);
      const diagnosisDormant = !phaseA.diagnose_after && !phaseA.survey_after && offBlocks.every((b) => !b.rediagnose_after);
      const expectArm = FOUNDATIONAL ? "counterfactual" : "marginal";
      const ok = cc.scenario_set === root && rp.enabled === true && armIds.includes(expectArm) && rp.dataset_root === root
        && (FOUNDATIONAL ? diagnosisDormant : true);
      console.log(`  CONFIRM: centralConfig.scenario_set=${cc.scenario_set} | ResearchProtocols enabled=${rp.enabled}, dataset_root=${rp.dataset_root}, arms=[${armIds}], phases=${phases}${FOUNDATIONAL ? `, diagnosis_dormant=${diagnosisDormant}` : ""} -> ${ok ? "OK" : "CHECK THE ABOVE"}`);
      const armDesc = FOUNDATIONAL ? "randomly assigned a foundational arm (control / counterfactual / aggregate)" : "assigned the marginal arm";
      console.log(`\n  DONE: project '${PROJECT_ID}' is now set to '${root}'. A fresh authenticated participant will be ${armDesc} and boot into Round 1/35, Phase A (CHI trap menus)${FOUNDATIONAL ? " with the diagnosis DORMANT" : ""}. Other datasets in the project are untouched (merge-only).`);
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
