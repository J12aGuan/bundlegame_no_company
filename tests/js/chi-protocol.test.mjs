import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiStudyProtocol,
  getChiStudyProtocol,
  assignScaffoldArm,
  validateChiStudyProtocol,
  CHI_SCAFFOLD_TYPES,
  CHI_TREATED_SCAFFOLD_TYPES,
} from "../../src/lib/researchStudy.js";

// ---- five-arm randomization + CHI dynamic counterfactual-feedback protocol ----
test("CHI protocol validates: 35 rounds default, A + blocked B (on/off/on/off), four arms", () => {
  const v = validateChiStudyProtocol(buildChiStudyProtocol());
  assert.ok(v.ok, `expected valid CHI protocol, got: ${v.errors.join("; ")}`);
  assert.equal(v.expected_total_rounds, 35);
  assert.deepEqual(v.phase_round_counts, { A: 15, B: 20 });
  assert.deepEqual(
    v.phase_b_blocks.map((b) => `${b.kind}:${b.rounds}`),
    ["on:5", "off:5", "on:5", "off:5"],
  );
  // OFF block 1 = retention (same dist), OFF block 2 = transfer (shifted).
  const offs = v.phase_b_blocks.filter((b) => b.kind === "off").map((b) => b.test_set);
  assert.deepEqual(offs, ["retention_same_dist", "transfer_shifted"]);
});

test("CHI round counts are configurable and validated", () => {
  const v = validateChiStudyProtocol(buildChiStudyProtocol({ rounds_per_phase: { A: 12, B: 16 } }));
  assert.ok(v.ok, v.errors.join("; "));
  assert.equal(v.expected_total_rounds, 28);
  assert.deepEqual(v.phase_round_counts, { A: 12, B: 16 });
  assert.deepEqual(v.phase_b_blocks.map((b) => b.rounds), [4, 4, 4, 4]);
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
  for (let i = 0; i < 500; i += 1) seen.add(assignScaffoldArm(`p-${i}`, protocol).id);
  for (const t of CHI_SCAFFOLD_TYPES) assert.ok(seen.has(t), `arm ${t} never assigned`);
});

test("treated arms share one fixed recommendation policy (bundle invariance at protocol level)", () => {
  const protocol = getChiStudyProtocol();
  const policies = new Set(
    CHI_TREATED_SCAFFOLD_TYPES.map((id) => protocol.policy_arms.find((a) => a.id === id)?.policy_name),
  );
  assert.equal(policies.size, 1);
});
