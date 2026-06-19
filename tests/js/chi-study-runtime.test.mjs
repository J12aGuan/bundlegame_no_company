import test from "node:test";
import assert from "node:assert/strict";

import { buildChiStudyProtocol, CHI_POST_PHASE_A_SURVEY } from "../../src/lib/researchStudy.js";
import {
  buildChiScenarioSet,
  enumerateLegalBundles,
  scoreBundle,
  CHI_STARTING_CITY,
} from "../../src/lib/chiScenarioDesign.js";
import {
  roundContext,
  shouldShowSurvey,
  diagnoseTrigger,
  feedbackForDecision,
  decisionLogRecord,
  participantLogRecord,
  runDiagnosis,
  roundScore,
  optimalRateBonus,
} from "../../src/lib/chiStudyRuntime.js";

// Synthetic unaided "over-picker" round for the diagnosis input (decoupled from
// the scenario candidates; the conditional-logit numerics are tested elsewhere).
function overPickRound() {
  const base = { earnings: 20, effective_pick_time_seconds: 15, cross_city_travel_time_seconds: 0, local_travel_time_seconds: 5, shared_item_savings_seconds: 0 };
  const alt = (pick, chosen, oracle) => ({ features: { ...base, effective_pick_time_seconds: pick }, chosen, oracle });
  return { alternatives: [alt(8, false, true), alt(16, false, false), alt(28, true, false)] };
}

function candidatesFor(scenario) {
  const byId = Object.fromEntries(scenario.orders.map((o) => [o.id, o]));
  return enumerateLegalBundles(scenario.order_ids, byId, scenario.max_bundle).map((b) => {
    const sc = scoreBundle(b, byId, CHI_STARTING_CITY, scenario.travel_scale);
    return { bundle_ids: sc.bundle_ids, earnings: sc.earnings, deployed_total_time_seconds: sc.total_time_seconds, deployed_score: sc.score };
  });
}

test("roundScore is modeled-time based and clock-independent", () => {
  const chosen = { earnings: 30, deployed_total_time_seconds: 60 }; // 0.5/s
  const oracle = { earnings: 30, deployed_total_time_seconds: 45 }; // 0.667/s
  const a = roundScore(chosen, oracle);
  const b = roundScore({ ...chosen, clock_seconds: 999 }, oracle); // clock time must not matter
  assert.equal(a.score_ratio, b.score_ratio);
  assert.equal(a.is_optimal, false);
  assert.equal(roundScore(oracle, oracle).is_optimal, true);
});

test("e2e smoke: a marginal-arm participant through all 35 rounds", () => {
  const protocol = buildChiStudyProtocol();
  const set = buildChiScenarioSet();
  assert.equal(set.scenarios.length, 35);
  const arm = "marginal";
  const decisions = [];
  const diagnosisHistory = [];
  const unaided = [];
  let survey = null;
  const surveyResponses = { strat_over_inclusion: 5, strat_watched_pick_time: 1, confidence_rating: 3 };

  for (let round = 1; round <= 35; round += 1) {
    const scenario = set.scenarios[round - 1];
    const candidates = candidatesFor(scenario);
    const oracle = candidates.reduce((best, c) => (c.deployed_score > (best?.deployed_score ?? -Infinity) ? c : best), null);
    const ctx = roundContext(protocol, round);

    // Scripted policy: unaided phases over-include (suboptimal); OFF blocks the
    // participant has "learned" and picks the oracle (so transfer shows mastery).
    const chosen = ctx.is_off_block
      ? oracle
      : candidates.slice().sort((a, b) => b.bundle_ids.length - a.bundle_ids.length || a.deployed_score - b.deployed_score)[0];

    const diagnosis = diagnosisHistory.at(-1) ?? {};
    const feedback = feedbackForDecision({ protocol, round, arm, chosenBundle: chosen, legalBundles: candidates, diagnosis });
    decisions.push(decisionLogRecord({ protocol, round, arm, chosenBundle: chosen, oracleBundle: oracle, candidateSetId: scenario.scenario_id, feedback }));

    if (!ctx.is_on_block) unaided.push(overPickRound()); // Phase A + OFF blocks are unaided
    if (shouldShowSurvey(protocol, round)) survey = { responses: surveyResponses };
    const trig = diagnoseTrigger(protocol, round);
    if (trig) diagnosisHistory.push(runDiagnosis({ trigger: trig, round, choiceSets: unaided, surveyResponses, surveyQuestions: CHI_POST_PHASE_A_SURVEY }));
  }

  // 1) Feedback fires ONLY in ON blocks.
  for (const d of decisions) {
    if (d.block_kind !== "on") assert.equal(d.feedback_text, "", `round ${d.round} (${d.block_kind}) must be unaided`);
  }
  const onWithFeedback = decisions.filter((d) => d.block_kind === "on" && d.feedback_text);
  assert.ok(onWithFeedback.length > 0, "ON-block suboptimal choices carry counterfactual feedback");
  assert.ok(onWithFeedback.every((d) => d.best_improving_move && /Dropping|Adding|Swapping/.test(d.feedback_text)));

  // 2) Survey after round 15; first diagnosis + re-tune + final at 15/25/35.
  assert.ok(survey, "survey administered after Phase A");
  assert.deepEqual(diagnosisHistory.map((h) => h.round), [15, 25, 35]);
  assert.deepEqual(diagnosisHistory.map((h) => h.trigger), ["initial", "retune", "final"]);
  assert.ok(diagnosisHistory.every((h) => ["W1", "W2", "W3", "none"].includes(h.dominant_weakness)));

  // 3) Per-decision log schema.
  const sample = decisions.find((d) => d.block === "B1");
  for (const k of ["round", "phase", "block", "block_kind", "arm", "chosen_order_ids", "deployed_score", "score_ratio", "is_optimal", "candidate_set_id", "feedback_enabled", "violation_label", "best_improving_move", "feedback_text"]) {
    assert.ok(k in sample, `decision log missing field ${k}`);
  }

  // 4) Modeled-time scoring: OFF-transfer oracle choices are optimal.
  const transfer = decisions.filter((d) => d.test_set === "transfer_shifted");
  assert.equal(transfer.length, 5);
  assert.ok(transfer.every((d) => d.is_optimal), "transfer-block (oracle) choices score optimal");

  // 5) Per-participant record: survey + per-block diagnosis history + optimal-rate bonus.
  const record = participantLogRecord({ participantId: "p1", arm, survey, diagnosisHistory, decisions });
  assert.equal(record.diagnosis_history.length, 3);
  assert.equal(record.n_decisions, 35);
  assert.equal(record.optimal_rate_bonus, optimalRateBonus(decisions));
  assert.ok(record.optimal_rate > 0 && record.optimal_rate <= 1);
});
