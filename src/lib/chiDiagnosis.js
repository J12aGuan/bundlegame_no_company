/**
 * Runtime cost-blindness diagnosis (CHI dynamic counterfactual-feedback study, Task 3).
 *
 * A faithful JS port of `publishing/data_analysis/analytics_v1/analytics/diagnosis.py`:
 * fit a ridge-regularized conditional (McFadden) logit to the participant's unaided
 * choices over each round's legal choice set, compare the participant's revealed
 * weight DIRECTION to the oracle's over the same sets, and read the signed
 * per-attribute bias. A positive bias on a cost attribute means the participant
 * under-weights (is blind to) that cost.
 *
 *   W1  over-bundling / pick-time neglect   <- bias on effective pick time
 *   W2  route-dispersion / cross-city neglect <- bias on cross-city travel
 *   W3  payout-overweighting                <- bias on earnings
 *
 * Beyond the port this module adds, per the implementation guide:
 *   - survey fusion: the post-Phase-A survey maps to a weak prior over W1/W2/W3
 *     that is blended with the behavioral term (sharper at only 15 rounds);
 *   - dynamic re-diagnosis: re-run on the accumulated unaided choices after each
 *     OFF block so the feedback re-targets what is NOT yet fixed;
 *   - the diagnostic-learning index G_ik(n) (v11 Prop "Optimal diagnostic-exposure
 *     rule"), anchored on the well-identified component (picking, then routing) so
 *     the poorly-identified cross-city weight is not chased.
 *
 * Self-contained (no imports) so it is unit-testable under `node --test`. The
 * conditional logit is fit with Newton's method (K=5, well-conditioned by the
 * ridge) instead of scipy's L-BFGS.
 */

export const FEATURE_COLUMNS = [
  "earnings",
  "effective_pick_time_seconds",
  "cross_city_travel_time_seconds",
  "local_travel_time_seconds",
  "shared_item_savings_seconds",
];

export const WEAKNESS_FEATURE = {
  W1: "effective_pick_time_seconds",
  W2: "cross_city_travel_time_seconds",
  W3: "earnings",
};
export const WEAKNESS_LABEL = {
  W1: "over-bundling / pick-time neglect",
  W2: "route-dispersion / cross-city neglect",
  W3: "payout-overweighting",
  none: "no dominant diagnosed weakness",
};

// Identifiability x realized-loss weight per attribute (the W_k of G_ik). Picking
// is reliably estimated and explains most realized loss; the cross-city weight is
// poorly identified (menus vary cross-city little) so it is de-prioritized.
export const DEFAULT_LEARNING_WEIGHTS = { W1: 1.0, W2: 0.2, W3: 0.6 };
// Coaching targets: picking (W1) then payout (W3). The cross-city weight (W2) is
// poorly identified under the game's menu distribution, so it is reported but
// never chosen as the feedback target (implementation-guide guardrail).
export const DEFAULT_COACHABLE = ["W1", "W3"];

export const DEFAULT_RIDGE = 1.0;
export const DEFAULT_MIN_ROUNDS = 3;
export const DEFAULT_PRIOR_WEIGHT = 0.5;
// Abstention thresholds (see diagnose()): the smallest fused leak worth coaching, and
// how much an uncoachable dominant (cross-city) must exceed the best coachable leak
// before we abstain rather than coach a side-signal.
export const ABSTAIN_MIN_LEAK = 0.2;
export const ABSTAIN_DOMINANCE_MARGIN = 1.5;

// --------------------------------------------------------------------------- //
// Small linear algebra (K is tiny: the 5 feature columns).                     //
// --------------------------------------------------------------------------- //
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let piv = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) continue; // singular column; leave as-is (ridge guards this)
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = col; j <= n; j += 1) M[col][j] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = col; j <= n; j += 1) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0));

function softmax(v) {
  const m = Math.max(...v);
  const ex = v.map((x) => Math.exp(x - m));
  const z = ex.reduce((s, x) => s + x, 0);
  return ex.map((x) => x / z);
}

// --------------------------------------------------------------------------- //
// Choice-set standardization (z-score features over the pool, like diagnosis.py).
// A "row set" is { X: number[][] (n_alt x k), chosenIndex }.                    //
// --------------------------------------------------------------------------- //
function toMatrixSets(choiceSets, target, cols) {
  // Gather every alternative's feature vector to compute pool mean/std.
  const all = [];
  for (const cs of choiceSets) for (const alt of cs.alternatives) all.push(cols.map((c) => Number(alt.features?.[c]) || 0));
  const k = cols.length;
  const mean = new Array(k).fill(0);
  for (const row of all) for (let j = 0; j < k; j += 1) mean[j] += row[j];
  if (all.length) for (let j = 0; j < k; j += 1) mean[j] /= all.length;
  const std = new Array(k).fill(0);
  for (const row of all) for (let j = 0; j < k; j += 1) std[j] += (row[j] - mean[j]) ** 2;
  for (let j = 0; j < k; j += 1) std[j] = Math.sqrt(all.length ? std[j] / all.length : 1) || 1;
  for (let j = 0; j < k; j += 1) if (std[j] < 1e-9) std[j] = 1;

  const sets = [];
  for (const cs of choiceSets) {
    const alts = cs.alternatives;
    if (!Array.isArray(alts) || alts.length < 2) continue;
    let chosenIndex = alts.findIndex((a) => a[target]);
    if (chosenIndex < 0) continue; // target not in the legal set -> skip the round
    const X = alts.map((a) => cols.map((c, j) => ((Number(a.features?.[c]) || 0) - mean[j]) / std[j]));
    sets.push({ X, chosenIndex, round: cs.round });
  }
  return sets;
}

// Recency weight per choice set: an exponential half-life over the round index, so a
// re-diagnosis emphasizes the most recent (post-coaching) unaided rounds rather than
// letting the long Phase A diagnostic battery dominate the accumulated fit. With an
// infinite half-life (the default) every set has weight 1 (uniform, unchanged).
function applyRecencyWeights(sets, currentRound, halfLife) {
  if (!Number.isFinite(halfLife) || halfLife <= 0 || !Number.isFinite(Number(currentRound))) return;
  for (const s of sets) {
    const r = Number(s.round);
    s.weight = Number.isFinite(r) ? Math.pow(0.5, Math.max(0, Number(currentRound) - r) / halfLife) : 1;
  }
}

// --------------------------------------------------------------------------- //
// Conditional logit (Newton).                                                  //
// --------------------------------------------------------------------------- //
function fitConditionalLogit(sets, k, ridge = DEFAULT_RIDGE, maxIter = 50) {
  let beta = new Array(k).fill(0);
  let lastH = null;
  for (let iter = 0; iter < maxIter && sets.length; iter += 1) {
    const g = beta.map((b) => ridge * b);
    const H = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? ridge : 0)));
    for (const { X, chosenIndex, weight = 1 } of sets) {
      const v = X.map((row) => dot(row, beta));
      const p = softmax(v);
      const meanX = new Array(k).fill(0);
      for (let a = 0; a < X.length; a += 1) for (let j = 0; j < k; j += 1) meanX[j] += p[a] * X[a][j];
      for (let j = 0; j < k; j += 1) g[j] -= weight * (X[chosenIndex][j] - meanX[j]);
      for (let a = 0; a < X.length; a += 1) {
        for (let i = 0; i < k; i += 1) for (let j = 0; j < k; j += 1) H[i][j] += weight * p[a] * X[a][i] * X[a][j];
      }
      for (let i = 0; i < k; i += 1) for (let j = 0; j < k; j += 1) H[i][j] -= weight * meanX[i] * meanX[j];
    }
    lastH = H;
    const step = solveLinear(H, g);
    beta = beta.map((b, j) => b - step[j]);
    if (norm(step) < 1e-8) break;
  }
  // Per-axis data INFORMATION = the regularized-logit Hessian diagonal minus the ridge
  // prior: the choice-probability-weighted within-menu variance of each feature over the
  // (recency-weighted) rounds. Low information => that axis is poorly identified (the
  // menus/choices barely constrain its weight), which the diagnosis uses to abstain
  // rather than coach a possibly-misread axis.
  const info = new Array(k).fill(0);
  if (lastH) for (let j = 0; j < k; j += 1) info[j] = Math.max(0, lastH[j][j] - ridge);
  return { beta, info };
}

function direction(beta) {
  const n = norm(beta);
  return n > 1e-8 ? beta.map((b) => b / n) : beta.slice();
}

// --------------------------------------------------------------------------- //
// Spanning-subspace (observability) restriction — the C2 estimator fix.         //
// The pooled read pools picking-stress menus where the highest-PAYING bundle is  //
// also the most pick-COSTLY (the over-bundle), so a payout-overweighter's choice  //
// is observationally identical to a pick-neglecter's: earnings is collinear with  //
// pick and the W3 leak is mis-read as W1 (see docs/IDENTIFIABILITY_THEORY.md §6   //
// and scripts/demo-observability.mjs). A menu IDENTIFIES the earnings axis (spans  //
// earnings x pick) exactly when its highest-paying candidate is NOT its most       //
// pick-costly one — true on the payout traps (the high-pay bundle is a fast        //
// singleton), false on the picking-stress over-bundle menus. Reading the bias on   //
// the identifying subset recovers a payout leak as W3 from BEHAVIOR alone.        //
const PICK_FEATURE = "effective_pick_time_seconds";
function medianOf(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function menuIdentifiesEarnings(alternatives = []) {
  if (!Array.isArray(alternatives) || alternatives.length < 2) return false;
  const picks = alternatives.map((a) => Number(a.features?.[PICK_FEATURE]) || 0);
  let eMax = -Infinity, eIdx = 0;
  alternatives.forEach((a, i) => { const e = Number(a.features?.earnings) || 0; if (e > eMax) { eMax = e; eIdx = i; } });
  // Earnings is identified (decoupled from pick) when the highest-PAYING option is NOT among
  // the high-PICK options — its pick is at or below the menu median. On a payout trap the
  // top-payer is a fast singleton (low pick); on a picking-stress over-bundle menu the
  // top-payer is the most pick-costly (above median, so earnings is confounded with pick).
  // Constant pick (no over-bundle confound) is trivially identifying (pick == median).
  return picks[eIdx] <= medianOf(picks) + 1e-9;
}

// --------------------------------------------------------------------------- //
// Behavioral bias = direction(participant) - direction(oracle).                //
// With `spanningRead`, the fit is restricted to the earnings-identifying        //
// (observable) menus when enough exist, so a payout leak is not confounded with  //
// picking; otherwise it falls back to the full pool (back-compat / small n).     //
// --------------------------------------------------------------------------- //
export function behavioralBias(choiceSets, { ridge = DEFAULT_RIDGE, cols = FEATURE_COLUMNS, currentRound = null, recencyHalfLife = Infinity, spanningRead = false, minSpanning = DEFAULT_MIN_ROUNDS } = {}) {
  let usedSets = choiceSets;
  let spanning_n = null;
  let spanning_used = false;
  if (spanningRead && Array.isArray(choiceSets)) {
    const identifying = choiceSets.filter((cs) => menuIdentifiesEarnings(cs?.alternatives));
    spanning_n = identifying.length;
    if (identifying.length >= minSpanning) { usedSets = identifying; spanning_used = true; }
  }
  const chosenSets = toMatrixSets(usedSets, "chosen", cols);
  const oracleSets = toMatrixSets(usedSets, "oracle", cols);
  applyRecencyWeights(chosenSets, currentRound, recencyHalfLife);
  applyRecencyWeights(oracleSets, currentRound, recencyHalfLife);
  const k = cols.length;
  const fitW = fitConditionalLogit(chosenSets, k, ridge);
  const fitO = fitConditionalLogit(oracleSets, k, ridge);
  const dirW = direction(fitW.beta);
  const dirO = direction(fitO.beta);
  const bias = {};
  cols.forEach((c, i) => { bias[c] = dirW[i] - dirO[i]; });
  const strengths = {};
  // Per-weakness identifiability from the PARTICIPANT fit's per-axis information.
  const identifiability = {};
  for (const [w, feat] of Object.entries(WEAKNESS_FEATURE)) {
    strengths[w] = bias[feat] ?? 0;
    identifiability[w] = fitW.info[cols.indexOf(feat)] ?? 0;
  }
  return { bias, strengths, identifiability, n_rounds: chosenSets.length, spanning_n, spanning_used };
}

// --------------------------------------------------------------------------- //
// Survey prior over W1/W2/W3 from the post-Phase-A strategy items.             //
// --------------------------------------------------------------------------- //
export function surveyPrior(responses = {}, questions = []) {
  const prior = { W1: 0, W2: 0, W3: 0 };
  let confidence = null;
  for (const q of questions) {
    const raw = responses[q.id];
    if (raw == null) continue;
    const min = Number(q.min ?? 1);
    const max = Number(q.max ?? 5);
    const mid = (min + max) / 2;
    const half = (max - min) / 2 || 1;
    const signed = ((Number(raw) - mid) / half) * (q.reverse ? -1 : 1); // ~[-1, 1]
    if (q.maps_to === "confidence") confidence = (Number(raw) - min) / (max - min || 1);
    else if (prior[q.maps_to] !== undefined) prior[q.maps_to] += signed;
  }
  return { prior, confidence };
}

// --------------------------------------------------------------------------- //
// Fuse behavioral strengths with the survey prior; pick the dominant weakness.  //
// --------------------------------------------------------------------------- //
export function fuseDiagnosis(strengths = {}, prior = {}, { priorWeight = DEFAULT_PRIOR_WEIGHT, threshold = 0 } = {}) {
  const fused = {};
  for (const w of ["W1", "W2", "W3"]) fused[w] = (strengths[w] ?? 0) + priorWeight * (prior[w] ?? 0);
  const ranked = Object.entries(fused).sort((a, b) => b[1] - a[1]);
  const [domW, domV] = ranked[0];
  const dominant = domV > threshold ? domW : "none";
  const second = ranked[1] ? ranked[1][1] : 0;
  const denom = Math.abs(domV) + 1e-9;
  const confidence = dominant === "none" ? 0 : Math.max(0, Math.min(1, (domV - second) / denom));
  // Residual = the fused strengths that remain after removing the dominant leak.
  const residual = { ...fused };
  if (dominant !== "none") delete residual[dominant];
  return {
    strengths_fused: fused,
    dominant_weakness: dominant,
    dominant_label: WEAKNESS_LABEL[dominant],
    residual,
    residual_strength: ranked[1] ? Math.max(0, ranked[1][1]) : 0,
    confidence,
  };
}

// Per-attribute IMPORTANCE (realized-loss weight), separated from identifiability.
// Picking and payout are equally important to the rate; the cross-city weight matters
// less under the game's menu distribution. When MEASURED identifiability is supplied,
// the effective weight is importance x identifiability (so a now well-identified payout
// leak competes fairly with picking); without it, the fixed prior weights are used.
export const DEFAULT_IMPORTANCE = { W1: 1.0, W2: 0.4, W3: 1.0 };

// --------------------------------------------------------------------------- //
// Diagnostic-learning index G_ik(n): teach the coachable component with the     //
// largest importance x identifiability-weighted squared leak. Deployable proxy  //
// for v11's G_ik(n) = W_k (a_k - h_ik,0)^2 [phi_k(n)^2 - phi_k(n+1)^2]: the      //
// squared current bias stands in for (a_k - h)^2; W_k = importance x phi (the    //
// measured per-axis identifiability), so a leak the data cannot pin is not       //
// chased. See docs/MODEL_NOTES.md for the approximation and its limits.          //
// --------------------------------------------------------------------------- //
export function learningIndex(strengths = {}, {
  weights = DEFAULT_LEARNING_WEIGHTS,
  coachable = DEFAULT_COACHABLE,
  identifiability = null,
  importance = DEFAULT_IMPORTANCE,
} = {}) {
  // Effective per-axis weight. With measured identifiability: importance x normalized
  // identifiability (normalized over coachable axes). Without it: the fixed prior weights
  // (backward compatible — callers that pass only strengths are unaffected).
  let eff;
  if (identifiability) {
    const maxId = Math.max(1e-9, ...coachable.map((w) => identifiability[w] ?? 0));
    eff = {};
    for (const w of ["W1", "W2", "W3"]) eff[w] = (importance[w] ?? 0) * ((identifiability[w] ?? 0) / maxId);
  } else {
    eff = weights;
  }
  const G = {};
  for (const w of ["W1", "W2", "W3"]) {
    const s = Math.max(0, strengths[w] ?? 0); // only positive (under-weighting) leaks are teachable
    G[w] = (eff[w] ?? 0) * s * s;
  }
  // The feedback target is the largest learning index among coachable attributes;
  // the poorly-identified cross-city weight is excluded from candidacy.
  const ranked = Object.entries(G)
    .filter(([w]) => coachable.includes(w))
    .sort((a, b) => b[1] - a[1]);
  const target = ranked[0] && ranked[0][1] > 0 ? ranked[0][0] : "none";
  return { G, target, target_label: WEAKNESS_LABEL[target] };
}

// --------------------------------------------------------------------------- //
// Top-level diagnosis (behavioral fit fused with the survey + learning target).
// Call repeatedly on the ACCUMULATED unaided choice sets to re-diagnose.         //
// --------------------------------------------------------------------------- //
export function diagnose({
  choiceSets = [],
  surveyResponses = {},
  surveyQuestions = [],
  priorWeight = DEFAULT_PRIOR_WEIGHT,
  ridge = DEFAULT_RIDGE,
  minRounds = DEFAULT_MIN_ROUNDS,
  currentRound = null,
  recencyHalfLife = Infinity,
  spanningRead = true,
} = {}) {
  // Read the bias on the earnings-identifying (observable) subspace so a payout leak is
  // recovered as W3 from behavior rather than confounded with picking (C2 estimator fix).
  const behavioral = behavioralBias(choiceSets, { ridge, currentRound, recencyHalfLife, spanningRead });
  const { prior, confidence: surveyConfidence } = surveyPrior(surveyResponses, surveyQuestions);

  if (behavioral.n_rounds < minRounds) {
    // Too few rounds: fall back to the survey prior alone (still better than nothing).
    const fused = fuseDiagnosis({ W1: 0, W2: 0, W3: 0 }, prior, { priorWeight: 1 });
    return {
      signed_bias: behavioral.bias,
      strengths: fused.strengths_fused,
      dominant_weakness: fused.dominant_weakness,
      dominant_label: fused.dominant_label,
      residual: fused.residual,
      learning_target: learningIndex(fused.strengths_fused).target,
      confidence: 0,
      survey_confidence: surveyConfidence,
      n_rounds: behavioral.n_rounds,
      from_survey_only: true,
    };
  }

  const fused = fuseDiagnosis(behavioral.strengths, prior, { priorWeight });
  const learning = learningIndex(fused.strengths_fused, { identifiability: behavioral.identifiability });

  // ABSTENTION GATE — do not coach a possibly-misidentified axis; fall back to the
  // UNtargeted marginal move (learning_target "none" leaves the marginal arm showing
  // the true best one-step move and the component arm a generic message). Abstain when:
  //  (a) the best coachable leak is below the noise floor (near-zero real leak), or
  //  (b) the dominant leak is an UNCOACHABLE axis (cross-city W2) that clearly exceeds
  //      the best coachable leak (a single-axis cost neglect that should not be read as
  //      payout-overweighting). This is what stops the heterogeneous traps from
  //      occasionally coaching a local/cross-neglecter on payout.
  let learning_target = learning.target;
  let abstained = false;
  let abstain_reason = null;
  if (learning_target !== "none") {
    const dom = fused.dominant_weakness;
    const bestLeak = Math.max(0, fused.strengths_fused[learning_target] ?? 0);
    const domLeak = Math.max(0, fused.strengths_fused[dom] ?? 0);
    if (bestLeak < ABSTAIN_MIN_LEAK) { abstained = true; abstain_reason = "leak_below_noise_floor"; }
    else if (!DEFAULT_COACHABLE.includes(dom) && domLeak > bestLeak * ABSTAIN_DOMINANCE_MARGIN) {
      abstained = true; abstain_reason = "dominant_leak_is_uncoachable";
    }
    if (abstained) learning_target = "none";
  }

  return {
    signed_bias: behavioral.bias,
    strengths: fused.strengths_fused,
    dominant_weakness: fused.dominant_weakness,
    dominant_label: fused.dominant_label,
    residual: fused.residual,
    residual_strength: fused.residual_strength,
    // The feedback coaches the learning target (well-identified + above the noise
    // floor); "none" means the diagnosis abstained and the feedback stays untargeted.
    learning_target,
    learning_index: learning.G,
    identifiability: behavioral.identifiability,
    abstained,
    abstain_reason,
    confidence: fused.confidence,
    survey_confidence: surveyConfidence,
    n_rounds: behavioral.n_rounds,
    // Observability transparency: how many menus identified the earnings axis and whether
    // the read was restricted to that spanning subspace (vs the full pool).
    spanning_n: behavioral.spanning_n,
    spanning_used: behavioral.spanning_used,
    from_survey_only: false,
  };
}
