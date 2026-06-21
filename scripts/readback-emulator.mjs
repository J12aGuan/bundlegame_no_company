// Read back the EMULATED Firestore for a participant: phase_a_survey, diagnosis_history,
// and the per-decision Action logs. Usage: node scripts/readback-emulator.mjs <id> [projectId]
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const ID = process.argv[2] || "p_pickneglect";
const PROJECT = process.argv[3] || "bundling-63c10";
const VER = "chi_dynamic_v1";
const db = getFirestore(initializeApp({ projectId: PROJECT }));

const summary = await db.doc(`Users/${ID}/Summary/summary`).get();
const rs = summary.exists ? (summary.data()?.summaryByScenarioSetVersionId?.[VER]?.researchStudy || null) : null;
console.log(`\n===== ${ID} =====`);
console.log("Summary doc exists:", summary.exists, "| arm:", rs?.assigned_arm, "| protocol:", rs?.protocol_id);
console.log("phase_a_survey:", rs?.phase_a_survey ? JSON.stringify(rs.phase_a_survey.responses) : "(none)");
const dh = Array.isArray(rs?.diagnosis_history) ? rs.diagnosis_history : [];
console.log(`diagnosis_history: ${dh.length} entries`);
for (const d of dh) {
  console.log(`  r${d.round} [${d.trigger || "?"}]: dominant=${d.dominant_weakness} target=${d.learning_target} abstained=${d.abstained}` +
    ` | strengths W1/W2/W3=${[d.strengths?.W1, d.strengths?.W2, d.strengths?.W3].map((x) => (x == null ? "?" : Number(x).toFixed(2))).join("/")}` +
    ` | spanning_used=${d.spanning_used} n=${d.n_rounds}`);
}

// per-decision Action logs
const actions = await db.collection(`Users/${ID}/Actions`).get();
console.log(`\nActions: ${actions.size} round docs`);
const rows = actions.docs.map((d) => d.data()).sort((a, b) => (a.round_index || 0) - (b.round_index || 0));
const KEYS = ["round_index", "scenario_id", "phase", "policy_arm", "feedback_enabled", "is_optimal", "deployed_score", "violation_label", "best_improving_move", "feedback_text", "chosen_bundle_ids", "chosen_order_ids"];
if (rows[0]) console.log("  sample keys:", Object.keys(rows[0]).join(","));
for (const r of rows.slice(0, 3).concat(rows.slice(15, 18)).concat(rows.slice(-2))) {
  if (!r) continue;
  const o = {};
  for (const k of KEYS) if (r[k] !== undefined) o[k] = typeof r[k] === "object" ? JSON.stringify(r[k]).slice(0, 40) : r[k];
  console.log(`  r${r.round_index}:`, JSON.stringify(o).slice(0, 220));
}
process.exit(0);
