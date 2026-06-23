/**
 * Sign-survival gate (CHI dynamic-protocol robustness layer).
 *
 * A server-side robustness layer on the cost-blindness diagnosis. It does NOT touch the
 * menus. Before the dynamic ("marginal") arm coaches a component, the gate re-scores the
 * participant's diagnostic-block choices under a FROZEN grid of scoring assumptions and
 * coaches a component only if its signed attribution keeps the same sign across the whole
 * grid AND its bootstrap worst case clears a floor. Otherwise it emits `no_target` and the
 * personalized arm falls back to the non-personalized counterfactual rendering for the block.
 *
 * NOTE ON PROVENANCE: the referenced spec `SIGN_SURVIVAL_GATE.md` is not present in this
 * repo. This implements the five pieces exactly as written in the task description; the exact
 * attribution formula below is a faithful, internally-consistent reconstruction pinned by the
 * four planted-worker acceptance tests (tests/js/sign-survival-gate.test.mjs). If a canonical
 * Part 2 differs in the attribution algebra, reconcile here; the gate STRUCTURE (frozen grid,
 * standardized signed attribution, bootstrap worst-case, sign-constancy + floor, no_target
 * fallback, deterministic) is the contract.
 *
 * The five pieces:
 *   1. Frozen scoring grid (one config constant): gamma in {0.25,0.5,1.0}, rho in {0,0.2,0.4};
 *      the nominal scoring (1.0, 0) IS a grid point. Parameterized scorer:
 *        pick_gamma = raw_pick - gamma*savings   (raw_pick = effective_pick + savings)
 *        score      = earnings / (pick_gamma + local + cross)
 *        V          = score^(1 - rho)
 *   2. Standardized signed attribution beta_k(V) per coachable component (pick=W1, earnings=W3;
 *      cross=W2 logged, never coached) over the diagnostic-block rounds, divided by the
 *      component's global SD.
 *   3. Bootstrap worst case: resample the diagnostic rounds B=120 times; per resample take the
 *      min and max of beta_k over the grid; form the 95% interval of those worst-case values.
 *   4. Gate: coach k only if its sign is constant across the whole grid AND its worst-case
 *      interval clears +/- floor (config, start 0.15 SD units). Pick the passing component with
 *      the largest robust magnitude; otherwise no_target.
 *   5. no_target: deterministic fallback to the non-personalized counterfactual rendering.
 *
 * Layered on the diagnosis: the attribution is read on the earnings-IDENTIFYING (spanning)
 * menus, the same observable subspace the deployed diagnosis uses (chiDiagnosis spanningRead),
 * so a strong payout-chaser's W3 leak is not confounded with the W1 over-bundling symptom it
 * also produces. `menuIdentifiesEarnings` is the canonical observability test (imported, not
 * re-derived). Otherwise pure.
 */
import { menuIdentifiesEarnings } from "./chiDiagnosis.js";

// ----- Piece 1: the frozen scoring grid (the ONE config constant) ----------------------- //
export const SIGN_SURVIVAL_GATE = {
  grid: {
    gamma: [0.25, 0.5, 1.0], // shared-pick-saving credit; nominal credits the full saving
    rho: [0, 0.2, 0.4], // value concavity V = score^(1-rho); nominal is risk-neutral
  },
  nominal: { gamma: 1.0, rho: 0 }, // MUST be a grid point (it is: 1.0 in gamma, 0 in rho)
  floor: 0.15, // robust-magnitude floor, in component-SD units. Calibrate on the pilot, then FREEZE.
  alpha: 0.05, // -> 95% interval of the bootstrap worst-case values
  bootstrap: 120, // B resamples
  seed: 0x5f3759df, // fixed -> the bootstrap is deterministic (no tuning on real data)
  coachable: ["W1", "W3"], // pick (W1), earnings (W3). cross (W2) is logged, never coached.
};

// Coachable/logged component -> the feature it reads.
const COMPONENT_FEATURE = {
  W1: "effective_pick_time_seconds",
  W3: "earnings",
  W2: "cross_city_travel_time_seconds",
};
const ALL_COMPONENTS = ["W1", "W3", "W2"];
const EPS = 1e-9;

const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// ----- Piece 1: the parameterized scorer ------------------------------------------------ //
// raw_pick = effective_pick + savings, so at nominal gamma=1 pick_gamma = effective_pick.
function pickGamma(f, gamma) {
  const rawPick = num(f.effective_pick_time_seconds) + num(f.shared_item_savings_seconds);
  return rawPick - gamma * num(f.shared_item_savings_seconds);
}
function totalTime(f, gamma) {
  return pickGamma(f, gamma) + num(f.local_travel_time_seconds) + num(f.cross_city_travel_time_seconds);
}
function scoreOf(f, gamma) {
  const t = totalTime(f, gamma);
  return t > EPS ? num(f.earnings) / t : 0;
}
function valueV(f, gamma, rho) {
  const s = scoreOf(f, gamma);
  return s > 0 ? Math.pow(s, 1 - rho) : 0;
}
// The signed component value entering the attribution (pick uses pick_gamma under the grid).
function componentValue(f, k, gamma) {
  if (k === "W1") return pickGamma(f, gamma);
  if (k === "W3") return num(f.earnings);
  return num(f.cross_city_travel_time_seconds); // W2
}

function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
}

// ----- Piece 2: standardized signed attribution beta_k(V) at one grid point ------------- //
// Sign convention: positive = the participant systematically chose MORE of component k than the
// V-optimal bundle. For a cost (pick/cross) that is neglect; for earnings that is overweighting.
// rho enters as a per-round value weight (concavity emphasizes low-rate rounds); gamma enters via
// pick_gamma. The signed per-round deviation is divided by the component's pooled global SD.
function betaAt(rounds, gamma, rho) {
  const pooled = { W1: [], W3: [], W2: [] };
  for (const r of rounds) for (const a of r.alternatives) {
    for (const k of ALL_COMPONENTS) pooled[k].push(componentValue(a.features, k, gamma));
  }
  const sd = {};
  for (const k of ALL_COMPONENTS) sd[k] = Math.max(EPS, stddev(pooled[k]));

  const acc = { W1: 0, W3: 0, W2: 0 };
  let wsum = 0;
  for (const r of rounds) {
    const alts = r.alternatives;
    let vopt = alts[0];
    let chosen = null;
    for (const a of alts) {
      if (valueV(a.features, gamma, rho) > valueV(vopt.features, gamma, rho)) vopt = a;
      if (a.chosen) chosen = a;
    }
    if (!chosen) continue;
    const w = Math.pow(Math.max(EPS, scoreOf(chosen.features, gamma)), -rho); // rho=0 -> 1 (uniform)
    wsum += w;
    for (const k of ALL_COMPONENTS) {
      acc[k] += w * (componentValue(chosen.features, k, gamma) - componentValue(vopt.features, k, gamma));
    }
  }
  const beta = {};
  for (const k of ALL_COMPONENTS) beta[k] = wsum > 0 ? acc[k] / wsum / sd[k] : 0;
  return beta;
}

function gridPoints(grid) {
  const out = [];
  for (const gamma of grid.gamma) for (const rho of grid.rho) out.push({ gamma, rho });
  return out;
}

// ----- deterministic PRNG + bootstrap helpers ------------------------------------------- //
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function resample(rounds, rng) {
  const n = rounds.length;
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) out[i] = rounds[Math.floor(rng() * n)];
  return out;
}
function percentile(xs, p) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

// ----- Pieces 3 + 4: bootstrap worst-case + the gate ------------------------------------ //
/**
 * Run the sign-survival gate over the diagnostic-block choice sets. Each choice set is
 * `{ round, alternatives: [{ features:{...}, chosen:bool }] }` (the same shape the diagnosis
 * consumes). Returns the full decision object; `chosen_target` is "W1" | "W3" | "no_target".
 */
export function signSurvivalGate(choiceSets, config = SIGN_SURVIVAL_GATE) {
  const usable = (choiceSets || []).filter(
    (cs) => Array.isArray(cs?.alternatives) && cs.alternatives.length >= 2 && cs.alternatives.some((a) => a.chosen),
  );
  // Read the attribution on the earnings-identifying (spanning) menus so the payout leak is not
  // confounded with the over-bundling symptom; fall back to the full set when too few identify.
  const identifying = usable.filter((cs) => menuIdentifiesEarnings(cs.alternatives));
  const rounds = identifying.length >= (config.minSpanning ?? 3) ? identifying : usable;
  const spanning_used = rounds === identifying;
  const grid = gridPoints(config.grid);
  const beta_nominal = betaAt(rounds, config.nominal.gamma, config.nominal.rho);

  // Point-estimate beta over the full sample at every grid point (for the sign-constancy test).
  const pointBeta = grid.map((g) => betaAt(rounds, g.gamma, g.rho));

  // Piece 3: bootstrap. Per resample, the worst case over the grid is the min and the max of
  // beta_k; the 95% interval of those worst-case values is [pctile(mins, 2.5), pctile(maxs, 97.5)].
  const rng = mulberry32(config.seed);
  const mins = { W1: [], W3: [], W2: [] };
  const maxs = { W1: [], W3: [], W2: [] };
  for (let b = 0; b < config.bootstrap; b += 1) {
    const sample = resample(rounds, rng);
    const perK = { W1: [], W3: [], W2: [] };
    for (const g of grid) {
      const bt = betaAt(sample, g.gamma, g.rho);
      for (const k of ALL_COMPONENTS) perK[k].push(bt[k]);
    }
    for (const k of ALL_COMPONENTS) {
      mins[k].push(Math.min(...perK[k]));
      maxs[k].push(Math.max(...perK[k]));
    }
  }

  // Piece 4: per-component gate decision.
  const per_component = {};
  for (const k of ALL_COMPONENTS) {
    const signs = pointBeta.map((b) => Math.sign(b[k]));
    const sign = signs[0];
    const sign_constant = sign !== 0 && signs.every((s) => s === sign);
    const wcLo = percentile(mins[k], (config.alpha / 2) * 100); // 2.5th pct of per-resample worst-case mins
    const wcHi = percentile(maxs[k], (1 - config.alpha / 2) * 100); // 97.5th pct of per-resample worst-case maxes
    // "Clears +/- floor": for a positive sign the whole worst-case interval sits above +floor
    // (wcLo > floor); for a negative sign it sits below -floor (wcHi < -floor).
    let clears_floor = false;
    let robust_magnitude = 0;
    if (sign > 0) {
      clears_floor = wcLo > config.floor;
      robust_magnitude = wcLo;
    } else if (sign < 0) {
      clears_floor = wcHi < -config.floor;
      robust_magnitude = -wcHi;
    }
    const coachable = config.coachable.includes(k);
    per_component[k] = {
      beta_nominal: beta_nominal[k],
      worst_case: [wcLo, wcHi],
      sign_constant,
      sign,
      clears_floor,
      robust_magnitude,
      pass: coachable && sign_constant && clears_floor,
    };
  }

  // Pick the passing coachable component with the largest robust magnitude; else no_target.
  let chosen_target = "no_target";
  let bestMag = -Infinity;
  for (const k of config.coachable) {
    if (per_component[k].pass && per_component[k].robust_magnitude > bestMag) {
      bestMag = per_component[k].robust_magnitude;
      chosen_target = k;
    }
  }

  return {
    chosen_target,
    beta_nominal,
    per_component,
    grid: {
      gamma: config.grid.gamma,
      rho: config.grid.rho,
      nominal: config.nominal,
      floor: config.floor,
      alpha: config.alpha,
      bootstrap: config.bootstrap,
    },
    n_rounds: rounds.length,
    spanning_used,
    spanning_n: identifying.length,
  };
}

// ----- Piece 5: the deterministic no_target fallback ------------------------------------ //
/** The robust coaching target as a weakness id, or null (no_target -> counterfactual rendering). */
export function gatedTargetWeakness(decision) {
  const t = decision?.chosen_target;
  return t === "W1" || t === "W3" ? t : null;
}

/** True when the gate found no robust target (the marginal arm must fall back to counterfactual). */
export function isNoTarget(decision) {
  return !decision || decision.chosen_target === "no_target";
}

/**
 * Compact, Firestore-friendly view of the gate decision for the per-decision round-action log.
 * These are the fields that must be on the round-action allowlist (chosen target, beta at
 * nominal, per-component worst-case bounds + pass/fail, and the frozen grid/floor/alpha) or the
 * write is rejected by `hasOnly` and silently fails to persist.
 */
export function gateDecisionForLog(decision) {
  if (!decision) return null;
  const pc = decision.per_component || {};
  const compact = {};
  for (const k of ALL_COMPONENTS) {
    compact[k] = {
      beta_nominal: round4(pc[k]?.beta_nominal ?? 0),
      worst_case: [round4(pc[k]?.worst_case?.[0] ?? 0), round4(pc[k]?.worst_case?.[1] ?? 0)],
      pass: Boolean(pc[k]?.pass),
    };
  }
  return {
    chosen_target: decision.chosen_target ?? "no_target",
    components: compact,
    grid: decision.grid,
  };
}

function round4(x) {
  return Math.round(num(x) * 1e4) / 1e4;
}

export { COMPONENT_FEATURE };
