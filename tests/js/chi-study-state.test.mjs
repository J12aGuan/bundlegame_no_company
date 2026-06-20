import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeResearchStudyState,
  mergeResearchStudyState,
} from "../../src/lib/researchStudy.js";

// The persistence linchpin: phase_a_survey + diagnosis_history must survive the
// normalize/merge round-trip (that is the save -> Firestore -> reload path).
test("study-state preserves phase_a_survey + diagnosis_history through normalize", () => {
  const state = {
    assigned_arm: "marginal",
    phase_a_survey: { responses: { strat_over_inclusion: 5, confidence_rating: 3 }, submitted_at: "2026-01-01T00:00:00Z" },
    diagnosis_history: [{ trigger: "initial", round: 15, dominant_weakness: "W1", learning_target: "W1" }],
  };
  const n = normalizeResearchStudyState(state);
  assert.equal(n.phase_a_survey.responses.strat_over_inclusion, 5);
  assert.equal(n.diagnosis_history.length, 1);
  assert.equal(n.diagnosis_history[0].learning_target, "W1");
});

test("study-state merge round-trips the fields and replaces diagnosis_history with the full array", () => {
  const state = {
    assigned_arm: "marginal",
    phase_a_survey: { responses: { strat_chased_payout: 5 }, submitted_at: "t" },
    diagnosis_history: [{ trigger: "initial", round: 15, dominant_weakness: "W1" }],
  };
  const merged = mergeResearchStudyState({}, state);
  assert.equal(merged.phase_a_survey.responses.strat_chased_payout, 5);
  assert.equal(merged.diagnosis_history[0].round, 15);

  // saveChiDiagnosis passes the FULL updated array; merge replaces (not concatenates).
  const merged2 = mergeResearchStudyState(merged, {
    diagnosis_history: [...merged.diagnosis_history, { trigger: "retune", round: 25, dominant_weakness: "W3", learning_target: "W3" }],
  });
  assert.equal(merged2.diagnosis_history.length, 2);
  assert.equal(merged2.diagnosis_history[1].round, 25);
  assert.equal(merged2.phase_a_survey.responses.strat_chased_payout, 5); // unrelated field retained
});

test("absent CHI fields normalize cleanly (no phase_a_survey, empty diagnosis_history)", () => {
  const n = normalizeResearchStudyState({ assigned_arm: "control" });
  assert.equal(n.phase_a_survey, undefined);
  assert.deepEqual(n.diagnosis_history, []);
});
