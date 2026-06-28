import test from "node:test";
import assert from "node:assert/strict";

import { buildChiStudyProtocol } from "../../src/lib/researchStudy.js";
import { roundContext, diagnoseTrigger } from "../../src/lib/chiStudyRuntime.js";

// PRE-REGISTRATION GUARD (picking-primary). The primary contrast is marginal vs aggregate on
// transfer regret, restricted to the W1-coachable subgroup DEFINED BY THE INITIAL PHASE-A DIAGNOSIS
// (rounds 1-15, unaided, pre-treatment). For that subgroup to be a valid pre-registered moderator,
// the initial read MUST be independent of arm assignment. It is, by construction:
//   (1) Phase A (rounds 1-15) shows NO feedback in ANY arm, so a participant's Phase A choices --
//       and therefore the initial diagnosis fit on them -- cannot depend on the arm.
//   (2) the "initial" diagnosis fires at the Phase-A boundary (r15) and reads only rounds <= 15.
//       The retune (post-coaching, contaminated by feedback) is a LATER trigger and must NEVER be
//       used to define the subgroup. runDiagnosis takes the choiceSets, not the arm.

test("PRE-REG: Phase A (rounds 1-15) is unaided in every arm (the initial read is pre-treatment)", () => {
  const proto = buildChiStudyProtocol();
  for (let r = 1; r <= 15; r += 1) {
    assert.equal(roundContext(proto, r).feedback_enabled, false, `round ${r} must be unaided (Phase A)`);
  }
});

test("PRE-REG: the subgroup-defining 'initial' diagnosis fires at r15, strictly before any feedback", () => {
  const proto = buildChiStudyProtocol();
  assert.equal(diagnoseTrigger(proto, 15), "initial", "initial read at the Phase-A boundary");
  assert.equal(diagnoseTrigger(proto, 25), "retune", "retune is a LATER trigger (must not define the subgroup)");
  assert.equal(diagnoseTrigger(proto, 35), "final");
  // The first AIDED round is B1 r16: the initial read (r15) is strictly pre-treatment, so it is
  // identical across arms and the W1-coachable subgroup is exchangeable across treatment arms.
  assert.equal(roundContext(proto, 16).feedback_enabled, true, "B1 (r16) is the first aided round");
});
