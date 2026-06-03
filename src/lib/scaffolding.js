/**
 * Form-varying scaffolding for the BundleGame CHI main study.
 *
 * The experiment's key control: across all *treated* arms the **recommended
 * bundle is identical** for a given round (use one fixed strong policy, e.g.
 * `oracle_optimal`). Only the FORM of the explanation differs:
 *
 *   - generic    : the recommended bundle + a generic rationale (no attribute targeting)
 *   - matched    : a contrastive/counterfactual explanation targeting the worker's
 *                  DIAGNOSED neglected attribute (W1 pick / W2 cross-city / W3 payout)
 *   - mismatched : the SAME contrastive style targeting a deterministically chosen
 *                  NON-diagnosed attribute (isolates targeting from mere explanation)
 *   - no_ai      : no recommendation, no explanation (pure unaided control)
 *
 * This module is framework-agnostic: it returns the recommended bundle (unchanged),
 * the chosen target attribute, the rendered explanation text, and the contrast
 * bundle + deltas used to build it, so the Svelte layer can render and the logger
 * can record everything per round.
 */

export const SCAFFOLD_TYPES = {
  NO_AI: "no_ai",
  GENERIC: "generic",
  MATCHED: "matched",
  MISMATCHED: "mismatched",
};

export const TREATED_SCAFFOLD_TYPES = [
  SCAFFOLD_TYPES.GENERIC,
  SCAFFOLD_TYPES.MATCHED,
  SCAFFOLD_TYPES.MISMATCHED,
];

/**
 * Attribute metadata. Keys match the candidate/diagnosis attribute columns.
 * `cost: true` means higher is worse (a time cost the worker may neglect).
 */
export const EXPLANATION_ATTRIBUTES = {
  effective_pick_time_seconds: {
    key: "effective_pick_time_seconds",
    label: "in-store picking time",
    unit: "s",
    cost: true,
    weakness: "W1",
  },
  cross_city_travel_time_seconds: {
    key: "cross_city_travel_time_seconds",
    label: "cross-city driving",
    unit: "s",
    cost: true,
    weakness: "W2",
  },
  earnings: {
    key: "earnings",
    label: "payout",
    unit: "$",
    cost: false,
    weakness: "W3",
  },
};

// Diagnosis weakness -> targeted attribute (mirrors analytics/diagnosis.py).
export const WEAKNESS_TO_ATTRIBUTE = {
  W1: "effective_pick_time_seconds",
  W2: "cross_city_travel_time_seconds",
  W3: "earnings",
};

// Deterministic fallback order for choosing a NON-diagnosed attribute (mismatched).
const MISMATCH_PREFERENCE_ORDER = [
  "cross_city_travel_time_seconds",
  "effective_pick_time_seconds",
  "earnings",
];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function bundleAttr(bundle, key) {
  return num(bundle?.[key]);
}

function fmt(value, unit) {
  const v = Math.round(num(value) * 10) / 10;
  if (unit === "$") return `$${Math.abs(v)}`;
  return `${Math.abs(v)}${unit}`;
}

/**
 * Choose the attribute the explanation targets.
 * matched -> diagnosed attribute; mismatched -> deterministic non-diagnosed attribute.
 * Returns null for generic / no_ai (no targeting).
 */
export function selectTargetAttribute(scaffoldType, diagnosedWeakness) {
  if (scaffoldType === SCAFFOLD_TYPES.MATCHED) {
    return WEAKNESS_TO_ATTRIBUTE[diagnosedWeakness] || null;
  }
  if (scaffoldType === SCAFFOLD_TYPES.MISMATCHED) {
    const diagnosed = WEAKNESS_TO_ATTRIBUTE[diagnosedWeakness] || null;
    for (const key of MISMATCH_PREFERENCE_ORDER) {
      if (key !== diagnosed) return key;
    }
    return null;
  }
  return null; // generic / no_ai
}

/**
 * Pick the contrast bundle: the legal alternative that most stresses `attribute`
 * relative to the (fixed) recommended bundle, used to build the counterfactual.
 * For a cost attribute -> the candidate that adds the most of that cost; for
 * earnings -> the highest-earning alternative. Excludes the recommended bundle.
 */
export function pickContrastBundle(recommended, candidates, attribute) {
  const recSig = bundleSignature(recommended);
  const others = (candidates || []).filter(
    (c) => bundleSignature(c) !== recSig && Number(c?.legal ?? 1) !== 0,
  );
  if (others.length === 0 || !attribute) return null;
  const recVal = bundleAttr(recommended, attribute);
  // The tempting alternative is the one with the largest value on `attribute`
  // beyond the recommendation (more cost neglected, or more payout chased).
  let best = null;
  let bestDelta = 0;
  for (const c of others) {
    const delta = bundleAttr(c, attribute) - recVal;
    if (delta > bestDelta) {
      bestDelta = delta;
      best = c;
    }
  }
  return best;
}

export function bundleSignature(bundle) {
  const ids = Array.isArray(bundle?.order_ids)
    ? bundle.order_ids
    : Array.isArray(bundle?.bundle_ids)
      ? bundle.bundle_ids
      : [];
  return [...ids].map((x) => String(x).trim()).filter(Boolean).sort().join("|");
}

function genericText(recommended) {
  return (
    "The assistant recommends this bundle for a solid balance of pay and time. " +
    "Consider taking it."
  );
}

function contrastiveText(attribute, recommended, contrast) {
  const meta = EXPLANATION_ATTRIBUTES[attribute];
  if (!meta || !contrast) {
    return genericText(recommended);
  }
  const dEarn = bundleAttr(contrast, "earnings") - bundleAttr(recommended, "earnings");
  if (meta.cost) {
    const dCost = bundleAttr(contrast, attribute) - bundleAttr(recommended, attribute);
    return (
      `Recommended bundle highlighted. Adding the other option would pile on ` +
      `${fmt(dCost, meta.unit)} more ${meta.label} to earn only ` +
      `${fmt(dEarn, "$")} more — that extra ${meta.label} isn't worth it. ` +
      `The recommended bundle keeps ${meta.label} low.`
    );
  }
  // earnings (W3): frontier framing — higher pay but worse pay-per-minute.
  const recTime = bundleAttr(recommended, "total_time_seconds");
  const conTime = bundleAttr(contrast, "total_time_seconds");
  const dTime = conTime - recTime;
  return (
    `Recommended bundle highlighted. The higher-paying option earns ` +
    `${fmt(dEarn, "$")} more but takes ${fmt(dTime, "s")} longer, so you make ` +
    `less per minute. The recommended bundle sits on the better pay-vs-time frontier.`
  );
}

/**
 * Build the full scaffold for one round.
 *
 * @param {object} args
 * @param {string} args.scaffoldType   one of SCAFFOLD_TYPES
 * @param {object} args.diagnosis      { dominant_weakness | diagnosed_weakness, confidence }
 * @param {object} args.recommendedBundle  the FIXED recommended bundle (with attributes)
 * @param {object[]} args.candidates   the legal choice set (with attributes) for contrast
 * @returns {object} loggable scaffold record (recommended bundle is never modified)
 */
export function buildScaffold({
  scaffoldType = SCAFFOLD_TYPES.NO_AI,
  diagnosis = {},
  recommendedBundle = {},
  candidates = [],
} = {}) {
  const diagnosedWeakness =
    diagnosis?.dominant_weakness ?? diagnosis?.diagnosed_weakness ?? "none";
  const recommendedIds = Array.isArray(recommendedBundle?.order_ids)
    ? recommendedBundle.order_ids
    : Array.isArray(recommendedBundle?.bundle_ids)
      ? recommendedBundle.bundle_ids
      : [];

  if (scaffoldType === SCAFFOLD_TYPES.NO_AI) {
    return {
      scaffold_type: SCAFFOLD_TYPES.NO_AI,
      shows_recommendation: false,
      recommended_bundle_ids: [],
      target_attribute: null,
      diagnosed_weakness: diagnosedWeakness,
      explanation_text: "",
      contrast_bundle_ids: [],
      deltas: {},
      degraded_to_generic: false,
    };
  }

  let effectiveType = scaffoldType;
  let degraded = false;
  // Gate: matched/mismatched require a real diagnosis; otherwise degrade to
  // generic and flag it (do NOT change which bundle is recommended).
  if (
    (scaffoldType === SCAFFOLD_TYPES.MATCHED ||
      scaffoldType === SCAFFOLD_TYPES.MISMATCHED) &&
    (!diagnosedWeakness || diagnosedWeakness === "none")
  ) {
    effectiveType = SCAFFOLD_TYPES.GENERIC;
    degraded = true;
  }

  const targetAttribute = selectTargetAttribute(effectiveType, diagnosedWeakness);
  const contrast =
    effectiveType === SCAFFOLD_TYPES.GENERIC
      ? null
      : pickContrastBundle(recommendedBundle, candidates, targetAttribute);
  const explanation =
    effectiveType === SCAFFOLD_TYPES.GENERIC
      ? genericText(recommendedBundle)
      : contrastiveText(targetAttribute, recommendedBundle, contrast);

  const contrastIds = contrast
    ? Array.isArray(contrast.order_ids)
      ? contrast.order_ids
      : contrast.bundle_ids || []
    : [];

  const deltas = {};
  if (contrast && targetAttribute) {
    deltas[targetAttribute] =
      bundleAttr(contrast, targetAttribute) - bundleAttr(recommendedBundle, targetAttribute);
    deltas.earnings =
      bundleAttr(contrast, "earnings") - bundleAttr(recommendedBundle, "earnings");
  }

  return {
    scaffold_type: scaffoldType, // assigned arm (logged as assigned)
    rendered_scaffold_type: effectiveType, // what was actually shown (after gating)
    shows_recommendation: true,
    recommended_bundle_ids: recommendedIds, // INVARIANT across treated arms
    target_attribute: targetAttribute,
    diagnosed_weakness: diagnosedWeakness,
    explanation_text: explanation,
    contrast_bundle_ids: contrastIds,
    deltas,
    degraded_to_generic: degraded,
  };
}
