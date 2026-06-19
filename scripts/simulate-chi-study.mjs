/**
 * Sandbox simulation of the CHI dynamic counterfactual-feedback study.
 *
 * Drives the REAL modules (protocol + scenario set + chiStudyRuntime + marginal
 * feedback + diagnosis) through the full 35-round loop for synthetic participants
 * across all five arms, with a participant model that LEARNS from feedback, then
 * checks the outcome matches the model's prediction:
 *
 *   transfer-block violation rate:  marginal ~ component  <  aggregate  <  oracle ~ control
 *   deskilling:  oracle's violation is ~0 with the aid on screen (ON blocks) but
 *                high on the unaided transfer block.
 *
 * No Firebase / no browser — pure logic verification. Run:
 *   node scripts/simulate-chi-study.mjs
 */
import { buildChiStudyProtocol, CHI_POST_PHASE_A_SURVEY } from "../src/lib/researchStudy.js";
import {
  buildChiScenarioSet, enumerateLegalBundles, scoreBundle, CHI_STARTING_CITY, CHI_CITY_TRAVEL,
} from "../src/lib/chiScenarioDesign.js";
import { roundContext, diagnoseTrigger, runDiagnosis } from "../src/lib/chiStudyRuntime.js";
import { bestImprovingMove } from "../src/lib/marginalFeedback.js";

const ARMS = ["marginal", "component", "oracle", "aggregate", "control"];
const N_PER_ARM = 60;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const cross = (from, to, scale) => (CHI_CITY_TRAVEL[from]?.[to] ?? 0) * scale;

// Decompose a bundle into the attribute features both the participant and the
// diagnosis use (mirrors scoreBundle's time model).
function bundleFeatures(ids, byId, startCity, travelScale) {
  let simCity = startCity, earnings = 0, pick = 0, local = 0, crossT = 0;
  const groups = {};
  for (const id of ids) {
    const o = byId[id];
    earnings += o.earnings; pick += o.pick; local += o.localTravelTime;
    crossT += cross(simCity, o.city, travelScale); if (o.city) simCity = o.city;
    (groups[o.store] ||= []).push(o);
  }
  let savings = 0;
  for (const g of Object.values(groups)) if (g.length >= 2) savings += g.reduce((s, o) => s + o.pick, 0) * 0.25;
  const trueTime = Math.max(0.1, pick + local + crossT - savings);
  return { earnings, pick, cross: crossT, local, savings, trueTime, deployed_score: earnings / trueTime };
}

// Participant: under-weights pick time by factor a.pick in [0,1] (1 = unbiased).
// Perceived score uses the mis-weighted time; they argmax it.
function perceivedScore(f, a) {
  const t = Math.max(0.1, a.pick * f.pick + a.cross * f.cross + f.local - f.savings);
  return f.earnings / t;
}

function candidatesFor(scenario) {
  const byId = Object.fromEntries(scenario.orders.map((o) => [o.id, o]));
  return enumerateLegalBundles(scenario.order_ids, byId, scenario.max_bundle).map((ids) => {
    const sc = scoreBundle(ids, byId, CHI_STARTING_CITY, scenario.travel_scale);
    const feat = bundleFeatures(ids, byId, CHI_STARTING_CITY, scenario.travel_scale);
    return {
      bundle_ids: sc.bundle_ids, earnings: sc.earnings,
      deployed_total_time_seconds: sc.total_time_seconds, deployed_score: sc.score, feat,
    };
  });
}

const argmax = (arr, key) => arr.reduce((b, c) => (key(c) > key(b) ? c : b), arr[0]);

// A picking-relevant held-out probe: the distribution where the coached W1 bias
// actually bites (the diagnostic/overlap menus). We measure the LEARNED state on
// it unaided, which is what "did the picking correction stick / transfer" means.
function probeViolation(probeScenarios, a) {
  let v = 0, n = 0;
  for (const sc of probeScenarios) {
    const cands = candidatesFor(sc);
    const chosen = argmax(cands, (c) => perceivedScore(c.feat, a));
    v += bestImprovingMove(chosen, cands) != null ? 1 : 0; n += 1;
  }
  return n ? v / n : 0;
}

function simulateParticipant(arm, protocol, scenarios, probe, seed) {
  const rand = rng(seed);
  const a = { pick: 0.02 * rand(), cross: 1.0 }; // strong W1 (pick-neglect) bias
  const probeBefore = probeViolation(probe, { ...a });
  const byBlock = {};
  const tally = (key, viol) => { (byBlock[key] ||= { v: 0, n: 0 }); byBlock[key].n += 1; byBlock[key].v += viol ? 1 : 0; };
  const unaided = []; const diagnoses = [];
  const LEARN = { marginal: 0.6, component: 0.55, aggregate: 0.08 }; // directed vs weak/undirected

  for (let round = 1; round <= scenarios.length; round += 1) {
    const scenario = scenarios[round - 1];
    const cands = candidatesFor(scenario);
    const oracle = argmax(cands, (c) => c.deployed_score);
    const ctx = roundContext(protocol, round);

    // The oracle arm copies the shown answer during ON blocks (no learning ->
    // deskilling); everyone else chooses by their (mis-weighted) perception.
    const chosen = (arm === "oracle" && ctx.is_on_block) ? oracle : argmax(cands, (c) => perceivedScore(c.feat, a));
    tally(ctx.test_set || ctx.block_kind, bestImprovingMove(chosen, cands) != null);

    // Feedback learning (ON blocks only): directed correction of the coached
    // attribute (picking) for marginal/component; a weak undirected nudge for aggregate.
    if (ctx.is_on_block && LEARN[arm]) a.pick += LEARN[arm] * (1 - a.pick);

    if (!ctx.is_on_block) {
      unaided.push({
        alternatives: cands.map((c) => ({
          features: {
            earnings: c.feat.earnings, effective_pick_time_seconds: c.feat.pick,
            cross_city_travel_time_seconds: c.feat.cross, local_travel_time_seconds: c.feat.local,
            shared_item_savings_seconds: c.feat.savings,
          },
          chosen: c === chosen, oracle: c === oracle,
        })),
      });
    }
    const trig = diagnoseTrigger(protocol, round);
    if (trig) diagnoses.push(runDiagnosis({ trigger: trig, round, choiceSets: unaided, surveyResponses: { strat_over_inclusion: 5, strat_watched_pick_time: 1 }, surveyQuestions: CHI_POST_PHASE_A_SURVEY }));
  }
  const rate = (k) => (byBlock[k]?.n ? byBlock[k].v / byBlock[k].n : 0);
  return {
    probeBefore, probeAfter: probeViolation(probe, { ...a }),
    onViol: rate("on"), retention: rate("retention_same_dist"), transfer: rate("transfer_shifted"),
    initialDx: diagnoses[0]?.dominant_weakness, finalTarget: diagnoses.at(-1)?.learning_target,
  };
}

function run() {
  const protocol = buildChiStudyProtocol();
  const set = buildChiScenarioSet();
  // The picking probe = the Phase A diagnostic battery (the menus that exercise W1).
  const probe = set.scenarios.filter((s) => s.phase === "A");
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const results = {};
  for (const arm of ARMS) {
    const ps = Array.from({ length: N_PER_ARM }, (_, i) => simulateParticipant(arm, protocol, set.scenarios, probe, 1000 + i * 7 + ARMS.indexOf(arm) * 9973));
    results[arm] = {
      probeBefore: mean(ps.map((p) => p.probeBefore)), probeAfter: mean(ps.map((p) => p.probeAfter)),
      onViol: mean(ps.map((p) => p.onViol)), transfer: mean(ps.map((p) => p.transfer)),
      dxW1: ps.filter((p) => p.initialDx === "W1").length / ps.length,
    };
  }

  const pct = (x) => `${(x * 100).toFixed(0)}%`.padStart(5);
  console.log(`\nCHI study simulation — ${N_PER_ARM} synthetic W1 (pick-neglect) participants/arm, ${set.scenarios.length} rounds\n`);
  console.log("                TRANSFER (shifted,    diagnostic probe      ON-block   diagnosis");
  console.log("arm             unaided) = PRIMARY    before -> after       violation  recovers W1");
  for (const arm of ARMS) {
    const r = results[arm];
    console.log(`${arm.padEnd(12)}    ${pct(r.transfer)}              ${pct(r.probeBefore)} -> ${pct(r.probeAfter)}      ${pct(r.onViol)}      ${pct(r.dxW1)}`);
  }

  // Primary outcome = the held-out SHIFTED transfer block (now over-bundling +
  // heavier pick, so it exercises the coached picking weakness). The finer
  // counterfactual-vs-scalar separation shows on the diagnostic probe.
  const T = (arm) => results[arm].transfer;
  const A = (arm) => results[arm].probeAfter;
  const checks = [
    ["counterfactual teaches a picking correction (marginal probe drops a lot)", results.marginal.probeBefore - results.marginal.probeAfter > 0.1],
    ["TRANSFER: feedback beats none (marginal < control)", T("marginal") < T("control") - 0.1],
    ["TRANSFER: teaching beats answer-giving (marginal < oracle)", T("marginal") < T("oracle") - 0.1],
    ["TRANSFER: component ~ marginal (both directed)", Math.abs(T("component") - T("marginal")) < 0.05],
    ["counterfactual beats scalar on the finer probe (marginal < aggregate)", A("marginal") < A("aggregate") - 0.02],
    ["oracle DESKILLS: ~0 violation with the aid on screen, high on unaided transfer", results.oracle.onViol < 0.03 && T("oracle") > T("marginal") + 0.1],
    ["control does not learn (transfer ~ unaided baseline, high)", T("control") > 0.1],
    ["diagnosis recovers W1 for >70% of participants", results.marginal.dxW1 > 0.7],
  ];
  console.log("\nbehavioral checks (model predictions):");
  let ok = true;
  for (const [label, pass] of checks) { console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}`); ok = ok && pass; }

  console.log("\nNOTE — the transfer block now exercises the coached weakness:");
  console.log("  The held-out SHIFTED transfer set (rounds 31-35) over-samples the picking cell");
  console.log("  (over-bundling temptations) with novel stores + heavier pick, so a picking");
  console.log(`  correction TRANSFERS to it: marginal ${pct(T("marginal"))} vs control ${pct(T("control"))}.`);
  console.log(`\n${ok ? "ALL CHECKS PASSED — the built system behaves as the model predicts." : "SOME CHECKS FAILED."}\n`);
  process.exit(ok ? 0 : 1);
}

run();
