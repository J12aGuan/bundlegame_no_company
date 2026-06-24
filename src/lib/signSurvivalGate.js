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
 * SCORER ALIGNMENT: the gate's NOMINAL scoring is identical to the study's oracle/regret
 * scorer `chiScenarioDesign.scoreBundle` (which bundle.js uses to define is_oracle and to
 * score at runtime): time = pick + local + cross - shared_item_savings, score = earnings/time,
 * where shared_item_savings = 0.25*(shared-store pick). The frozen grid has THREE axes, each a
 * CREDIT on the study's baked saving (NOT a raw multiple of group pick):
 *   - savings credit (on shared_item_savings_seconds): {0.25, 0.5, 1.0}; nominal 1.0 = the study rule.
 *   - local-travel credit (on shared_store_local_seconds): {0, 0.25}; nominal 0 = the study rule.
 *   - value curvature rho: {0, 0.2, 0.4}; nominal 0.
 * The nominal grid point (savings 1.0, local 0, rho 0) reproduces scoreBundle exactly. Lower savings
 * credits model "bundling saves less than assumed" (so over-bundling is MORE wrong); the local credit
 * models a hypothetical within-store local-travel saving; curvature is V = score^(1-rho).
 *
 * beta_k(V): standardized signed excess per coachable component (pick=W1, earnings=W3; cross=W2
 * logged, never coached) = mean over diagnostic rounds of (chosen_k - oracle_k under V) divided by
 * the component's global SD, where the oracle under V is the V-optimal bundle. This matches the
 * spec's unweighted-mean form. NOTE: because V is a monotone transform of score, the V-optimal is
 * rho-invariant, so the rho axis does not move beta_k (it is kept for completeness); the savings and
 * local rates DO move the oracle and therefore beta_k.
 *
 * Layered on the diagnosis: the attribution is read on the earnings-IDENTIFYING (spanning) menus,
 * the same observable subspace the deployed diagnosis uses, so a strong payout-chaser's W3 leak is
 * not confounded with the W1 over-bundling symptom it also produces (`menuIdentifiesEarnings`).
 */
import { menuIdentifiesEarnings } from "./chiDiagnosis.js";

// ----- The frozen scoring grid (the ONE config constant) -------------------------------- //
export const SIGN_SURVIVAL_GATE = {
  grid: {
    savings: [0.25, 0.5, 1.0], // CREDIT on the baked shared_item_savings; the study rule is 1.0
    local: [0, 0.25], // CREDIT on the within-store local travel; the study rule is 0
    rho: [0, 0.2, 0.4], // value concavity V = score^(1-rho); the study rule is 0
  },
  nominal: { savings: 1.0, local: 0, rho: 0 }, // == the study's scoreBundle scorer
  floor: 0.15, // robust-magnitude floor, in component-SD units. Calibrate on the pilot, then FREEZE.
  alpha: 0.05, // -> 95% interval of the bootstrap worst-case values
  bootstrap: 120, // B resamples
  seed: 0x5f3759df, // fixed -> the bootstrap is deterministic (no tuning on real data)
  coachable: ["W1", "W3"], // pick (W1), earnings (W3). cross (W2) + local (Wlocal) logged, never coached.
  minSpanning: 3, // restrict to earnings-identifying menus when at least this many exist
  // DUAL-AXIS ABSTENTION: cross-city (W2) and local travel (Wlocal) are uncoachable nuisance axes.
  // The menu set cannot structurally separate payout from all three cost axes, so the gate REFUSES to
  // coach W3 (payout) whenever a robust NEGLECT signal on EITHER local OR cross-city reaches at least
  // rivalRatio of W3's worst-case robust magnitude -- a pure local- or cross-neglecter is then
  // observationally a payout-overweighter, and coaching W3 would be spurious. ONE constant; confirm
  // on the pilot, then freeze.
  rivalRatio: 0.75,
};

const COMPONENT_FEATURE = { W1: "effective_pick_time_seconds", W3: "earnings", W2: "cross_city_travel_time_seconds", Wlocal: "local_travel_time_seconds" };
const ALL_COMPONENTS = ["W1", "W3", "W2", "Wlocal"];
const EPS = 1e-9;
const num = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

// ----- The parameterized scorer (nominal == scoreBundle) -------------------------------- //
// savings/local are CREDITS on the study's baked saving features: at savings credit 1.0 the full
// shared_item_savings is subtracted (== scoreBundle); lower credits subtract less.
function timeUnder(f, savingsCredit, localCredit) {
  const pick = num(f.effective_pick_time_seconds);
  const local = num(f.local_travel_time_seconds);
  const cross = num(f.cross_city_travel_time_seconds);
  const savePick = savingsCredit * num(f.shared_item_savings_seconds);
  const saveLocal = localCredit * num(f.shared_store_local_seconds);
  return Math.max(EPS, pick + local + cross - savePick - saveLocal);
}
function scoreUnder(f, savingsRate, localRate) {
  return num(f.earnings) / timeUnder(f, savingsRate, localRate);
}
function valueV(f, savingsRate, localRate, rho) {
  const s = scoreUnder(f, savingsRate, localRate);
  return s > 0 ? Math.pow(s, 1 - rho) : 0;
}
// The signed component value entering the attribution (the raw component, per the spec).
function componentValue(f, k) {
  return num(f[COMPONENT_FEATURE[k]]);
}

function stddev(xs) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
}

// ----- Standardized signed excess beta_k at one grid point ------------------------------ //
// beta_k = mean_r (comp_k(chosen) - comp_k(oracle-under-V)) / global SD_k. Unweighted (per spec).
// Positive = the participant systematically chose MORE of component k than the V-optimal bundle:
// for a cost (pick/cross) that is neglect; for earnings that is overweighting.
function betaAt(rounds, savingsRate, localRate, rho) {
  const pooled = Object.fromEntries(ALL_COMPONENTS.map((k) => [k, []]));
  for (const r of rounds) for (const a of r.alternatives) {
    for (const k of ALL_COMPONENTS) pooled[k].push(componentValue(a.features, k));
  }
  const sd = {};
  for (const k of ALL_COMPONENTS) sd[k] = Math.max(EPS, stddev(pooled[k]));

  const acc = Object.fromEntries(ALL_COMPONENTS.map((k) => [k, 0]));
  let n = 0;
  for (const r of rounds) {
    const alts = r.alternatives;
    let vopt = alts[0];
    let chosen = null;
    for (const a of alts) {
      if (valueV(a.features, savingsRate, localRate, rho) > valueV(vopt.features, savingsRate, localRate, rho)) vopt = a;
      if (a.chosen) chosen = a;
    }
    if (!chosen) continue;
    n += 1;
    for (const k of ALL_COMPONENTS) acc[k] += componentValue(chosen.features, k) - componentValue(vopt.features, k);
  }
  const beta = {};
  for (const k of ALL_COMPONENTS) beta[k] = n > 0 ? acc[k] / n / sd[k] : 0;
  return beta;
}

function gridPoints(grid) {
  const out = [];
  for (const savings of grid.savings) for (const local of grid.local) for (const rho of grid.rho) out.push({ savings, local, rho });
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

// ----- bootstrap worst-case + the gate -------------------------------------------------- //
/**
 * Run the sign-survival gate over the diagnostic-block choice sets. Each choice set is
 * `{ round, alternatives: [{ features:{...}, chosen:bool }] }`. Returns the full decision object;
 * `chosen_target` is "W1" | "W3" | "no_target".
 */
export function signSurvivalGate(choiceSets, config = SIGN_SURVIVAL_GATE) {
  const usable = (choiceSets || []).filter(
    (cs) => Array.isArray(cs?.alternatives) && cs.alternatives.length >= 2 && cs.alternatives.some((a) => a.chosen),
  );
  const identifying = usable.filter((cs) => menuIdentifiesEarnings(cs.alternatives));
  const rounds = identifying.length >= (config.minSpanning ?? 3) ? identifying : usable;
  const spanning_used = rounds === identifying;
  const grid = gridPoints(config.grid);
  const beta_nominal = betaAt(rounds, config.nominal.savings, config.nominal.local, config.nominal.rho);

  const pointBeta = grid.map((g) => betaAt(rounds, g.savings, g.local, g.rho));

  const rng = mulberry32(config.seed);
  const mins = Object.fromEntries(ALL_COMPONENTS.map((k) => [k, []]));
  const maxs = Object.fromEntries(ALL_COMPONENTS.map((k) => [k, []]));
  for (let b = 0; b < config.bootstrap; b += 1) {
    const sample = resample(rounds, rng);
    const perK = Object.fromEntries(ALL_COMPONENTS.map((k) => [k, []]));
    for (const g of grid) {
      const bt = betaAt(sample, g.savings, g.local, g.rho);
      for (const k of ALL_COMPONENTS) perK[k].push(bt[k]);
    }
    for (const k of ALL_COMPONENTS) {
      mins[k].push(Math.min(...perK[k]));
      maxs[k].push(Math.max(...perK[k]));
    }
  }

  const per_component = {};
  for (const k of ALL_COMPONENTS) {
    const signs = pointBeta.map((b) => Math.sign(b[k]));
    const sign = signs[0];
    const sign_constant = sign !== 0 && signs.every((s) => s === sign);
    const wcLo = percentile(mins[k], (config.alpha / 2) * 100);
    const wcHi = percentile(maxs[k], (1 - config.alpha / 2) * 100);
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

  const pickTarget = () => {
    let t = "no_target";
    let bestMag = -Infinity;
    for (const k of config.coachable) {
      if (per_component[k].pass && per_component[k].robust_magnitude > bestMag) {
        bestMag = per_component[k].robust_magnitude;
        t = k;
      }
    }
    return t;
  };
  let chosen_target = pickTarget();

  // DUAL-AXIS ABSTENTION: cross (W2) and local (Wlocal) are uncoachable but LOGGED. If W3 was chosen
  // but a robust NEGLECT signal on EITHER (positive, sign-stable, clears the floor, and at least
  // rivalRatio of W3's robust magnitude) rivals it, abstain on W3 -- a pure local- or cross-neglecter
  // cannot be distinguished from a payout-overweighter here -- and re-pick among coachable components.
  let w3_abstained_rival = null; // which nuisance axis forced the W3 abstention (null = none)
  if (chosen_target === "W3") {
    const w3mag = per_component.W3.robust_magnitude;
    for (const k of ["Wlocal", "W2"]) {
      const c = per_component[k];
      if (c.sign > 0 && c.clears_floor && c.robust_magnitude >= w3mag * config.rivalRatio) {
        per_component.W3.pass = false;
        w3_abstained_rival = k;
        break;
      }
    }
    if (w3_abstained_rival) chosen_target = pickTarget();
  }

  return {
    chosen_target,
    w3_abstained_rival,
    beta_nominal,
    per_component,
    grid: {
      savings: config.grid.savings,
      local: config.grid.local,
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

// ----- the deterministic no_target fallback --------------------------------------------- //
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
 * These are the fields the round-action allowlist must permit (chosen target, beta at nominal,
 * per-component worst-case bounds + pass/fail, and the frozen grid/floor/alpha).
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
