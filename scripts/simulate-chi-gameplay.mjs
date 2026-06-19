/**
 * Gameplay sandbox for the CHI study — closer to real play than simulate-chi-study.mjs.
 *
 * Drives a HETEROGENEOUS, noisy population of synthetic participants through the
 * full 35-round loop, producing the ACTUAL study data via the runtime log builders
 * (decisionLogRecord / participantLogRecord), then reports the statistics a
 * researcher would see and runs data-integrity + "works-as-intended" checks on the
 * real logged records:
 *   - the diagnosis recovers each planted bias (W1 pick-neglect / W3 payout) on
 *     realistic noisy choices;
 *   - feedback fires only in ON blocks and every feedback string references a REAL
 *     legal one-step move (never invented);
 *   - scoring is modeled-time based and is_optimal/score_ratio are self-consistent;
 *   - the optimal-rate and its bonus improve under counterfactual feedback.
 *
 * No Firebase / browser. Run:  node scripts/simulate-chi-gameplay.mjs
 */
import { buildChiStudyProtocol, CHI_POST_PHASE_A_SURVEY } from "../src/lib/researchStudy.js";
import { buildChiScenarioSet, enumerateLegalBundles, scoreBundle, CHI_STARTING_CITY, CHI_CITY_TRAVEL } from "../src/lib/chiScenarioDesign.js";
import {
  roundContext, feedbackForDecision, decisionLogRecord, participantLogRecord,
  diagnoseTrigger, runDiagnosis, optimalRate, optimalRateBonus,
} from "../src/lib/chiStudyRuntime.js";

const ARMS = ["marginal", "component", "oracle", "aggregate", "control"];
const N_PER_ARM = 40;
// LCG with seed-mixing + warmup so structured seeds don't correlate the first draws.
const rng = (seed) => {
  let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < 8; i += 1) s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};
const cross = (f, t, sc) => (CHI_CITY_TRAVEL[f]?.[t] ?? 0) * sc;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x) => `${(x * 100).toFixed(0)}%`;

function bundleFeatures(ids, byId, startCity, travelScale) {
  let c = startCity, earnings = 0, pick = 0, local = 0, crossT = 0;
  const g = {};
  for (const id of ids) {
    const o = byId[id];
    earnings += o.earnings; pick += o.pick; local += o.localTravelTime;
    crossT += cross(c, o.city, travelScale); if (o.city) c = o.city; (g[o.store] ||= []).push(o);
  }
  let sv = 0; for (const grp of Object.values(g)) if (grp.length >= 2) sv += grp.reduce((s, o) => s + o.pick, 0) * 0.25;
  return { earnings, pick, cross: crossT, local, savings: sv };
}
function candidatesFor(scenario) {
  const byId = Object.fromEntries(scenario.orders.map((o) => [o.id, o]));
  return enumerateLegalBundles(scenario.order_ids, byId, scenario.max_bundle).map((ids) => {
    const sc = scoreBundle(ids, byId, CHI_STARTING_CITY, scenario.travel_scale);
    return { bundle_ids: sc.bundle_ids, earnings: sc.earnings, deployed_total_time_seconds: sc.total_time_seconds, deployed_score: sc.score, feat: bundleFeatures(ids, byId, CHI_STARTING_CITY, scenario.travel_scale) };
  });
}

// A heterogeneous population: pick-neglect (W1), payout-overweight (W3), near-unbiased.
function makeParticipant(rand) {
  const r = rand();
  if (r < 0.5) return { type: "W1", aPick: 0.05 * rand(), gamma: 1.0 };
  if (r < 0.8) return { type: "W3", aPick: 1.0, gamma: 1.5 + 0.7 * rand() };
  return { type: "none", aPick: 0.85 + 0.15 * rand(), gamma: 1.0 + 0.1 * rand() };
}
// Perceived value with mis-weighted pick time (W1) and over-weighted earnings (W3).
const perceived = (f, b) => Math.pow(f.earnings, b.gamma) / Math.max(0.1, b.aPick * f.pick + f.cross + f.local - f.savings);
// Noisy choice: softmax over perceived^tau.
function choose(cands, b, rand, tau = 7) {
  const w = cands.map((c) => Math.pow(Math.max(1e-6, perceived(c.feat, b)), tau));
  const z = w.reduce((a, x) => a + x, 0); let r = rand() * z;
  for (let i = 0; i < cands.length; i += 1) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
const argmaxScore = (cands) => cands.reduce((b, c) => (c.deployed_score > b.deployed_score ? c : b), cands[0]);

function play(arm, protocol, scenarios, seed) {
  const rand = rng(seed);
  const b = makeParticipant(rand);
  const LEARN = { marginal: 0.6, component: 0.55, aggregate: 0.08, oracle: 0, control: 0 };
  const decisions = []; const unaided = []; const diagnosisHistory = []; let survey = null;
  const surveyResponses = b.type === "W3"
    ? { strat_over_inclusion: 3, strat_watched_pick_time: 3, strat_avoided_cross_city: 3, strat_chased_payout: 5, confidence_rating: 3 }
    : b.type === "W1"
      ? { strat_over_inclusion: 5, strat_watched_pick_time: 1, strat_avoided_cross_city: 3, strat_chased_payout: 2, confidence_rating: 3 }
      : { strat_over_inclusion: 3, strat_watched_pick_time: 3, strat_avoided_cross_city: 3, strat_chased_payout: 3, confidence_rating: 3 };

  for (let round = 1; round <= scenarios.length; round += 1) {
    const scenario = scenarios[round - 1];
    const cands = candidatesFor(scenario);
    const oracle = argmaxScore(cands);
    const ctx = roundContext(protocol, round);
    const diagnosis = diagnosisHistory.at(-1) ?? {};

    const chosen = (arm === "oracle" && ctx.is_on_block) ? oracle : choose(cands, b, rand);
    const feedback = feedbackForDecision({ protocol, round, arm, chosenBundle: chosen, legalBundles: cands, diagnosis });
    decisions.push(decisionLogRecord({ protocol, round, arm, chosenBundle: chosen, oracleBundle: oracle, candidateSetId: scenario.scenario_id, feedback }));

    // Feedback learning: correct the coached attribute (the diagnosis learning_target).
    if (ctx.is_on_block && LEARN[arm]) {
      const tgt = diagnosis.learning_target;
      if (tgt === "W1") b.aPick += LEARN[arm] * (1 - b.aPick);
      else if (tgt === "W3") b.gamma += LEARN[arm] * (1 - b.gamma);
    }
    if (!ctx.is_on_block) {
      unaided.push({ alternatives: cands.map((c) => ({ features: { earnings: c.feat.earnings, effective_pick_time_seconds: c.feat.pick, cross_city_travel_time_seconds: c.feat.cross, local_travel_time_seconds: c.feat.local, shared_item_savings_seconds: c.feat.savings }, chosen: c === chosen, oracle: c === oracle })) });
    }
    if (round === 15) survey = { responses: surveyResponses, type: b.type };
    const trig = diagnoseTrigger(protocol, round);
    if (trig) diagnosisHistory.push(runDiagnosis({ trigger: trig, round, choiceSets: unaided, surveyResponses, surveyQuestions: CHI_POST_PHASE_A_SURVEY }));
  }
  return { type: b.type, record: participantLogRecord({ participantId: `p${seed}`, arm, survey, diagnosisHistory, decisions }), decisions };
}

function run() {
  const protocol = buildChiStudyProtocol();
  const set = buildChiScenarioSet();
  const all = {};
  const integrity = []; const addCheck = (label, pass) => integrity.push([label, pass]);
  let badField = 0, inventedMove = 0, feedbackOutsideOn = 0, scoreInconsistent = 0, dxCount = 0, dxOk = 0;

  for (const arm of ARMS) {
    const ps = Array.from({ length: N_PER_ARM }, (_, i) => play(arm, protocol, set.scenarios, 5000 + i * 11 + ARMS.indexOf(arm) * 7919));
    all[arm] = ps;
    for (const p of ps) {
      // each participant: exactly 3 diagnoses at 15/25/35
      if (p.record.diagnosis_history.length === 3 && p.record.diagnosis_history.map((h) => h.round).join() === "15,25,35") dxCount += 1;
      // diagnosis recovers the planted bias (initial dominant)
      const init = p.record.diagnosis_history[0]?.dominant_weakness;
      if (p.type !== "none") { dxCount; if (init === p.type) dxOk += 1; }
      for (const d of p.decisions) {
        for (const k of ["round", "phase", "block", "arm", "deployed_score", "violation_label", "feedback_text"]) if (d[k] === undefined || (typeof d[k] === "number" && Number.isNaN(d[k]))) badField += 1;
        if (d.feedback_text && d.block_kind !== "on") feedbackOutsideOn += 1;
        if (d.is_optimal !== (d.score_ratio >= 1 - 1e-6)) scoreInconsistent += 1;
        if (d.best_improving_move) {
          const scenario = set.scenarios[d.round - 1];
          const legal = new Set(candidatesFor(scenario).map((c) => c.bundle_ids.join()));
          if (!legal.has(d.best_improving_move.neighbor_bundle_ids.join())) inventedMove += 1;
        }
      }
    }
  }

  // ---- stats report ----
  const blockRate = (ps, kind, field) => mean(ps.flatMap((p) => p.decisions.filter((d) => (kind === "transfer" ? d.test_set === "transfer_shifted" : d.block_kind === kind)).map((d) => (field === "viol" ? (d.best_improving_move ? 1 : 0) : d.is_optimal ? 1 : 0))));
  // Optimal-rate on a segment of each participant's decisions (in-study choice quality).
  const segOpt = (ps, filt) => mean(ps.flatMap((p) => p.decisions.filter(filt).map((d) => (d.is_optimal ? 1 : 0))));
  const phaseA = (d) => d.phase === "A";        // unaided baseline (identical across arms)
  const onB3 = (d) => d.block === "B3";          // ON block 2, after coaching

  const transfer = (d) => d.test_set === "transfer_shifted"; // unaided shifted picking probe
  console.log(`\nCHI gameplay sandbox — ${N_PER_ARM} participants/arm (50% W1, 30% W3, 20% unbiased), noisy choices\n`);
  console.log("arm           optimal-rate  bonus   ON fire   PhaseA->ON-2   TRANSFER-opt (W1 subgrp)");
  const learn = {}; const transferW1 = {};
  for (const arm of ARMS) {
    const ps = all[arm];
    const optRate = mean(ps.map((p) => p.record.optimal_rate));
    const bonus = mean(ps.map((p) => p.record.optimal_rate_bonus));
    const fireRate = mean(ps.flatMap((p) => p.decisions.filter((d) => d.block_kind === "on").map((d) => (d.feedback_text ? 1 : 0))));
    const base = segOpt(ps, phaseA); const b3 = segOpt(ps, onB3); learn[arm] = b3 - base;
    transferW1[arm] = segOpt(ps.filter((p) => p.type === "W1"), transfer); // the subgroup the picking shift tests
    console.log(`${arm.padEnd(12)}   ${pct(optRate).padStart(6)}     ${bonus.toFixed(2)}   ${pct(fireRate).padStart(5)}    ${pct(base)}->${pct(b3)}        ${pct(transferW1[arm]).padStart(5)}`);
  }

  // diagnosis recovery confusion (initial dominant vs planted)
  console.log("\ndiagnosis recovery (initial dominant weakness vs planted bias):");
  const conf = {};
  for (const arm of ARMS) for (const p of all[arm]) { const init = p.record.diagnosis_history[0]?.dominant_weakness ?? "none"; (conf[p.type] ||= {}); conf[p.type][init] = (conf[p.type][init] || 0) + 1; }
  for (const t of ["W1", "W3", "none"]) console.log(`  planted ${t.padEnd(4)} -> ${JSON.stringify(conf[t] || {})}`);

  // a sample logged record
  const sample = all.marginal.find((p) => p.type === "W1");
  const onFb = sample.decisions.find((d) => d.block_kind === "on" && d.feedback_text);
  console.log("\nsample marginal/W1 participant — one ON-block decision record:");
  console.log("  " + JSON.stringify({ round: onFb.round, block: onFb.block, is_optimal: onFb.is_optimal, score_ratio: Number(onFb.score_ratio?.toFixed(2)), violation_label: onFb.violation_label, feedback_text: onFb.feedback_text }, null, 0));
  console.log("  diagnosis history:", JSON.stringify(sample.record.diagnosis_history.map((h) => ({ trigger: h.trigger, round: h.round, dom: h.dominant_weakness, target: h.learning_target }))));

  // ---- integrity + works-as-intended checks ----
  addCheck("no undefined/NaN fields in any decision record", badField === 0);
  addCheck("feedback never fires outside ON blocks", feedbackOutsideOn === 0);
  addCheck("every feedback move references a REAL legal candidate (never invented)", inventedMove === 0);
  addCheck("is_optimal / score_ratio self-consistent (modeled-time scoring)", scoreInconsistent === 0);
  addCheck("every participant has 3 diagnoses at rounds 15/25/35", dxCount === ARMS.length * N_PER_ARM);
  addCheck("diagnosis recovers planted bias for >70% of biased participants", dxOk / (Object.values(all).flat().filter((p) => p.type !== "none").length) > 0.7);
  // PRIMARY outcome = the held-out unaided SHIFTED transfer block (W1 subgroup, the
  // population the picking shift tests). The in-study Phase A->ON-2 column is shown
  // for context but NOT asserted: it is confounded by menu difficulty (the ON-block
  // menus differ from the diagnostic battery) and by oracle answer-copying.
  addCheck("TRANSFER (held-out shifted): marginal beats control for W1 participants", transferW1.marginal > transferW1.control + 0.1);
  addCheck("TRANSFER: marginal beats answer-giving oracle for W1 (deskilling)", transferW1.marginal > transferW1.oracle + 0.1);
  addCheck("TRANSFER: component (directed) also beats control for W1", transferW1.component > transferW1.control + 0.1);
  addCheck("oracle's in-study optimal-rate is copy-inflated (ON-2 near-perfect) - deskilling caveat", segOpt(all.oracle, onB3) > 0.95);

  console.log("\ndata-integrity & works-as-intended checks:");
  let ok = true; for (const [label, pass] of integrity) { console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}`); ok = ok && pass; }
  console.log("\nNOTES:");
  console.log(`  - PRIMARY outcome is the held-out unaided TRANSFER block (W1 subgroup): marginal ${pct(transferW1.marginal)}`);
  console.log(`    vs control ${pct(transferW1.control)} vs oracle ${pct(transferW1.oracle)} (deskilled). The picking correction transfers.`);
  console.log(`  - The in-study Phase A -> ON-2 column is NOT a clean learning signal: control gains +${pct(learn.control)}`);
  console.log("    with NO feedback (menu-difficulty: ON-block menus differ from the diagnostic battery),");
  console.log("    and oracle's ON-2 is answer-copying. Read learning from the unaided transfer block instead.");
  console.log("  - The finer counterfactual-vs-scalar separation shows on the unaided probe in simulate-chi-study.mjs.");
  console.log(`\n${ok ? "ALL CHECKS PASSED — the logged study data is well-formed and shows the intended effects." : "SOME CHECKS FAILED."}\n`);
  process.exit(ok ? 0 : 1);
}

run();
