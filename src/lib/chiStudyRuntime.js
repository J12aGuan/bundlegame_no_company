/**
 * CHI dynamic counterfactual-feedback study — runtime orchestration (Tasks 6 & 7).
 *
 * The testable "brains" of the gameplay loop: given the protocol + scenario set +
 * a participant's arm and choices, it resolves which block each round is in, gates
 * and computes the feedback (ON blocks only), schedules the survey and the per-block
 * re-diagnosis, scores each round on MODELED time (not the clock), and builds the
 * per-decision / per-participant log records. The Svelte gameplay components call
 * into this; no study logic lives in the UI.
 *
 * Pure ESM (composes marginalFeedback + chiDiagnosis + the protocol), so the whole
 * 35-round loop is exercisable under `node --test` without the browser.
 */
import { feedbackForArm } from "./marginalFeedback.js";
import { diagnose } from "./chiDiagnosis.js";

// --------------------------------------------------------------------------- //
// Task 6 — scoring & incentive (speed-confound fixes).                         //
// --------------------------------------------------------------------------- //
// Fixed round count; each round scored on the MODELED deployed time, never the
// real clock; a generous per-round limit; the bonus is tied to the optimal-rate,
// not cumulative earnings (so rushing/earning more never helps the score).
export const CHI_SCORING_CONFIG = {
  total_rounds: 35,
  round_time_limit_seconds: 600, // generous; the round is not a speed test
  score_basis: "modeled_deployed_total_time_seconds",
  bonus_basis: "optimal_rate",
  max_bonus: 5,
};

const scoreOf = (b = {}) => {
  const s = b.deployed_score ?? b.score;
  if (Number.isFinite(Number(s))) return Number(s);
  const t = Number(b.deployed_total_time_seconds ?? b.total_time_seconds);
  const e = Number(b.earnings) || 0;
  return t > 0 ? e / t : 0;
};

/** Per-round score from the modeled bundle time (clock-independent). */
export function roundScore(chosenBundle, oracleBundle, { epsilon = 1e-6 } = {}) {
  const chosen = scoreOf(chosenBundle);
  const oracle = scoreOf(oracleBundle);
  const ratio = oracle > 0 ? chosen / oracle : 0;
  return {
    deployed_score: chosen,
    oracle_score: oracle,
    score_ratio: ratio,
    is_optimal: ratio >= 1 - epsilon,
  };
}

export function optimalRate(decisions = []) {
  if (!decisions.length) return 0;
  const n = decisions.filter((d) => d.is_optimal).length;
  return n / decisions.length;
}

/** Bonus tied to the optimal-rate (NOT cumulative earnings). */
export function optimalRateBonus(decisions = [], { maxBonus = CHI_SCORING_CONFIG.max_bonus } = {}) {
  return Math.round(optimalRate(decisions) * maxBonus * 100) / 100;
}

// --------------------------------------------------------------------------- //
// Task 7 — block resolution + scheduling.                                      //
// --------------------------------------------------------------------------- //
/** Which phase/block a 1-based round falls in (and whether feedback may fire). */
export function roundContext(protocol, round) {
  const phases = protocol?.phase_plan || [];
  const phase = phases.find((p) => round >= p.round_start && round <= p.round_end) || null;
  let block = null;
  if (phase && Array.isArray(phase.blocks)) {
    block = phase.blocks.find((b) => round >= b.round_start && round <= b.round_end) || null;
  }
  const isOn = block?.kind === "on";
  return {
    round,
    phase_id: phase?.id ?? null,
    block_id: block?.id ?? null,
    block_kind: block?.kind ?? (phase?.id === "A" ? "diagnostic" : null),
    test_set: block?.test_set ?? null,
    // Feedback only ever fires in an ON block; Phase A and OFF blocks are unaided.
    feedback_enabled: Boolean(block?.feedback_enabled),
    is_on_block: isOn,
    is_off_block: block?.kind === "off",
  };
}

/** True on the last round of Phase A (administer the survey + first diagnosis). */
export function shouldShowSurvey(protocol, round) {
  const a = (protocol?.phase_plan || []).find((p) => p.id === "A");
  return Boolean(a?.survey_after) && round === a.round_end;
}

/**
 * Rounds after which to (re)diagnose: end of Phase A (initial), and the end of
 * each OFF block (re-tune / final read). Returns the trigger kind or null.
 */
export function diagnoseTrigger(protocol, round) {
  const a = (protocol?.phase_plan || []).find((p) => p.id === "A");
  if (a?.diagnose_after && round === a.round_end) return "initial";
  const b = (protocol?.phase_plan || []).find((p) => p.id === "B");
  for (const blk of b?.blocks || []) {
    if (blk.rediagnose_after && round === blk.round_end) {
      return blk.test_set === "transfer_shifted" ? "final" : "retune";
    }
  }
  return null;
}

// --------------------------------------------------------------------------- //
// Feedback gating (ON blocks only) + per-decision / per-participant logging.    //
// --------------------------------------------------------------------------- //
/**
 * Feedback for a decision. Returns the empty record unless the round is an ON
 * block — Phase A and OFF blocks are always unaided regardless of arm.
 */
export function feedbackForDecision({ protocol, round, arm, chosenBundle, legalBundles, diagnosis, labelFor }) {
  const ctx = roundContext(protocol, round);
  if (!ctx.feedback_enabled) return { text: "", violation_label: "none", best_improving_move: null };
  return feedbackForArm(arm, { chosenBundle, legalBundles, diagnosis, labelFor });
}

/** Per-decision log record (Task 7). */
export function decisionLogRecord({ protocol, round, arm, chosenBundle, oracleBundle, candidateSetId, feedback }) {
  const ctx = roundContext(protocol, round);
  const score = oracleBundle ? roundScore(chosenBundle, oracleBundle) : { deployed_score: scoreOf(chosenBundle), score_ratio: null, is_optimal: null };
  return {
    round,
    phase: ctx.phase_id,
    block: ctx.block_id,
    block_kind: ctx.block_kind,
    test_set: ctx.test_set,
    arm,
    chosen_order_ids: (chosenBundle?.bundle_ids ?? chosenBundle?.order_ids ?? []).map(String),
    deployed_score: score.deployed_score,
    score_ratio: score.score_ratio,
    is_optimal: score.is_optimal,
    candidate_set_id: candidateSetId ?? null,
    feedback_enabled: ctx.feedback_enabled,
    violation_label: feedback?.violation_label ?? "none",
    best_improving_move: feedback?.best_improving_move ?? null,
    feedback_text: feedback?.text ?? "",
  };
}

/** Per-participant log record (survey + the per-block diagnosis history). */
export function participantLogRecord({ participantId, arm, survey = null, diagnosisHistory = [], decisions = [] }) {
  return {
    participant_id: participantId,
    arm,
    survey,
    diagnosis_history: diagnosisHistory, // [{ trigger, round, dominant_weakness, learning_target, residual, ... }]
    optimal_rate: optimalRate(decisions),
    optimal_rate_bonus: optimalRateBonus(decisions),
    n_decisions: decisions.length,
  };
}

/**
 * Re-export the diagnosis entry-point shape the runtime persists per block. The
 * caller accumulates the unaided choice sets and calls this after each trigger.
 */
export function runDiagnosis({ trigger, round, choiceSets, surveyResponses, surveyQuestions }) {
  const d = diagnose({ choiceSets, surveyResponses, surveyQuestions });
  return {
    trigger,
    round,
    dominant_weakness: d.dominant_weakness,
    dominant_label: d.dominant_label,
    learning_target: d.learning_target,
    residual: d.residual,
    confidence: d.confidence,
    n_rounds: d.n_rounds,
  };
}
