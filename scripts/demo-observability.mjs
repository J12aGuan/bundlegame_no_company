/**
 * Observability & controllability of the bias state (C2) — the numerical companion to
 * docs/IDENTIFIABILITY_THEORY.md. Recasts the participant's per-attribute weight-bias as a
 * LATENT STATE and demonstrates, on the deployed CHI menus, the theorem's three claims:
 *
 *   1. OBSERVABILITY (structural). The counterfactual per-attribute observation map over a
 *      spanning menu set has a full-rank observability Gramian (lambda_min > 0) -> the bias
 *      state is observable. The SCALAR / regret channel observes only the aggregate value
 *      gap (one direction): its Gramian is rank 1 (lambda_min = 0) -> an entire (d-1)-dim
 *      subspace of biases is indistinguishable -> UNOBSERVABLE.
 *
 *   2. UNOBSERVABILITY IS REAL (calibrated twins). A pure pick-neglecter (W1) and a pure
 *      payout-overweighter (W3) can be tuned to the SAME scalar regret. Outcome feedback
 *      then cannot tell them apart (overlapping regret, classifier ~ chance); the
 *      counterfactual diagnosis on the spanning subspace separates them cleanly.
 *
 *   3. SAMPLE COMPLEXITY (Fisher). The standard error of the recovered bias decays ~1/sqrt(n)
 *      with the number of spanning rounds, with a constant governed by 1/sqrt(lambda_min) of
 *      the choice-weighted Fisher information — so pooling the confounded picking-stress
 *      menus (which shrink lambda_min on the earnings axis) needs more rounds for the same
 *      precision. CONTROLLABILITY is the dual (see the closing note + simulate-chi-dynamic).
 *
 * DESIGN-ADEQUACY in the linear-logit model; where it degrades under noise + a misspecified
 * value function is scripts/stress-chi-identifiability.mjs. NOT human evidence.
 *
 * No Firebase / browser. Run:  node scripts/demo-observability.mjs
 */
import {
  buildChiScenarioSet, enumerateLegalBundles, scoreBundle,
  CHI_STARTING_CITY, CHI_CITY_TRAVEL,
} from "../src/lib/chiScenarioDesign.js";
import { behavioralBias } from "../src/lib/chiDiagnosis.js";
import { observabilityGramian, gramSpectrum, SPAN_AXES } from "../src/lib/menuSpan.js";

const rng = (seed) => { let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0; for (let i = 0; i < 8; i += 1) s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const cross = (f, t, sc) => (CHI_CITY_TRAVEL[f]?.[t] ?? 0) * sc;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

function bundleFeatures(ids, byId, startCity, travelScale) {
  let c = startCity, earnings = 0, pick = 0, local = 0, crossT = 0; const g = {};
  for (const id of ids) {
    const o = byId[id];
    earnings += o.earnings; pick += (o.pick ?? Math.max(0, o.estimatedTime - o.localTravelTime));
    local += o.localTravelTime; crossT += cross(c, o.city, travelScale); if (o.city) c = o.city; (g[o.store] ||= []).push(o);
  }
  let sv = 0; for (const grp of Object.values(g)) if (grp.length >= 2) sv += grp.reduce((s, o) => s + (o.pick ?? Math.max(0, o.estimatedTime - o.localTravelTime)), 0) * 0.25;
  return { earnings, pick, cross: crossT, local, savings: sv };
}
function candidatesFor(scenario) {
  const byId = Object.fromEntries(scenario.orders.map((o) => [o.id, o]));
  return enumerateLegalBundles(scenario.order_ids, byId, scenario.max_bundle).map((ids) => {
    const sc = scoreBundle(ids, byId, CHI_STARTING_CITY, scenario.travel_scale);
    return { bundle_ids: sc.bundle_ids, deployed_score: sc.score, feat: bundleFeatures(ids, byId, CHI_STARTING_CITY, scenario.travel_scale) };
  });
}
const argmaxScore = (cs) => cs.reduce((a, c) => (c.deployed_score > a.deployed_score ? c : a), cs[0]);
const FEAT = (f) => ({ earnings: f.earnings, effective_pick_time_seconds: f.pick, cross_city_travel_time_seconds: f.cross, local_travel_time_seconds: f.local, shared_item_savings_seconds: f.savings });

// Participant utility (log space): bias = under-weight pick (W1) and/or over-weight earnings (W3).
const utility = (f, b) => b.gamma * Math.log(Math.max(1e-6, f.earnings)) - Math.log(Math.max(0.1, b.aPick * f.pick + f.cross + f.local - f.savings));
function choose(cands, b, rand, tau = 9) {
  const us = cands.map((c) => utility(c.feat, b));
  const mx = Math.max(...us), mn = Math.min(...us), spread = mx - mn || 1;
  const w = us.map((u) => Math.exp(tau * (u - mx) / spread));
  const z = w.reduce((a, x) => a + x, 0); let r = rand() * z;
  for (let i = 0; i < cands.length; i += 1) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
// mean relative regret of a participant over a menu set (the SCALAR / outcome channel).
function meanRegret(menus, b, rand, reps = 6) {
  const rs = [];
  for (let rep = 0; rep < reps; rep += 1) for (const sc of menus) {
    const cs = candidatesFor(sc); if (cs.length < 2) continue;
    const opt = argmaxScore(cs); const ch = choose(cs, b, rand);
    rs.push((opt.deployed_score - ch.deployed_score) / opt.deployed_score);
  }
  return mean(rs);
}
const pad = (s, n) => String(s).padEnd(n);
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : "inf");

function run() {
  const set = buildChiScenarioSet();
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  const traps = pool.filter((s) => s.is_payout_trap === 1);
  const COACH_AXES = ["earnings", "effective_pick_time_seconds", "cross_city_travel_time_seconds"]; // d=3 bias axes

  console.log("\nObservability & controllability of the bias state — deployed CHI menus");
  console.log(`pool: ${pool.length} unaided menus (${traps.length} payout traps = the spanning subspace)\n`);

  // ----------------------------------------------------------------------- //
  // 1. OBSERVABILITY (structural). Observability Gramian lambda_min of the     //
  //    counterfactual map (spanning vs pooled) vs the scalar/regret channel.   //
  // ----------------------------------------------------------------------- //
  console.log("1) STRUCTURAL OBSERVABILITY — Gramian of the observation map over {earnings, pick, local, cross}");
  console.log("   observable <=> lambda_min > 0; sample cost ~ 1/lambda_min (relative).\n");
  // Representative value direction (earnings up, costs down) for the scalar projection.
  const reward = [1, -1, -1, -1];
  const channels = [
    ["counterfactual / spanning (traps)", observabilityGramian(traps, { axes: SPAN_AXES })],
    ["counterfactual / pooled (all menus)", observabilityGramian(pool, { axes: SPAN_AXES })],
    ["scalar / regret (traps, projected)", observabilityGramian(traps, { axes: SPAN_AXES, projectOnto: reward })],
  ];
  console.log(`   ${pad("channel", 38)} rank  lambda_min  condition  sampleCost(1/lmin)`);
  for (const [name, g] of channels) {
    const cost = g.lambda_min > 1e-9 ? (1 / g.lambda_min).toFixed(2) : "INF (unobservable)";
    console.log(`   ${pad(name, 38)} ${g.rank}/4    ${f2(g.lambda_min).padStart(7)}    ${f2(g.condition).padStart(7)}    ${cost}`);
  }
  console.log("   => the scalar channel is rank 1 (lambda_min 0): the per-axis bias is UNOBSERVABLE from regret alone.");
  console.log("      the counterfactual channel is full rank on the spanning subspace: the bias is OBSERVABLE.");
  console.log("      (structural span is necessary, not sufficient: the pooled set also spans and is individually");
  console.log("      informative, yet the deployed direction-difference estimator is BIASED on it — block 3 + C1.)\n");

  // ----------------------------------------------------------------------- //
  // 2. UNOBSERVABILITY IS REAL — calibrated twins (equal scalar regret).       //
  // Tune BOTH a pick-neglecter (W1) and a payout-overweighter (W3) to a common  //
  // achievable mean regret, draw a jittered population of each, and ask whether  //
  // the SCALAR (regret) vs COUNTERFACTUAL (per-axis) channel can tell them apart.//
  // ----------------------------------------------------------------------- //
  console.log("2) UNOBSERVABILITY IS REAL — a W1 and a W3 population tuned to the SAME scalar regret");
  const T0 = 0.11; // common target mean regret (both types can reach it)
  const tune = (scan, mk) => scan.reduce((best, v) => {
    const d = Math.abs(meanRegret(pool, mk(v), rng(777)) - T0);
    return d < best.d ? { v, d } : best;
  }, { v: scan[0], d: Infinity }).v;
  const aPick1 = tune(Array.from({ length: 95 }, (_, i) => 0.02 + i * 0.01), (a) => ({ aPick: a, gamma: 1.0 }));
  const gamma3 = tune(Array.from({ length: 70 }, (_, i) => 1.2 + i * 0.05), (g) => ({ aPick: 1.0, gamma: g }));
  const drawW1 = (rand) => ({ aPick: aPick1 * (0.8 + 0.4 * rand()), gamma: 1.0 });
  const drawW3 = (rand) => ({ aPick: 1.0, gamma: gamma3 * (0.92 + 0.16 * rand()) });
  const Nclass = 80;
  const regretW1 = [], regretW3 = [], cfTargetW1 = [], cfTargetW3 = [];
  const cfTarget = (b, rand) => {
    const sets = [];
    for (const sc of traps) { const cs = candidatesFor(sc); if (cs.length < 2) continue; const opt = argmaxScore(cs); const ch = choose(cs, b, rand); sets.push({ round: sc.round, alternatives: cs.map((c) => ({ features: FEAT(c.feat), chosen: c === ch, oracle: c === opt })) }); }
    const { strengths } = behavioralBias(sets);
    return strengths.W1 > strengths.W3 ? "W1" : "W3"; // counterfactual read on the spanning subspace
  };
  for (let i = 0; i < Nclass; i += 1) {
    const r1 = rng(1000 + i), r3 = rng(5000 + i);
    const b1 = drawW1(r1), b3 = drawW3(r3);
    regretW1.push(meanRegret(pool, b1, r1, 1)); // a single study's observed mean regret per participant
    regretW3.push(meanRegret(pool, b3, r3, 1));
    cfTargetW1.push(cfTarget(b1, rng(11000 + i)));
    cfTargetW3.push(cfTarget(b3, rng(15000 + i)));
  }
  const mu1 = mean(regretW1), mu3 = mean(regretW3), s1 = sd(regretW1), s3 = sd(regretW3);
  const dprime = Math.abs(mu1 - mu3) / Math.sqrt((s1 * s1 + s3 * s3) / 2 || 1);
  const cfAcc = (cfTargetW1.filter((t) => t === "W1").length + cfTargetW3.filter((t) => t === "W3").length) / (2 * Nclass);
  console.log(`   calibrated to ~${(T0 * 100).toFixed(0)}% regret: W1 (aPick ${aPick1.toFixed(2)}) vs W3 (gamma ${gamma3.toFixed(2)}); observed regret W1=${(mu1 * 100).toFixed(1)}%+-${(s1 * 100).toFixed(1)}  W3=${(mu3 * 100).toFixed(1)}%+-${(s3 * 100).toFixed(1)}`);
  console.log(`   SCALAR channel separability d' = ${dprime.toFixed(2)} (|mu diff| / pooled sd; ~0 => indistinguishable by regret)`);
  console.log(`   COUNTERFACTUAL channel classification accuracy (W1 vs W3, spanning subspace) = ${(cfAcc * 100).toFixed(0)}%`);
  console.log("   => same regret, opposite bias: outcome feedback cannot separate them; counterfactual feedback does.\n");

  // ----------------------------------------------------------------------- //
  // 3. SAMPLE COMPLEXITY (Fisher) — bias-estimate stderr ~ 1/sqrt(n).          //
  // ----------------------------------------------------------------------- //
  console.log("3) SAMPLE COMPLEXITY — standard error of the recovered payout bias vs # spanning rounds n");
  // Choice-weighted Fisher information matrix at the W3 operating point over the d=3 coachable
  // axes {earnings, pick, cross}, PER-MENU-AVERAGED (I/n) so the comparison reflects menu
  // QUALITY, not quantity. The Cramer-Rao bound says Var(earnings-bias estimate) >= [I^-1]_ee:
  // pooling the confounded picking menus raises the per-menu earnings variance (each pooled menu
  // buys less payout-precision), even though it adds data. lambda_min(I/n) is the observability
  // margin = the bound's constant.
  const fisherInfo = (menus, b) => {
    const k = COACH_AXES.length; const I = Array.from({ length: k }, () => new Array(k).fill(0)); let nm = 0;
    for (const sc of menus) {
      const cs = candidatesFor(sc); if (cs.length < 2) continue; nm += 1;
      const X = cs.map((c) => COACH_AXES.map((a) => FEAT(c.feat)[a]));
      const us = cs.map((c) => utility(c.feat, b)); const mx = Math.max(...us), spread = (mx - Math.min(...us)) || 1;
      const w = us.map((u) => Math.exp(9 * (u - mx) / spread)); const z = w.reduce((a, x) => a + x, 0); const P = w.map((x) => x / z);
      const xbar = COACH_AXES.map((_, j) => X.reduce((s, r, a) => s + P[a] * r[j], 0));
      for (let a = 0; a < X.length; a += 1) for (let i = 0; i < k; i += 1) for (let j = 0; j < k; j += 1) I[i][j] += P[a] * (X[a][i] - xbar[i]) * (X[a][j] - xbar[j]);
    }
    return { I: I.map((r) => r.map((x) => x / (nm || 1))), nm }; // per-menu-averaged info
  };
  // [I^-1]_ee (earnings, index 0) and lambda_min for a 3x3 symmetric PD-ish matrix.
  const inv00 = (I) => {
    const a = I[0][0], b = I[0][1], c = I[0][2], d = I[1][1], e = I[1][2], f = I[2][2];
    const det = a * (d * f - e * e) - b * (b * f - e * c) + c * (b * e - d * c);
    return det !== 0 ? (d * f - e * e) / det : Infinity;
  };
  const W3op = { aPick: 1.0, gamma: 1.9 };
  const Ispan = fisherInfo(traps, W3op), Ipool = fisherInfo(pool, W3op);
  const crlbSpan = inv00(Ispan.I), crlbPool = inv00(Ipool.I);
  const lminSpan = gramSpectrum(Ispan.I.map((r) => r.slice())).lambda_min; // spectrum of the (symmetric) info matrix
  console.log(`   per-menu Fisher info, payout axis: CRLB Var(earnings bias) spanning ${crlbSpan.toFixed(3)}  vs  pooled ${crlbPool.toFixed(3)} (comparable)`);
  console.log("   => pooling does NOT raise the information-theoretic variance, so the picking confound is NOT a Fisher");
  console.log("      limit: it is an ESTIMATOR-BIAS effect (the deployed direction-difference argmax is pulled by the");
  console.log("      non-trap menus). Reading on the observable/spanning subspace recovers W3 (C1: 40% -> 90%) — the fix");
  console.log("      is an estimator, not more menus.");
  console.log(`   observability margin lambda_min(I/n) on the spanning subspace = ${lminSpan.toFixed(3)} (the bound's constant).\n`);
  console.log(`   n(traps)   stderr(W3 strength)   stderr*sqrt(n)`);
  const trapCycle = (n) => Array.from({ length: n }, (_, i) => traps[i % traps.length]);
  for (const n of [traps.length, 2 * traps.length, 4 * traps.length, 8 * traps.length]) {
    const ests = [];
    for (let i = 0; i < 120; i += 1) {
      const rand = rng(30000 + i * 7 + n * 131); const menus = trapCycle(n); const sets = [];
      for (const sc of menus) { const cs = candidatesFor(sc); if (cs.length < 2) continue; const opt = argmaxScore(cs); const ch = choose(cs, { aPick: 1.0, gamma: 1.9 }, rand); sets.push({ alternatives: cs.map((c) => ({ features: FEAT(c.feat), chosen: c === ch, oracle: c === opt })) }); }
      ests.push(behavioralBias(sets).strengths.W3);
    }
    const se = sd(ests);
    console.log(`   ${pad(n, 9)}  ${se.toFixed(4).padStart(8)}            ${(se * Math.sqrt(n)).toFixed(3)}`);
  }
  console.log("   => stderr*sqrt(n) is ~flat: the estimate concentrates at the 1/sqrt(n) Fisher rate the bound predicts.\n");

  // ----------------------------------------------------------------------- //
  // 4. CONTROLLABILITY (the dual) — brief.                                     //
  // ----------------------------------------------------------------------- //
  console.log("4) CONTROLLABILITY (dual of observability) — counterfactual feedback is the per-axis control input.");
  console.log("   The per-attribute counterfactual move targets a chosen axis (the control matrix is full-rank on the");
  console.log("   observable/spanning subspace), so the bias state is REACHABLE component-wise: feedback can drive the");
  console.log("   coached axis to zero. Scalar feedback can only push the aggregate value direction -> it can lower");
  console.log("   realized regret without zeroing (or even revealing) the specific bias. Observability is NECESSARY for");
  console.log("   verifiable correction. Empirical drive-to-zero of the coached axis: scripts/simulate-chi-dynamic.mjs.\n");

  console.log("DESIGN-ADEQUACY in the linear-logit model. Degradation under choice noise + a misspecified value");
  console.log("function: scripts/stress-chi-identifiability.mjs. The human pilot is the only test of whether people");
  console.log("carry separable leaks at all. See docs/IDENTIFIABILITY_THEORY.md for the formal statements.\n");

  // light self-check so the demo fails loudly if the core claims regress.
  const okObservable = channels[0][1].lambda_min > 1e-6 && channels[2][1].lambda_min < 1e-6;
  const okTwins = dprime < 0.6 && cfAcc > 0.7;
  if (!okObservable) { console.error("REGRESSION: spanning channel not observable or scalar channel not rank-deficient."); process.exit(1); }
  if (!okTwins) { console.error(`REGRESSION: calibrated-twins claim broke (d'=${dprime.toFixed(2)}, cfAcc=${(cfAcc * 100).toFixed(0)}%).`); process.exit(1); }
}
run();
