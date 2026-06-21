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

test("re-diagnosis recency-weights recent rounds; the initial read stays uniform", () => {
  const protocol = buildChiStudyProtocol();
  const overEarnRound = () => {
    const base = { earnings: 12, effective_pick_time_seconds: 15, cross_city_travel_time_seconds: 0, local_travel_time_seconds: 5, shared_item_savings_seconds: 0 };
    const alt = (earn, chosen, oracle) => ({ features: { ...base, earnings: earn }, chosen, oracle });
    return { alternatives: [alt(34, true, false), alt(22, false, false), alt(12, false, true)] };
  };
  // Phase A: a long stale over-picking (W1) battery. Post-coaching OFF block: over-earning (W3).
  const stale = Array.from({ length: 12 }, (_, i) => ({ ...overPickRound(), round: i + 1 }));
  const recent = Array.from({ length: 4 }, (_, i) => ({ ...overEarnRound(), round: 21 + i }));

  // Initial diagnosis (round 15) sees only Phase A and reads it uniformly -> W1.
  const initial = runDiagnosis({ trigger: "initial", round: 15, choiceSets: stale, surveyResponses: {}, surveyQuestions: CHI_POST_PHASE_A_SURVEY });
  assert.equal(initial.dominant_weakness, "W1");

  // Re-tune (round 25) accumulates Phase A + the recent OFF block but recency-weights
  // it, so the recent payout (W3) block re-targets the diagnosis off the coached W1.
  const retune = runDiagnosis({ trigger: "retune", round: 25, choiceSets: [...stale, ...recent], surveyResponses: {}, surveyQuestions: CHI_POST_PHASE_A_SURVEY });
  assert.equal(retune.dominant_weakness, "W3");
  assert.equal(retune.learning_target, "W3");
});

test("runDiagnosis persists the WIDENED analysis record (per-axis strengths, identifiability, abstention, spanning)", () => {
  const sets = Array.from({ length: 9 }, (_, i) => ({ ...overPickRound(), round: i + 1 }));
  const d = runDiagnosis({ trigger: "initial", round: 15, choiceSets: sets, surveyResponses: {}, surveyQuestions: CHI_POST_PHASE_A_SURVEY });
  // the actionable fields are still there
  assert.ok(["W1", "W2", "W3", "none"].includes(d.dominant_weakness));
  assert.ok("learning_target" in d);
  // the widened fields the analysis needs
  assert.ok(d.strengths && typeof d.strengths === "object", "per-axis strengths persisted");
  for (const w of ["W1", "W2", "W3"]) assert.equal(typeof d.strengths[w], "number", `strengths.${w} is numeric`);
  assert.ok(d.identifiability && typeof d.identifiability === "object", "per-axis identifiability (Fisher info) persisted");
  for (const w of ["W1", "W2", "W3"]) assert.equal(typeof d.identifiability[w], "number", `identifiability.${w} is numeric`);
  assert.equal(typeof d.abstained, "boolean", "abstained flag persisted");
  assert.ok("spanning_used" in d && "spanning_n" in d, "observable-subspace fields persisted");
  // an over-picker reads W1
  assert.equal(d.dominant_weakness, "W1");
});

test("decisionLogRecord carries the per-decision feedback fields that the Action record persists", () => {
  const protocol = buildChiStudyProtocol();
  const cands = [
    { bundle_ids: ["o1"], earnings: 20, deployed_total_time_seconds: 30, deployed_score: 20 / 30 },
    { bundle_ids: ["o1", "o2"], earnings: 30, deployed_total_time_seconds: 75, deployed_score: 30 / 75 },
  ];
  const fb = feedbackForDecision({ protocol, round: 16, arm: "marginal", chosenBundle: cands[1], legalBundles: cands, diagnosis: null });
  const rec = decisionLogRecord({ protocol, round: 16, arm: "marginal", chosenBundle: cands[1], oracleBundle: cands[0], candidateSetId: "s16", feedback: fb });
  for (const k of ["block", "block_kind", "test_set", "feedback_enabled", "violation_label", "best_improving_move", "feedback_text", "deployed_score", "score_ratio", "is_optimal"]) {
    assert.ok(k in rec, `decisionLogRecord must expose ${k} for the Action log`);
  }
  assert.equal(rec.feedback_enabled, true, "round 16 is an ON block");
  assert.equal(typeof rec.deployed_score, "number");
});

test("marginal feedback fires only in ON blocks (empty in Phase A and OFF blocks)", () => {
  const protocol = buildChiStudyProtocol();
  // A suboptimal (over-included) chosen bundle so the marginal arm has a move to show.
  const cands = [
    { bundle_ids: ["o1"], earnings: 20, deployed_total_time_seconds: 30, deployed_score: 20 / 30 },
    { bundle_ids: ["o1", "o2"], earnings: 30, deployed_total_time_seconds: 75, deployed_score: 30 / 75 },
  ];
  const chosen = cands[1];
  // diagnosis is null in the lean pilot — must not throw.
  const call = (round) => feedbackForDecision({ protocol, round, arm: "marginal", chosenBundle: chosen, legalBundles: cands, diagnosis: null });

  // ON blocks B1 (16-20) and B3 (26-30): non-empty counterfactual feedback.
  assert.ok(call(16).text.length > 0, "ON block B1 must show feedback");
  assert.ok(call(28).text.length > 0, "ON block B3 must show feedback");
  assert.match(call(16).text, /Dropping order o2/);
  assert.equal(call(16).violation_label, "over_inclusion");

  // Phase A (1-15) and OFF blocks B2 (21-25) / B4 (31-35): empty.
  assert.equal(call(5).text, "", "Phase A is unaided");
  assert.equal(call(23).text, "", "OFF retention is unaided");
  assert.equal(call(33).text, "", "OFF transfer is unaided");
});
