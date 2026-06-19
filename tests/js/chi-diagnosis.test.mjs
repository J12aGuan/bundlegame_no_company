import test from "node:test";
import assert from "node:assert/strict";

import {
  behavioralBias,
  surveyPrior,
  fuseDiagnosis,
  learningIndex,
  diagnose,
} from "../../src/lib/chiDiagnosis.js";
import { CHI_POST_PHASE_A_SURVEY } from "../../src/lib/researchStudy.js";

// ---- synthetic choice-set builders ---------------------------------------- //
const BASE = {
  earnings: 20,
  effective_pick_time_seconds: 15,
  cross_city_travel_time_seconds: 0,
  local_travel_time_seconds: 5,
  shared_item_savings_seconds: 0,
};
// One round: 3 alternatives, participant picks wIdx, oracle picks oIdx.
function round(overrides, wIdx, oIdx) {
  const alts = overrides.map((ov) => ({ features: { ...BASE, ...ov } }));
  return { alternatives: alts.map((a, i) => ({ ...a, chosen: i === wIdx, oracle: i === oIdx })) };
}
// Only pick time varies; participant over-picks (chooses most pick), oracle least.
function overPickRounds(n = 6) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(round(
      [{ effective_pick_time_seconds: 8 }, { effective_pick_time_seconds: 16 }, { effective_pick_time_seconds: 28 }],
      2, 0,
    ));
  }
  return out;
}
// Only earnings varies; participant over-weights payout (most earnings), oracle least.
function overEarnRounds(n = 6) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    out.push(round(
      [{ earnings: 12 }, { earnings: 22 }, { earnings: 34 }],
      2, 0,
    ));
  }
  return out;
}

test("conditional-logit port recovers a pick-neglect (W1) bias from over-picking choices", () => {
  const { strengths } = behavioralBias(overPickRounds());
  assert.ok(strengths.W1 > 0, `W1 should be positive, got ${strengths.W1}`);
  assert.ok(strengths.W1 > strengths.W3, "W1 dominates W3");
  assert.ok(strengths.W1 > strengths.W2, "W1 dominates W2");
});

test("surveyPrior maps the strategy items to a signed W1/W2/W3 prior (reverse items handled)", () => {
  // High over-inclusion + low 'watched pick time' (reverse) => strong +W1.
  const responses = {
    strat_over_inclusion: 5,
    strat_watched_pick_time: 1, // reverse: low => raises W1
    strat_avoided_cross_city: 3,
    strat_chased_payout: 1, // low => lowers W3
    confidence_rating: 4,
  };
  const { prior, confidence } = surveyPrior(responses, CHI_POST_PHASE_A_SURVEY);
  assert.ok(prior.W1 > 1, `expected strong +W1 prior, got ${prior.W1}`);
  assert.ok(prior.W3 < 0, `chasing-payout=1 should give negative W3, got ${prior.W3}`);
  assert.equal(confidence, 0.75); // (4-1)/(5-1)
});

test("survey-fusion: a matching prior moves the dominant weakness toward the truth", () => {
  // Behavioral fit is borderline and WRONG (W3 edges out the true W1).
  const behavioral = { W1: 0.1, W2: 0.0, W3: 0.12 };
  const behavioralOnly = fuseDiagnosis(behavioral, { W1: 0, W2: 0, W3: 0 }, { priorWeight: 0.5 });
  assert.equal(behavioralOnly.dominant_weakness, "W3"); // behavioral-only mislabels

  const withPrior = fuseDiagnosis(behavioral, { W1: 0.5, W2: 0, W3: 0 }, { priorWeight: 0.5 });
  assert.equal(withPrior.dominant_weakness, "W1"); // the survey prior corrects it
  assert.ok(withPrior.strengths_fused.W1 > withPrior.strengths_fused.W3);
});

test("dynamic re-estimation: after picking is corrected, the dominant shifts off W1", () => {
  const d1 = diagnose({ choiceSets: overPickRounds() });
  assert.equal(d1.dominant_weakness, "W1");
  assert.equal(d1.learning_target, "W1");

  // Re-diagnose on a later block where picking is correct but payout is over-weighted.
  const d2 = diagnose({ choiceSets: overEarnRounds() });
  assert.notEqual(d2.dominant_weakness, "W1");
  assert.equal(d2.dominant_weakness, "W3");
});

test("learning index never targets the poorly-identified cross-city weight (W2)", () => {
  // Even when W2's raw bias is the largest, the coaching target stays W1/W3.
  const { target, G } = learningIndex({ W1: 0.2, W2: 0.9, W3: 0.15 });
  assert.notEqual(target, "W2");
  assert.equal(target, "W1");
  assert.ok(G.W2 > 0, "G is still reported for W2");
});

test("too few rounds falls back to the survey prior alone", () => {
  const d = diagnose({
    choiceSets: overPickRounds(2), // below minRounds
    surveyResponses: { strat_over_inclusion: 5, strat_watched_pick_time: 1 },
    surveyQuestions: CHI_POST_PHASE_A_SURVEY,
  });
  assert.equal(d.from_survey_only, true);
  assert.equal(d.dominant_weakness, "W1");
});
