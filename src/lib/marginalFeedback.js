/**
 * Counterfactual (marginal) feedback — the one new capability for the CHI
 * dynamic counterfactual-feedback study (Task 4).
 *
 * Given the bundle a participant ACTUALLY chose and the legal candidate bundles
 * for that round, compute the single best one-step add / drop / swap and render
 * it as the per-attribute counterfactual the `marginal` arm shows. This is the
 * regret attribution `A_k = a_k * Dx_k` of the v11 model made visible: the move
 * is the true best one-step neighbour of the chosen bundle, never an invented or
 * globally-optimal one.
 *
 * Spec-derived (the reference module `marginal_feedback_reference.py` named in the
 * implementation guide does not exist in this repo; this implements Task 4's rules
 * and the acceptance-criteria message string directly). Rules enforced:
 *   - use ONLY `deployed_score`, `earnings`, `deployed_total_time_seconds`;
 *   - the message is the TRUE best one-step move on the bundle actually chosen;
 *   - if the choice is already one-step-optimal, show nothing and report
 *     `violation_label = "none"`.
 *
 * Self-contained (no imports) so it is unit-testable under `node --test`.
 *
 * Canonical scored-bundle shape (tolerant of chiScenarioDesign.scoreBundle, which
 * emits `bundle_ids` / `total_time_seconds` / `score`):
 *   {
 *     bundle_ids | order_ids: string[],
 *     earnings: number,                              // game-$
 *     deployed_total_time_seconds | total_time_seconds: number,
 *     deployed_score | score: number                // = earnings / time
 *   }
 */

// --------------------------------------------------------------------------- //
// Tolerant field accessors (the only three attributes Task 4 may read).        //
// --------------------------------------------------------------------------- //
export function bundleIds(bundle) {
  const b = bundle || {};
  const ids = b.bundle_ids ?? b.order_ids ?? [];
  return Array.isArray(ids) ? ids.map((x) => String(x)) : [];
}

export function earningsOf(bundle) {
  return Number((bundle || {}).earnings) || 0;
}

export function timeOf(bundle) {
  const b = bundle || {};
  const t = b.deployed_total_time_seconds ?? b.total_time_seconds;
  const v = Number(t);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export function scoreOf(bundle) {
  const b = bundle || {};
  const s = b.deployed_score ?? b.score;
  if (Number.isFinite(Number(s))) return Number(s);
  const t = timeOf(b);
  return t > 0 ? earningsOf(b) / t : 0;
}

/** Rate in game-$ per minute (the unit the marginal message reports). */
export function ratePerMin(bundle) {
  const t = timeOf(bundle);
  return t > 0 ? earningsOf(bundle) / (t / 60) : 0;
}

const idKey = (ids) => [...ids].map(String).sort().join("|");

// --------------------------------------------------------------------------- //
// One-step neighbourhood of the chosen bundle within the legal action set.     //
// --------------------------------------------------------------------------- //
/**
 * All legal candidate bundles reachable from `chosenIds` by exactly one
 * add / drop / swap. Returns `{ type, addedId, droppedId, bundle }` per move.
 * The chosen bundle itself (0 changes) and >1-step bundles are excluded.
 */
export function oneStepNeighbors(chosenIds = [], legalBundles = []) {
  const chosen = new Set(chosenIds.map(String));
  const out = [];
  for (const bundle of legalBundles) {
    const cand = new Set(bundleIds(bundle));
    const added = [...cand].filter((x) => !chosen.has(x));
    const removed = [...chosen].filter((x) => !cand.has(x));
    if (added.length === 1 && removed.length === 0) {
      out.push({ type: "add", addedId: added[0], droppedId: null, bundle });
    } else if (added.length === 0 && removed.length === 1) {
      out.push({ type: "drop", addedId: null, droppedId: removed[0], bundle });
    } else if (added.length === 1 && removed.length === 1) {
      out.push({ type: "swap", addedId: added[0], droppedId: removed[0], bundle });
    }
  }
  return out;
}

const MOVE_TO_VIOLATION = {
  drop: "over_inclusion", // took too many orders -> pick-time neglect (W1)
  add: "under_inclusion", // left value on the table
  swap: "substitution", // picked the wrong order of the right count
};

/** Move type -> behavioural violation label (logged per decision). */
export function violationLabel(move) {
  if (!move || !move.type) return "none";
  return MOVE_TO_VIOLATION[move.type] || "none";
}

// --------------------------------------------------------------------------- //
// Best improving one-step move (the TRUE counterfactual; never invented).      //
// --------------------------------------------------------------------------- //
/**
 * The single best one-step neighbour with a strictly higher deployed_score than
 * the chosen bundle. `targetWeakness` (W1/W2/W3) breaks EXACT score ties toward
 * the diagnosed leak so the marginal arm can emphasise k_learn (picking), but it
 * never overrides a genuinely higher-scoring move — the returned move is always
 * the true best.
 *
 * Returns null when the choice is already one-step-optimal.
 */
export function bestImprovingMove(chosenBundle, legalBundles = [], options = {}) {
  const { epsilon = 1e-9, targetWeakness = null } = options;
  const chosenIds = bundleIds(chosenBundle);
  const chosenScore = scoreOf(chosenBundle);
  const neighbors = oneStepNeighbors(chosenIds, legalBundles);

  let best = null;
  for (const move of neighbors) {
    const s = scoreOf(move.bundle);
    if (s <= chosenScore + epsilon) continue; // must strictly improve
    if (best === null) { best = move; continue; }
    const bestScore = scoreOf(best.bundle);
    if (s > bestScore + epsilon) { best = move; continue; }
    if (Math.abs(s - bestScore) <= epsilon) {
      // Exact tie: prefer the move that addresses the diagnosed weakness, then
      // a deterministic key so the output is stable.
      const pref = (m) => (targetWeakness && violationForWeakness(targetWeakness) === violationLabel(m) ? 1 : 0);
      const dp = pref(move) - pref(best);
      if (dp > 0 || (dp === 0 && idKey(bundleIds(move.bundle)) < idKey(bundleIds(best.bundle)))) {
        best = move;
      }
    }
  }
  if (!best) return null;

  const neighbor = best.bundle;
  const earningsDelta = earningsOf(neighbor) - earningsOf(chosenBundle); // signed
  const timeDelta = timeOf(neighbor) - timeOf(chosenBundle); // signed (sec)
  return {
    type: best.type,
    added_id: best.addedId,
    dropped_id: best.droppedId,
    violation_label: violationLabel(best),
    from_rate_per_min: round1(ratePerMin(chosenBundle)),
    to_rate_per_min: round1(ratePerMin(neighbor)),
    earnings_delta: Math.round(earningsDelta),
    time_delta_seconds: Math.round(timeDelta),
    chosen_score: scoreOf(chosenBundle),
    neighbor_score: scoreOf(neighbor),
    chosen_bundle_ids: chosenIds,
    neighbor_bundle_ids: bundleIds(neighbor),
  };
}

function violationForWeakness(weakness) {
  // The picking leak (W1) is the over-inclusion we coach via drops.
  if (weakness === "W1") return "over_inclusion";
  if (weakness === "W2") return "substitution"; // route fix via swap-to-closer
  return null;
}

// --------------------------------------------------------------------------- //
// Per-arm feedback messages.                                                   //
// --------------------------------------------------------------------------- //
const VERB = { drop: "Dropping", add: "Adding", swap: "Swapping" };

const COMPONENT_TIP = {
  W1: "your pick time — each extra order at a store adds handling time",
  W2: "your routing — orders across town add cross-city travel",
  W3: "payout chasing — the highest-paying orders can cost more time than they earn",
  none: "your overall rate",
};

/**
 * The `marginal` arm: the exact best one-step move with $ and time deltas.
 * Returns `{ text, violation_label, best_improving_move }`. `text` is "" when the
 * choice is one-step-optimal (show nothing).
 */
export function marginalFeedbackMessage(chosenBundle, legalBundles = [], options = {}) {
  const { targetWeakness = null } = options;
  // labelFor labels ORDER ids; tolerate a non-function (e.g. a weakness-label map
  // passed by mistake) by falling back to the default order labeler.
  const labelFor = typeof options.labelFor === "function" ? options.labelFor : (id) => `order ${id}`;
  // No usable chosen bundle (e.g. the chosen orders did not match a legal candidate)
  // -> show nothing rather than throw.
  if (!chosenBundle || !Array.isArray(legalBundles) || legalBundles.length === 0) {
    return { text: "", violation_label: "none", best_improving_move: null };
  }
  const move = bestImprovingMove(chosenBundle, legalBundles, { targetWeakness });
  if (!move) {
    return { text: "", violation_label: "none", best_improving_move: null };
  }
  const subject =
    move.type === "swap"
      ? `${labelFor(move.dropped_id)} for ${labelFor(move.added_id)}`
      : labelFor(move.dropped_id ?? move.added_id);

  const earn = move.earnings_delta;
  const earnFrag =
    earn > 0 ? `earn $${earn} more` : earn < 0 ? `earn $${Math.abs(earn)} less` : "earn the same";
  const t = move.time_delta_seconds;
  const timeFrag =
    t < 0 ? `finish ${Math.abs(t)}s sooner` : t > 0 ? `take ${t}s longer` : "take the same time";

  const text =
    `${VERB[move.type]} ${subject} would raise your rate from ` +
    `$${move.from_rate_per_min}/min to $${move.to_rate_per_min}/min: ${earnFrag} but ${timeFrag}.`;
  return { text, violation_label: move.violation_label, best_improving_move: move };
}

/** The `component` arm: name the current dominant weakness, no numbers. */
export function componentFeedbackMessage(diagnosis, options = {}) {
  const dx = diagnosis || {};
  const w = dx.dominant_weakness || dx.diagnosed_weakness || "none";
  const tip = COMPONENT_TIP[w] || COMPONENT_TIP.none;
  const text =
    w === "none"
      ? "Keep an eye on your overall rate."
      : `Watch ${tip}.`;
  return { text, violation_label: "none", best_improving_move: null, target_weakness: w };
}

/** The `aggregate` arm: the scalar rate only — no recommendation. */
export function aggregateFeedbackMessage(chosenBundle, options = {}) {
  const rate = round1(ratePerMin(chosenBundle));
  return { text: `Your rate: $${rate}/min.`, violation_label: "none", best_improving_move: null };
}

/** The `oracle` arm: the best bundle, no reasoning (deskilling control). */
export function oracleFeedbackMessage(legalBundles = [], options = {}) {
  const labelFor = typeof options.labelFor === "function" ? options.labelFor : (id) => `order ${id}`;
  let best = null;
  for (const b of legalBundles) {
    if (best === null || scoreOf(b) > scoreOf(best)) best = b;
  }
  if (!best) return { text: "", violation_label: "none", best_improving_move: null };
  const ids = bundleIds(best).map(labelFor).join(" + ");
  return { text: `Best bundle: ${ids}.`, violation_label: "none", best_improving_move: null };
}

/** The `control` arm: nothing. */
export function controlFeedbackMessage() {
  return { text: "", violation_label: "none", best_improving_move: null };
}

/**
 * Dispatch feedback for an arm id. `ctx`:
 *   { chosenBundle, legalBundles, diagnosis, labelFor }.
 * Always returns `{ text, violation_label, best_improving_move }` so the caller
 * logs a uniform record regardless of arm.
 */
export function feedbackForArm(armId, ctx = {}) {
  const { chosenBundle, legalBundles = [], labelFor } = ctx;
  const dx = ctx.diagnosis || {}; // diagnosis may be null in the lean pilot
  const targetWeakness = dx.dominant_weakness || dx.diagnosed_weakness || null;
  switch (armId) {
    case "marginal":
      return marginalFeedbackMessage(chosenBundle, legalBundles, { labelFor, targetWeakness });
    case "component":
      return componentFeedbackMessage(dx, { labelFor });
    case "aggregate":
      return aggregateFeedbackMessage(chosenBundle);
    case "oracle":
      return oracleFeedbackMessage(legalBundles, { labelFor });
    case "control":
    default:
      return controlFeedbackMessage();
  }
}

function round1(x) {
  return Math.round((Number(x) || 0) * 10) / 10;
}
