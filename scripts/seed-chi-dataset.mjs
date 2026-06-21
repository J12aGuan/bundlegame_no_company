/**
 * Seed the CHI dynamic-counterfactual dataset under a NAMED version (default
 * 'chi_dynamic_v1'). The live app loads menus from Firestore, but the trap-aware
 * generator buildChiScenarioSet is only used in tests/sandboxes; this bridges them.
 *
 * SAFE BY DEFAULT — a dry run that builds + validates the payload, proves the
 * save -> load round-trip, and writes a JSON artifact. It does NOT touch Firestore
 * and does NOT change the default scenario_set unless you explicitly opt in.
 *
 *   node scripts/seed-chi-dataset.mjs                 # dry run: validate + write artifact
 *   CHI_SEED_ALLOW_WRITE=1 node scripts/seed-chi-dataset.mjs --commit
 *                                                     # write the dataset to Firestore
 *
 * The --commit path writes ONLY the new dataset version (orders + scenarios) via
 * saveOrdersData + saveExperimentScenarios. It refuses to target 'experiment', never
 * edits central config, and never flips the default scenario_set or deploys. Point it
 * at the Firestore EMULATOR or a STAGING project — never run it against production with
 * live participants. (The web SDK reads the project from src/lib/firebaseConfig.js.)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChiSeedPayload, buildSeededEntry, rehydrateScenariosFromEntry } from "../src/lib/chiSeed.js";
import { validateChiScenarioSet } from "../src/lib/chiScenarioDesign.js";

const VERSION_ID = process.env.CHI_SEED_VERSION || "chi_dynamic_v1";
const commit = process.argv.includes("--commit");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function summarize(payload) {
  const byType = payload.scenarios.reduce((m, s) => {
    const k = s.is_payout_trap ? "trap" : (s.stress || s.block_kind || "?");
    m[k] = (m[k] || 0) + 1; return m;
  }, {});
  return byType;
}

async function main() {
  const payload = buildChiSeedPayload({});
  if (payload.versionId !== VERSION_ID) {
    console.warn(`note: generator version '${payload.versionId}' != requested '${VERSION_ID}'; seeding under '${VERSION_ID}'.`);
    payload.versionId = VERSION_ID;
  }

  // 1) Validate the in-memory set, then 2) validate the REHYDRATED set (post round-trip).
  const vIn = validateChiScenarioSet({ scenarios: payload.scenarios });
  const rehydrated = rehydrateScenariosFromEntry(buildSeededEntry(payload));
  const vOut = validateChiScenarioSet({ scenarios: rehydrated });

  console.log(`\nCHI seed — version '${VERSION_ID}'`);
  console.log(`  scenarios: ${payload.scenarios.length}  orders: ${payload.orders.length}  mix: ${JSON.stringify(summarize(payload))}`);
  console.log(`  validate (in-memory):  ${vIn.ok ? "OK" : "FAIL"}${vIn.ok ? "" : "\n    - " + vIn.errors.join("\n    - ")}`);
  console.log(`  validate (rehydrated): ${vOut.ok ? "OK" : "FAIL"}${vOut.ok ? "" : "\n    - " + vOut.errors.join("\n    - ")}`);
  if (!vIn.ok || !vOut.ok) { console.error("\nABORT: payload did not validate; not seeding."); process.exit(1); }

  // Always write the artifact (a JSON snapshot of orders + scenarios for inspection / a
  // manual masterdata import). To load it into a LOCAL emulator, use the Admin-SDK seeder
  // that bypasses rules and targets the emulator: `node scripts/seed-emulator.mjs`
  // (docs/EMULATOR_SMOKE.md). The --commit path below targets the project in .env.
  const outDir = path.join(ROOT, "build");
  mkdirSync(outDir, { recursive: true });
  const artifact = path.join(outDir, `${VERSION_ID}.seed.json`);
  writeFileSync(artifact, JSON.stringify({ versionId: VERSION_ID, orders: payload.orders, scenarios: payload.scenarios, metadata: payload.metadata }, null, 2));
  console.log(`  artifact written: ${path.relative(ROOT, artifact)} (orders + scenarios for the admin importer)`);

  if (!commit) {
    console.log("\nDRY RUN (default). To write to Firestore (emulator/staging only):");
    console.log("  CHI_SEED_ALLOW_WRITE=1 node scripts/seed-chi-dataset.mjs --commit");
    console.log("This does NOT change the default scenario_set. Point the app at it via central config separately.\n");
    return;
  }

  // ---- guarded commit ----
  if (process.env.CHI_SEED_ALLOW_WRITE !== "1") {
    console.error("\nREFUSED: --commit requires CHI_SEED_ALLOW_WRITE=1 (guard against accidental writes).");
    process.exit(2);
  }
  if (/^experiment$/i.test(VERSION_ID)) {
    console.error("\nREFUSED: will not seed under 'experiment' (would clobber the live default dataset).");
    process.exit(2);
  }
  console.log(`\nCommitting dataset '${VERSION_ID}' to the configured Firebase project (intended: emulator/staging)...`);
  const { saveOrdersData, saveExperimentScenarios } = await import("../src/lib/firebaseDB.js");
  await saveOrdersData(payload.orders, VERSION_ID);
  await saveExperimentScenarios(payload.scenarios, VERSION_ID);
  console.log(`  seeded orders + scenarios under '${VERSION_ID}'. Default scenario_set NOT changed; no deploy run.`);
  console.log("  Verify in the admin masterdata UI, then set central config scenario_set when ready.\n");
}

main().catch((e) => { console.error("seed failed:", e); process.exit(1); });
