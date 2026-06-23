import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiFoundationalStudyProtocol,
  getChiFoundationalStudyProtocol,
  validateChiFoundationalStudyProtocol,
  assignFoundationalArm,
  buildChiStudyProtocol,
  CHI_FOUNDATIONAL_ARM_TYPES,
  CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID,
} from "../../src/lib/researchStudy.js";
import { diagnoseTrigger, shouldShowSurvey, feedbackForDecision } from "../../src/lib/chiStudyRuntime.js";
import { feedbackForArm } from "../../src/lib/marginalFeedback.js";
import { buildChiSeedPayload } from "../../src/lib/chiSeed.js";

// A representative ON-block round + a sub-optimal chosen bundle (a one-step drop improves it).
const ON_ROUND = 16; // B1 ON
const chosen = { bundle_ids: ["o1", "o2"], earnings: 30, total_time_seconds: 24, score: 1.25 };
const legal = [
  chosen,
  { bundle_ids: ["o1"], earnings: 23, total_time_seconds: 10, score: 2.3 }, // a drop that strictly improves
  { bundle_ids: ["o2"], earnings: 10, total_time_seconds: 20, score: 0.5 },
];
// A fabricated diagnosis: if an arm reads it, the output would differ from the diagnosis-free output.
const FAKE_DX = { learning_target: "W1", dominant_weakness: "W1", strengths: { W1: 9, W2: 0, W3: 0 } };

test("foundational protocol keeps the DIAGNOSIS DORMANT (no survey / diagnose / rediagnose triggers)", () => {
  const proto = getChiFoundationalStudyProtocol();
  for (const r of [10, 15, 20, 25, 30, 35]) {
    assert.equal(diagnoseTrigger(proto, r), null, `round ${r} must not trigger a diagnosis`);
  }
  assert.equal(shouldShowSurvey(proto, 15), false, "no post-Phase-A survey (it feeds the diagnosis)");
  const phaseA = proto.phase_plan.find((p) => p.id === "A");
  assert.ok(!phaseA.diagnose_after, "phase A diagnose_after must be absent/false");
  assert.ok(!phaseA.survey_after, "phase A survey_after must be absent/false");
  const offBlocks = proto.phase_plan.find((p) => p.id === "B").blocks.filter((b) => b.kind === "off");
  assert.ok(offBlocks.length > 0 && offBlocks.every((b) => !b.rediagnose_after), "no OFF block re-diagnoses");
});

test("foundational arms are exactly control/counterfactual/aggregate and NONE is dynamic", () => {
  const proto = getChiFoundationalStudyProtocol();
  const ids = proto.policy_arms.map((a) => a.id).sort();
  assert.deepEqual(ids, [...CHI_FOUNDATIONAL_ARM_TYPES].sort());
  assert.ok(proto.policy_arms.every((a) => a.dynamic === false), "no arm re-targets (diagnosis dormant)");
  assert.equal(proto.scenario_set_version_id, CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID);
});

test("oracle arm is included ONLY behind the includeOracle flag", () => {
  const without = buildChiFoundationalStudyProtocol().policy_arms.map((a) => a.id);
  const withOracle = buildChiFoundationalStudyProtocol({ includeOracle: true }).policy_arms.map((a) => a.id);
  assert.ok(!without.includes("oracle"), "oracle is excluded by default");
  assert.ok(withOracle.includes("oracle"), "oracle is added behind the flag");
});

test("validateChiFoundationalStudyProtocol passes, and REJECTS a re-introduced diagnosis trigger or dynamic arm", () => {
  assert.ok(validateChiFoundationalStudyProtocol().ok);
  // Re-introduce a diagnosis trigger -> must fail.
  const withDiagnose = buildChiFoundationalStudyProtocol();
  withDiagnose.phase_plan.find((p) => p.id === "A").diagnose_after = true;
  assert.ok(!validateChiFoundationalStudyProtocol(withDiagnose).ok, "a diagnose_after must be rejected");
  // A dynamic arm -> must fail.
  const withDynamic = buildChiFoundationalStudyProtocol();
  withDynamic.policy_arms.find((a) => a.id === "counterfactual").dynamic = true;
  assert.ok(!validateChiFoundationalStudyProtocol(withDynamic).ok, "a dynamic arm must be rejected");
});

test("DIAGNOSIS-INDEPENDENCE: foundational arms produce IDENTICAL feedback with or without a diagnosis", () => {
  for (const arm of CHI_FOUNDATIONAL_ARM_TYPES) {
    const withoutDx = feedbackForArm(arm, { chosenBundle: chosen, legalBundles: legal, labelFor: (id) => id });
    const withDx = feedbackForArm(arm, { chosenBundle: chosen, legalBundles: legal, labelFor: (id) => id, diagnosis: FAKE_DX });
    assert.deepEqual(withDx, withoutDx, `arm "${arm}" must ignore the diagnosis (output must not change)`);
  }
});

test("the counterfactual arm renders the best one-step move with signed $ + time deltas", () => {
  const fb = feedbackForArm("counterfactual", { chosenBundle: chosen, legalBundles: legal, labelFor: (id) => id });
  assert.match(fb.text, /\$\d/, "shows a $ rate");
  assert.equal(fb.violation_label, "over_inclusion", "a drop -> over-inclusion (W1)");
  assert.ok(fb.best_improving_move, "carries the structured move");
  assert.equal(typeof fb.best_improving_move.earnings_delta, "number");
  assert.equal(typeof fb.best_improving_move.time_delta_seconds, "number");
});

test("the aggregate arm shows ONLY the scalar rate (no move, no component)", () => {
  const fb = feedbackForArm("aggregate", { chosenBundle: chosen, legalBundles: legal });
  assert.match(fb.text, /^Your rate: \$[\d.]+\/min\.$/);
  assert.equal(fb.best_improving_move, null);
  assert.equal(fb.violation_label, "none");
});

test("the control arm shows nothing", () => {
  const fb = feedbackForArm("control", { chosenBundle: chosen, legalBundles: legal });
  assert.equal(fb.text, "");
  assert.equal(fb.best_improving_move, null);
});

test("feedbackForDecision (the runtime gate) fires foundational feedback only in ON blocks", () => {
  const proto = getChiFoundationalStudyProtocol();
  // ON block (16) renders the counterfactual; Phase A (5) and OFF block (21) stay unaided.
  const on = feedbackForDecision({ protocol: proto, round: ON_ROUND, arm: "counterfactual", chosenBundle: chosen, legalBundles: legal, labelFor: (id) => id });
  assert.ok(on.text.length > 0, "ON block renders feedback");
  for (const r of [5, 21, 35]) {
    const off = feedbackForDecision({ protocol: proto, round: r, arm: "counterfactual", chosenBundle: chosen, legalBundles: legal, labelFor: (id) => id });
    assert.equal(off.text, "", `round ${r} (unaided) must render no feedback`);
  }
});

test("foundational-arm assignment is randomized across participants (all arms used)", () => {
  const proto = buildChiFoundationalStudyProtocol();
  const seen = new Set();
  for (let i = 0; i < 500; i += 1) seen.add(assignFoundationalArm(`p_${i}_${i * 7}`, proto)?.id);
  for (const arm of CHI_FOUNDATIONAL_ARM_TYPES) assert.ok(seen.has(arm), `arm "${arm}" should be assigned to someone`);
});

test("seed payload under chi_foundational_v1 is separable from chi_dynamic_v1 and carries the same redesigned menus", () => {
  const dyn = buildChiSeedPayload({});
  const found = buildChiSeedPayload({ versionId: CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID });
  assert.equal(found.versionId, CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID);
  assert.equal(found.metadata.scenarioSetVersionId, CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID, "the field the app reads to tag records");
  assert.notEqual(found.metadata.scenarioSetVersionId, dyn.metadata.scenarioSetVersionId, "separable from chi_dynamic_v1");
  assert.equal(found.scenarios.length, 35);
  // The transfer block (B4) carries at least one CLEAN single-axis LOCAL payout trap clearing
  // the 12% floor. Find it by its tags rather than a hardcoded round, since the transfer-first
  // schedule can shift which round holds the trap.
  const transferTraps = found.scenarios.filter(
    (s) => s.test_set === "transfer_shifted" && s.is_payout_trap === 1,
  );
  assert.ok(transferTraps.length >= 1, "transfer block must keep a payout trap");
  for (const s of transferTraps) {
    assert.equal(s.trap_axis, "local", "transfer trap slow-axis is local");
    assert.equal(s.trap_clean, 1, "transfer trap is clean single-axis");
    assert.ok(s.relative_gap >= 0.12, `r${s.round} clean local trap must clear the 12% floor`);
  }
});

test("the foundational protocol shares the dynamic protocol's 35-round A/B schedule", () => {
  const f = getChiFoundationalStudyProtocol();
  const d = buildChiStudyProtocol();
  assert.equal(f.expected_total_rounds, d.expected_total_rounds);
  assert.deepEqual(f.phase_plan.map((p) => p.id), d.phase_plan.map((p) => p.id));
});
