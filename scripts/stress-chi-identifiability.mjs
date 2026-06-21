/**
 * Identifiability stress test (C1) — the empirical face of the ICML identifiability
 * theorem, pressure-tested under the two conditions the menu-span check does NOT cover
 * (docs/MODEL_NOTES.md §2 open item):
 *
 *   (a) MEASUREMENT NOISE on the choice data — the participant chooses with a finite
 *       logit temperature plus a uniform lapse rate, so the revealed weights are read
 *       from noisy choices rather than argmax behaviour.
 *   (b) A MISSPECIFIED AGGREGATION V — the participant's TRUE value function differs
 *       from the deployed reward `earnings / time`. The diagnosis ALWAYS compares the
 *       participant against the DEPLOYED oracle (earnings/time argmax); when the
 *       participant aggregates value differently (convex/concave time, diminishing
 *       returns on pay, or a non-ratio additive utility) an UNBIASED participant already
 *       deviates from that oracle, so the question is whether the diagnosis (i) still
 *       recovers a genuinely planted payout leak (W3), (ii) does not coach a single-axis
 *       cost-neglecter on payout, and (iii) abstains rather than fabricate a coachable
 *       target out of pure misspecification.
 *
 * HEADLINE FINDING (the bridge to the C2 theorem). W3 (payout) is identifiable only on
 * the SPANNING subspace — the payout-trap menus, where earnings is decoupled from every
 * cost axis (the menu-span rank-2/2 result). On a UNIFORM pool the non-trap picking-stress
 * menus inject a W1 signal and even flip the earnings bias negative, so the deployed
 * argmax estimator loses W3. The leak is still OBSERVABLE where the menus span (positive
 * earnings strength, non-zero Fisher information): the loss is an ESTIMATOR/POOLING
 * artifact, not unobservability. That is precisely what the C2 observability formalisation
 * exploits — read the latent bias on the information-bearing (spanning) subspace.
 *
 * DESIGN-ADEQUACY on planted biases in simulation, NOT evidence about humans. The human
 * pilot is the only test of whether people carry separable leaks at all.
 *
 * No Firebase / browser. Run:  node scripts/stress-chi-identifiability.mjs [--n=120] [--quick]
 */
import {
  buildChiScenarioSet, enumerateLegalBundles, scoreBundle,
  CHI_STARTING_CITY, CHI_CITY_TRAVEL,
} from "../src/lib/chiScenarioDesign.js";
import { diagnose, behavioralBias } from "../src/lib/chiDiagnosis.js";

// --------------------------------------------------------------------------- //
// args                                                                         //
// --------------------------------------------------------------------------- //
const argv = process.argv.slice(2);
const argN = Number((argv.find((a) => a.startsWith("--n=")) || "").slice(4));
const QUICK = argv.includes("--quick");
const N = Number.isFinite(argN) && argN > 0 ? argN : QUICK ? 40 : 120;

// --------------------------------------------------------------------------- //
// rng + feature helpers (mirror simulate-chi-dynamic so the scorer is identical) //
// --------------------------------------------------------------------------- //
const rng = (seed) => { let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0; for (let i = 0; i < 8; i += 1) s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const cross = (f, t, sc) => (CHI_CITY_TRAVEL[f]?.[t] ?? 0) * sc;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x) => `${(x * 100).toFixed(0)}%`.padStart(4);

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

// --------------------------------------------------------------------------- //
// (b) MISSPECIFIED AGGREGATION V — the participant's true value-function SHAPE.  //
// The deployed reward (and the oracle the diagnosis fits against) is always the  //
// ratio earnings/time. These shapes describe an UNBIASED participant's value;    //
// only `ratio` matches the deployed reward, the rest are misspecifications.      //
// --------------------------------------------------------------------------- //
const SHAPES = {
  ratio: { form: "ratio", eExp: 1.0, rho: 1.0, kappa: 1, note: "earnings/time (matches deployed reward)" },
  convexTime: { form: "ratio", eExp: 1.0, rho: 1.6, kappa: 1, note: "over-penalises long bundles (rho 1.6)" },
  concaveTime: { form: "ratio", eExp: 1.0, rho: 0.6, kappa: 1, note: "under-penalises time (rho 0.6)" },
  earnCurve: { form: "ratio", eExp: 0.6, rho: 1.0, kappa: 1, note: "diminishing returns on pay (eExp 0.6)" },
  additive: { form: "additive", eExp: 1.0, rho: 1.0, kappa: 1, note: "kappa*earnings - time (non-ratio)" },
};

// Planted-bias TYPES as multiplicative deviations from each shape's faithful weights.
// payoutOverweight>1 = W3, pickNeglect<1 = W1, local/crossNeglect<1 = nuisance/W2 leaks.
const TYPES = {
  W1: { payoutOverweight: 1.0, pickNeglect: 0.05, localNeglect: 1, crossNeglect: 1 },
  W3: { payoutOverweight: 1.9, pickNeglect: 1.0, localNeglect: 1, crossNeglect: 1 },
  MIX: { payoutOverweight: 1.7, pickNeglect: 0.06, localNeglect: 1, crossNeglect: 1 },
  localNeglect: { payoutOverweight: 1.0, pickNeglect: 1.0, localNeglect: 0.05, crossNeglect: 1 },
  crossNeglect: { payoutOverweight: 1.0, pickNeglect: 1.0, localNeglect: 1, crossNeglect: 0.05 },
  none: { payoutOverweight: 1.0, pickNeglect: 1.0, localNeglect: 1, crossNeglect: 1 },
};

// (a) MEASUREMENT NOISE levels: logit temperature (higher = sharper/argmax) + a uniform
// lapse rate (choose uniformly at random with this probability). Clean -> severe.
const NOISE = [
  { tag: "clean", tau: 14, lapse: 0.0 },
  { tag: "low", tau: 8, lapse: 0.03 },
  { tag: "med", tau: 5, lapse: 0.07 },
  { tag: "high", tau: 3, lapse: 0.15 },
  { tag: "severe", tau: 2, lapse: 0.25 },
];

// The participant's (log-)utility over a bundle under shape + planted bias. Costs are an
// additive time aggregate D; the ratio shapes act on log(earnings) and log(D), the
// additive shape is a linear utility (not a ratio at all). The diagnosis NEVER sees this
// — it only sees the chosen alternative; this is the generative truth we try to recover.
function utility(feat, p, shape) {
  const D = Math.max(0.1, p.pickNeglect * feat.pick + p.crossNeglect * feat.cross + p.localNeglect * feat.local - feat.savings);
  if (shape.form === "additive") return p.payoutOverweight * shape.kappa * feat.earnings - D;
  const eExp = shape.eExp * p.payoutOverweight;
  return eExp * Math.log(Math.max(1e-6, feat.earnings)) - shape.rho * Math.log(D);
}

// Choose with a per-menu STANDARDISED logit (so tau is a comparable rationality knob
// across shapes whose utility scales differ) plus a uniform lapse.
function choose(cands, p, shape, rand, { tau, lapse }) {
  if (rand() < lapse) return cands[Math.floor(rand() * cands.length)];
  const us = cands.map((c) => utility(c.feat, p, shape));
  const mx = Math.max(...us), mn = Math.min(...us);
  const spread = mx - mn || 1;
  const w = us.map((u) => Math.exp(tau * (u - mx) / spread));
  const z = w.reduce((a, b) => a + b, 0); let r = rand() * z;
  for (let i = 0; i < cands.length; i += 1) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}

// One participant plays the unaided pool STATIC (no coaching); returns the tagged choice
// sets so a read can be taken over the full pool OR restricted to the spanning subspace.
function playSets(pool, p, shape, noise, seed) {
  const rand = rng(seed);
  const sets = [];
  for (const sc of pool) {
    const cands = candidatesFor(sc);
    if (cands.length < 2) continue;
    const oracle = argmaxScore(cands);
    const chosen = choose(cands, p, shape, rand, noise);
    sets.push({ round: sc.round, is_trap: sc.is_payout_trap === 1, alternatives: cands.map((c) => ({ features: FEAT(c.feat), chosen: c === chosen, oracle: c === oracle })) });
  }
  return sets;
}

// Estimator variants. `uniform` = the naive pooled read; `recency` = the deployed r25
// re-diagnosis weighting (half-life 3, down-weights the stale Phase-A menus); `trap` =
// restrict to the spanning (payout-trap) subspace where earnings is decoupled from each
// cost axis (the observable subspace the C2 theorem reads). All behavioural-only (no
// survey) so the read is purely the choices + the deployed abstention gate.
function readBy(sets, variant) {
  if (variant === "recency") return diagnose({ choiceSets: sets, surveyResponses: {}, surveyQuestions: [], currentRound: 25, recencyHalfLife: 3 });
  if (variant === "trap") return diagnose({ choiceSets: sets.filter((s) => s.is_trap), surveyResponses: {}, surveyQuestions: [] });
  return diagnose({ choiceSets: sets, surveyResponses: {}, surveyQuestions: [] });
}

// --------------------------------------------------------------------------- //
// run                                                                          //
// --------------------------------------------------------------------------- //
function run() {
  const set = buildChiScenarioSet();
  // The clean diagnostic input the span analysis covers: Phase A diagnostic battery + the
  // same-distribution retention OFF block (both unaided, shift_flag 0).
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  const nTrap = pool.filter((s) => s.is_payout_trap === 1).length;

  console.log(`\nIdentifiability stress test — ${N} participants per (shape x noise x planted-type) cell`);
  console.log(`diagnostic pool: ${pool.length} unaided menus (Phase A battery + retention re-tune block; ${nTrap} payout traps)`);
  console.log("read: deployed diagnose() with NO survey (behavioural fit + abstention gate)\n");

  const seedBase = (shapeKey, typeKey, noiseTag, i) =>
    9001 + i * 17
    + Object.keys(SHAPES).indexOf(shapeKey) * 100003
    + Object.keys(TYPES).indexOf(typeKey) * 7919
    + NOISE.findIndex((x) => x.tag === noiseTag) * 104729;
  const cohortSets = (shapeKey, typeKey, noise) =>
    Array.from({ length: N }, (_, i) => playSets(pool, TYPES[typeKey], SHAPES[shapeKey], noise, seedBase(shapeKey, typeKey, noise.tag, i)));
  const frac = (arr, pred) => (arr.length ? arr.filter(pred).length / arr.length : 0);

  // ------------------------------------------------------------------------- //
  // PART 1 — degradation sweep (naive UNIFORM pooled estimator over the full    //
  // diagnostic input) across shape x noise.                                     //
  // ------------------------------------------------------------------------- //
  console.log("PART 1 — degradation of the naive pooled estimator (uniform read over the full pool)\n");
  console.log("  W3rec  = P(target=W3 | planted W3)        W1rec = P(target=W1 | planted W1)");
  console.log("  safeAbs= P(abstain | should-not-coach: local/cross neglect or unbiased)");
  console.log("  W3@loc = P(target=W3 | LOCAL neglect)     FP@none = P(coach W1/W3 | unbiased)     id(W3)=mean Fisher info\n");
  const cells = {};
  for (const shapeKey of Object.keys(SHAPES)) {
    cells[shapeKey] = {};
    console.log(`SHAPE ${shapeKey.padEnd(12)} (${SHAPES[shapeKey].note})`);
    console.log("  noise    W3rec  W1rec  safeAbs  W3@loc  FP@none   id(W3)");
    for (const noise of NOISE) {
      const w3 = cohortSets(shapeKey, "W3", noise).map((s) => readBy(s, "uniform"));
      const w1 = cohortSets(shapeKey, "W1", noise).map((s) => readBy(s, "uniform"));
      const loc = cohortSets(shapeKey, "localNeglect", noise).map((s) => readBy(s, "uniform"));
      const crs = cohortSets(shapeKey, "crossNeglect", noise).map((s) => readBy(s, "uniform"));
      const non = cohortSets(shapeKey, "none", noise).map((s) => readBy(s, "uniform"));
      const m = {
        W3rec: frac(w3, (d) => d.learning_target === "W3"),
        W1rec: frac(w1, (d) => d.learning_target === "W1"),
        safeAbs: frac([...loc, ...crs, ...non], (d) => d.learning_target === "none"),
        W3loc: frac(loc, (d) => d.learning_target === "W3"),
        FPnone: frac(non, (d) => d.learning_target === "W1" || d.learning_target === "W3"),
        idW3: mean(w3.map((d) => d.identifiability?.W3 ?? 0)),
      };
      cells[shapeKey][noise.tag] = m;
      console.log(`  ${noise.tag.padEnd(7)} ${pct(m.W3rec)}   ${pct(m.W1rec)}   ${pct(m.safeAbs)}    ${pct(m.W3loc)}    ${pct(m.FPnone)}    ${m.idW3.toFixed(1).padStart(5)}`);
    }
    console.log("");
  }

  // ------------------------------------------------------------------------- //
  // PART 2 — subspace decomposition (the C2 bridge). At correct V, the planted   //
  // W3 leak is LOST by the uniform pool but RECOVERED when the read is restricted //
  // to the spanning (trap) subspace — the loss is pooling, not unobservability.   //
  // ------------------------------------------------------------------------- //
  console.log("PART 2 — W3 recovery by estimator/subspace (planted-W3 cohort, correct V = ratio shape)");
  console.log("  uniform = naive pool   recency = deployed r25 weighting (hl 3)   trap = spanning subspace\n");
  console.log("  noise    uniform  recency  trap      (P(target=W3); recency may ABSTAIN = safe-not-recovered)");
  const decomp = {};
  for (const noise of NOISE) {
    const setsW3 = cohortSets("ratio", "W3", noise);
    const u = frac(setsW3.map((s) => readBy(s, "uniform")), (d) => d.learning_target === "W3");
    const r = frac(setsW3.map((s) => readBy(s, "recency")), (d) => d.learning_target === "W3");
    const t = frac(setsW3.map((s) => readBy(s, "trap")), (d) => d.learning_target === "W3");
    const rAbs = frac(setsW3.map((s) => readBy(s, "recency")), (d) => d.learning_target === "none");
    decomp[noise.tag] = { u, r, t, rAbs };
    console.log(`  ${noise.tag.padEnd(7)} ${pct(u)}     ${pct(r)}     ${pct(t)}     (recency abstain ${pct(rAbs)})`);
  }
  console.log("");

  // ------------------------------------------------------------------------- //
  // Findings — where recovery / abstention DEGRADE.                            //
  // ------------------------------------------------------------------------- //
  // ------------------------------------------------------------------------- //
  // PART 3 — V-MISSPECIFICATION (the ICML gate). Does the SIGN of a planted     //
  // payout (W3) leak survive a WRONG value function, and does abstention stop    //
  // false coaching of an UNBIASED participant? Pooled vs SPANNING read.          //
  // ------------------------------------------------------------------------- //
  const lowNoise = NOISE.find((n) => n.tag === "low");
  const w3Bias = (sets, spanningRead) => behavioralBias(sets, { spanningRead }).strengths.W3;
  const SIGN_FLOOR = 0.2; // |earnings-bias| below this = no reliable sign
  const targetOf = (sets, spanningRead) => diagnose({ choiceSets: sets, surveyResponses: {}, surveyQuestions: [], spanningRead }).learning_target;
  const coachesW3W1 = (sets, spanningRead) => { const t = targetOf(sets, spanningRead); return t === "W1" || t === "W3"; };
  console.log("PART 3 — sign-recovery + false-coaching under each misspecified V (noise=low)");
  console.log("  W3sign = P(earnings-bias sign>0 | planted W3)    FP@none = P(coach W1/W3 | UNBIASED)\n");
  console.log("  shape          W3sign:pool span    FP@none:pool span");
  for (const shapeKey of Object.keys(SHAPES)) {
    const w3 = cohortSets(shapeKey, "W3", lowNoise);
    const non = cohortSets(shapeKey, "none", lowNoise);
    const signP = frac(w3, (s) => w3Bias(s, false) > SIGN_FLOOR);
    const signS = frac(w3, (s) => w3Bias(s, true) > SIGN_FLOOR);
    const fpP = frac(non, (s) => coachesW3W1(s, false));
    const fpS = frac(non, (s) => coachesW3W1(s, true));
    console.log(`  ${shapeKey.padEnd(13)} ${pct(signP)} ${pct(signS)}       ${pct(fpP)} ${pct(fpS)}`);
  }
  console.log("");

  // ------------------------------------------------------------------------- //
  // PART 4 — BOUNDARY: how far can the concave-time misspecification go before   //
  // the W3 sign dies / false coaching explodes? (rho 1.0 correct -> 0.4 strong.) //
  // ------------------------------------------------------------------------- //
  console.log("PART 4 — boundary vs concave-time misspecification (spanning read, noise=low)");
  console.log("  rho  |1-rho|  W3sign(span)  FP@none(span)   (rho<1 under-penalises time)");
  const seedR = (rho, typeKey, i) => 41 + i * 13 + Math.round(rho * 1000) * 131 + Object.keys(TYPES).indexOf(typeKey) * 7919;
  for (const rho of [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
    const shape = { form: "ratio", eExp: 1.0, rho, kappa: 1 };
    const w3 = Array.from({ length: N }, (_, i) => playSets(pool, TYPES.W3, shape, lowNoise, seedR(rho, "W3", i)));
    const non = Array.from({ length: N }, (_, i) => playSets(pool, TYPES.none, shape, lowNoise, seedR(rho, "none", i)));
    const sign = frac(w3, (s) => w3Bias(s, true) > SIGN_FLOOR);
    const fp = frac(non, (s) => coachesW3W1(s, true));
    console.log(`  ${rho.toFixed(1)}   ${Math.abs(1 - rho).toFixed(1)}     ${pct(sign)}          ${pct(fp)}`);
  }
  console.log("");

  // ------------------------------------------------------------------------- //
  // PART 5 — V-ROBUST read prototype. Re-estimate the earnings bias against a    //
  // FAMILY of plausible MONOTONE value functions (the analyst's V-uncertainty).  //
  // The bias is REAL only if its sign is consistent across the family; if it      //
  // FLIPS across V it is a value-model artifact -> abstain. Compares to the       //
  // single-V spanning read on W3-coaching (P(target=W3)).                         //
  // ------------------------------------------------------------------------- //
  const Dof = (f) => Math.max(0.1, (f.effective_pick_time_seconds || 0) + (f.cross_city_travel_time_seconds || 0) + (f.local_travel_time_seconds || 0) - (f.shared_item_savings_seconds || 0));
  const mkFamily = (eExps, rhos) => { const fam = []; for (const eExp of eExps) for (const rho of rhos) fam.push((f) => eExp * Math.log(Math.max(1e-6, f.earnings)) - rho * Math.log(Dof(f))); return fam; };
  // WIDE = broad V-uncertainty (strong concave..strong convex); NARROW = plausible-only (near
  // the deployed reward). The earnings bias under each family member's oracle.
  const V_WIDE = mkFamily([0.7, 1.0], [0.6, 0.8, 1.0, 1.2, 1.4]);
  const V_NARROW = mkFamily([0.85, 1.0], [0.8, 0.9, 1.0, 1.1, 1.2]);
  const reflagOracle = (sets, V) => sets.map((s) => {
    const vals = s.alternatives.map((a) => V(a.features));
    let oi = 0; for (let i = 1; i < vals.length; i += 1) if (vals[i] > vals[oi]) oi = i;
    return { round: s.round, is_trap: s.is_trap, alternatives: s.alternatives.map((a, i) => ({ ...a, oracle: i === oi })) };
  });
  const VR_FLOOR = 0.2;
  // Coach the earnings axis only if its sign is robustly positive across the family with NO
  // strong sign-flip (a flip => value-model artifact, not a real leak).
  const vRobustCoachesW3 = (sets, family) => {
    const signs = family.map((V) => behavioralBias(reflagOracle(sets, V), { spanningRead: true }).strengths.W3);
    const pos = signs.filter((s) => s > VR_FLOOR).length;
    const neg = signs.filter((s) => s < -VR_FLOOR).length;
    return neg === 0 && pos === family.length;
  };
  console.log("PART 5 — V-ROBUST read (abstain when the earnings-bias sign is not robust across a V-family).");
  console.log("  P(coach W3): single-V spanning vs V-robust over a WIDE vs a NARROW monotone V-family.\n");
  console.log("  cell                                         single-V    VR-wide   VR-narrow");
  for (const [label, shapeKey, typeKey, want] of [
    ["WELL-SPECIFIED ratio, planted W3 (want HIGH)", "ratio", "W3", "high"],
    ["MISSPEC concaveTime, UNBIASED (want LOW)", "concaveTime", "none", "low"],
    ["MISSPEC additive,   UNBIASED (want LOW)", "additive", "none", "low"],
    ["MISSPEC concaveTime, planted W3 (want HIGH)", "concaveTime", "W3", "high"],
  ]) {
    const sets = cohortSets(shapeKey, typeKey, lowNoise);
    const single = frac(sets, (s) => targetOf(s, true) === "W3");
    const vrW = frac(sets, (s) => vRobustCoachesW3(s, V_WIDE));
    const vrN = frac(sets, (s) => vRobustCoachesW3(s, V_NARROW));
    console.log(`  ${label.padEnd(44)} ${pct(single)}       ${pct(vrW)}      ${pct(vrN)}   [${want}]`);
  }
  console.log("  => the WIDE family cuts false coaching but also abstains genuine leaks; the NARROW family");
  console.log("     keeps recovery but no longer discriminates — payout-overweight is CONFOUNDED with");
  console.log("     time-value-concavity. No V-family read achieves both: identifiable only for near-correct V.");
  console.log("");

  const C = (shape, noise, k) => cells[shape][noise][k];
  console.log("FINDINGS (where the identifiability hook degrades):");
  console.log(`  pooling:   under CORRECT V (ratio) + CLEAN choices, the naive pool recovers W3 only ${pct(C("ratio", "clean", "W3rec"))},`);
  console.log(`             but the spanning (trap) subspace recovers ${pct(decomp.clean.t)} — the picking-stress menus mask the`);
  console.log("             earnings signal (W1 confound). Recovery is an ESTIMATOR/POOLING gap, not unobservability.");
  console.log(`  noise:     on the trap subspace, W3 recovery ${pct(decomp.clean.t)} (clean) -> ${pct(decomp.severe.t)} (severe); W1 recovery (ratio) ${pct(C("ratio", "clean", "W1rec"))} -> ${pct(C("ratio", "severe", "W1rec"))}.`);
  console.log(`             CAVEAT for the C2 bound: the empirical Fisher info id(W3) RISES ${C("ratio", "clean", "idW3").toFixed(1)} -> ${C("ratio", "severe", "idW3").toFixed(1)} under noise (the Hessian`);
  console.log("             inflates as the fit flattens toward uniform), so the raw info proxy is NON-monotone with");
  console.log("             recoverability — the sample-complexity bound must use information at a calibrated operating");
  console.log("             point (or hold-out recovery), not the inflated empirical Hessian.");
  console.log(`  misspec:   at LOW noise, naive-pool W3 recovery by shape: ratio ${pct(C("ratio", "low", "W3rec"))}, convexTime ${pct(C("convexTime", "low", "W3rec"))}, concaveTime ${pct(C("concaveTime", "low", "W3rec"))}, earnCurve ${pct(C("earnCurve", "low", "W3rec"))}, additive ${pct(C("additive", "low", "W3rec"))}.`);
  const fpAdd = Math.max(C("additive", "clean", "FPnone"), C("concaveTime", "clean", "FPnone"));
  console.log(`  safety:    the abstention gate holds at the clean+correct corner (FP@none ${pct(C("ratio", "clean", "FPnone"))}), but a NON-RATIO/`);
  console.log(`             concave-time aggregation drives false coaching of an UNBIASED participant up to ${pct(fpAdd)} — a`);
  console.log("             misspecification the gate cannot catch (their choices genuinely differ from the ratio oracle).");

  // ------------------------------------------------------------------------- //
  // Regression guard (CLEAN + correctly-specified corner only). Asserts ONLY what //
  // is honestly true: planted leaks are recovered where the menus span, nuisance  //
  // neglecters are protected, and noise actually degrades. Off-corner cells are    //
  // REPORTED, never forced (no tuning a sandbox to say YES).                       //
  // ------------------------------------------------------------------------- //
  const cleanRatio = cells.ratio.clean;
  const checks = [
    ["clean+correct V recovers planted W3 on the spanning subspace", decomp.clean.t >= 0.7],
    ["clean+correct V recovers planted W1", cleanRatio.W1rec >= 0.7],
    ["clean+correct V protects single-axis neglecters + unbiased (abstains)", cleanRatio.safeAbs >= 0.6],
    ["clean+correct V does not misdiagnose a LOCAL-neglecter as W3", cleanRatio.W3loc <= 0.15],
    ["clean+correct V does not coach an UNBIASED participant", cleanRatio.FPnone <= 0.25],
    ["the spanning subspace beats the naive pool for W3 (pooling is the gap)", decomp.clean.t >= decomp.clean.u],
    ["noise degrades trap-subspace W3 recovery (severe <= clean)", decomp.severe.t <= decomp.clean.t + 1e-9],
  ];
  console.log("\nregression guard (clean + correctly-specified corner):");
  let ok = true;
  for (const [label, pass] of checks) { console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}`); ok = ok && pass; }

  console.log("\nDESIGN-ADEQUACY ONLY: this stresses whether the menus + estimator separate PLANTED leaks");
  console.log("under choice noise and a wrong value model. It is the empirical face of the identifiability");
  console.log("theorem's degradation, NOT evidence the intervention works on people. The pilot is that test.");
  process.exit(ok ? 0 : 1);
}
run();
