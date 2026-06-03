import test from "node:test";
import assert from "node:assert/strict";

import {
  SCAFFOLD_TYPES,
  buildScaffold,
  selectTargetAttribute,
  pickContrastBundle,
} from "../../src/lib/scaffolding.js";
import {
  buildChiStudyProtocol,
  getChiStudyProtocol,
  assignScaffoldArm,
  validateChiStudyProtocol,
  CHI_SCAFFOLD_TYPES,
  CHI_TREATED_SCAFFOLD_TYPES,
} from "../../src/lib/researchStudy.js";

// A fixed recommended bundle + a legal choice set with per-attribute values.
function fixtureRound() {
  const recommendedBundle = {
    order_ids: ["o1"],
    earnings: 20,
    effective_pick_time_seconds: 10,
    cross_city_travel_time_seconds: 0,
    local_travel_time_seconds: 5,
    total_time_seconds: 15,
  };
  const candidates = [
    { order_ids: ["o1"], legal: 1, earnings: 20, effective_pick_time_seconds: 10, cross_city_travel_time_seconds: 0, local_travel_time_seconds: 5, total_time_seconds: 15 },
    { order_ids: ["o1", "o2"], legal: 1, earnings: 30, effective_pick_time_seconds: 28, cross_city_travel_time_seconds: 0, local_travel_time_seconds: 9, total_time_seconds: 37 },
    { order_ids: ["o1", "o3"], legal: 1, earnings: 26, effective_pick_time_seconds: 14, cross_city_travel_time_seconds: 18, local_travel_time_seconds: 7, total_time_seconds: 39 },
  ];
  return { recommendedBundle, candidates };
}

test("recommended bundle is INVARIANT across generic/matched/mismatched", () => {
  const { recommendedBundle, candidates } = fixtureRound();
  const diagnosis = { dominant_weakness: "W1" };
  const arms = [SCAFFOLD_TYPES.GENERIC, SCAFFOLD_TYPES.MATCHED, SCAFFOLD_TYPES.MISMATCHED];
  const recs = arms.map((scaffoldType) =>
    buildScaffold({ scaffoldType, diagnosis, recommendedBundle, candidates }).recommended_bundle_ids.join("|"),
  );
  // All treated arms recommend exactly the same (fixed) bundle.
  assert.equal(new Set(recs).size, 1);
  assert.equal(recs[0], "o1");
});

test("matched targets the diagnosed attribute; mismatched does not", () => {
  const { recommendedBundle, candidates } = fixtureRound();
  for (const [weakness, attr] of [
    ["W1", "effective_pick_time_seconds"],
    ["W2", "cross_city_travel_time_seconds"],
    ["W3", "earnings"],
  ]) {
    const diagnosis = { dominant_weakness: weakness };
    const matched = buildScaffold({ scaffoldType: SCAFFOLD_TYPES.MATCHED, diagnosis, recommendedBundle, candidates });
    const mismatched = buildScaffold({ scaffoldType: SCAFFOLD_TYPES.MISMATCHED, diagnosis, recommendedBundle, candidates });
    assert.equal(matched.target_attribute, attr, `matched should target ${attr} for ${weakness}`);
    assert.notEqual(mismatched.target_attribute, attr, `mismatched must NOT target ${attr}`);
    assert.ok(mismatched.target_attribute, "mismatched must target some non-diagnosed attribute");
  }
});

test("matched explanation differs from generic but keeps the same bundle", () => {
  const { recommendedBundle, candidates } = fixtureRound();
  const diagnosis = { dominant_weakness: "W2" };
  const generic = buildScaffold({ scaffoldType: SCAFFOLD_TYPES.GENERIC, diagnosis, recommendedBundle, candidates });
  const matched = buildScaffold({ scaffoldType: SCAFFOLD_TYPES.MATCHED, diagnosis, recommendedBundle, candidates });
  assert.notEqual(generic.explanation_text, matched.explanation_text);
  assert.deepEqual(generic.recommended_bundle_ids, matched.recommended_bundle_ids);
  // W2 contrast should be the dispersed (cross-city) alternative.
  assert.ok(matched.explanation_text.toLowerCase().includes("cross-city"));
  assert.ok(matched.deltas.cross_city_travel_time_seconds > 0);
});

test("no_ai shows no recommendation", () => {
  const { recommendedBundle, candidates } = fixtureRound();
  const s = buildScaffold({ scaffoldType: SCAFFOLD_TYPES.NO_AI, diagnosis: { dominant_weakness: "W1" }, recommendedBundle, candidates });
  assert.equal(s.shows_recommendation, false);
  assert.deepEqual(s.recommended_bundle_ids, []);
  assert.equal(s.explanation_text, "");
});

test("matched/mismatched degrade to generic when diagnosis is 'none' (bundle unchanged)", () => {
  const { recommendedBundle, candidates } = fixtureRound();
  const s = buildScaffold({ scaffoldType: SCAFFOLD_TYPES.MATCHED, diagnosis: { dominant_weakness: "none" }, recommendedBundle, candidates });
  assert.equal(s.degraded_to_generic, true);
  assert.equal(s.rendered_scaffold_type, SCAFFOLD_TYPES.GENERIC);
  assert.equal(s.target_attribute, null);
  assert.deepEqual(s.recommended_bundle_ids, ["o1"]); // bundle still fixed
});

test("mismatch attribute selection is deterministic", () => {
  // W1 diagnosed -> mismatched prefers cross_city (first non-diagnosed in order)
  assert.equal(selectTargetAttribute(SCAFFOLD_TYPES.MISMATCHED, "W1"), "cross_city_travel_time_seconds");
  assert.equal(selectTargetAttribute(SCAFFOLD_TYPES.MISMATCHED, "W2"), "effective_pick_time_seconds");
  assert.equal(selectTargetAttribute(SCAFFOLD_TYPES.MATCHED, "W3"), "earnings");
});

// ---- D10: four-arm randomization + CHI protocol ----
test("CHI protocol validates: 30 rounds default, A/B/C, four arms, bundle-invariant policy", () => {
  const v = validateChiStudyProtocol(buildChiStudyProtocol());
  assert.ok(v.ok, `expected valid CHI protocol, got: ${v.errors.join("; ")}`);
  assert.equal(v.expected_total_rounds, 30);
  assert.deepEqual(v.phase_round_counts, { A: 10, B: 10, C: 10 });
});

test("CHI round counts are configurable and validated", () => {
  const v = validateChiStudyProtocol(buildChiStudyProtocol({ rounds_per_phase: { A: 8, B: 8, C: 8 } }));
  assert.ok(v.ok, v.errors.join("; "));
  assert.equal(v.expected_total_rounds, 24);
  assert.deepEqual(v.phase_round_counts, { A: 8, B: 8, C: 8 });
});

test("assignScaffoldArm returns a stable arm among the four scaffold types", () => {
  const protocol = buildChiStudyProtocol();
  const a1 = assignScaffoldArm("participant-123", protocol);
  const a2 = assignScaffoldArm("participant-123", protocol);
  assert.equal(a1.id, a2.id); // stable
  assert.ok(CHI_SCAFFOLD_TYPES.includes(a1.id));
});

test("all four arms are reachable across participants", () => {
  const protocol = buildChiStudyProtocol();
  const seen = new Set();
  for (let i = 0; i < 400; i += 1) seen.add(assignScaffoldArm(`p-${i}`, protocol).id);
  for (const t of CHI_SCAFFOLD_TYPES) assert.ok(seen.has(t), `arm ${t} never assigned`);
});

test("treated arms share one fixed recommendation policy (bundle invariance at protocol level)", () => {
  const protocol = getChiStudyProtocol();
  const policies = new Set(
    CHI_TREATED_SCAFFOLD_TYPES.map((id) => protocol.policy_arms.find((a) => a.id === id)?.policy_name),
  );
  assert.equal(policies.size, 1);
});
