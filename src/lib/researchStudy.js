export const DEFAULT_ACTION_MASK_VERSION = "legal_bundle_mask_v1";

// =============================================================================================
// EXPERIMENT 1 of 3 — Live recommendation (mainGame). The A/B/C recommendation study that has
// already run (the only one with real participant data; scenario set mainGame_2026_03_20_14_26_36).
// See docs/current/EXPERIMENTS.md for how the three experiments map.
// =============================================================================================
export const BUNDLEGAME_STUDY_PROTOCOL_VERSION = "bundlegame_abc_50_round_v1";
export const BUNDLEGAME_STUDY_PROTOCOL_ID = "bundlegame_abc_recommendation_v1";
export const BUNDLEGAME_STUDY_TOTAL_ROUNDS = 50;

export const RESEARCH_MODEL_TYPES = {
  REFERENCE: "reference_baseline",
  HEURISTIC: "heuristic",
  BEHAVIOR_CLONING: "behavior_cloning",
  REWARD_MODEL: "reward_model",
  CONTEXTUAL_BANDIT: "contextual_bandit",
  OFFLINE_RL: "offline_rl",
  SIMULATOR_ONLY: "simulator_only",
  UNSUPPORTED: "unsupported",
};

export const RESEARCH_MODEL_TYPE_LABELS = {
  [RESEARCH_MODEL_TYPES.REFERENCE]: "Reference Baseline",
  [RESEARCH_MODEL_TYPES.HEURISTIC]: "Heuristic",
  [RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING]: "Behaviour Cloning",
  [RESEARCH_MODEL_TYPES.REWARD_MODEL]: "Reward Model",
  [RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT]: "Contextual Bandit",
  [RESEARCH_MODEL_TYPES.OFFLINE_RL]: "Offline RL",
  [RESEARCH_MODEL_TYPES.SIMULATOR_ONLY]: "Simulator Only",
  [RESEARCH_MODEL_TYPES.UNSUPPORTED]: "Unsupported",
};

export const RESEARCH_MODEL_STATUSES = {
  IMPLEMENTED: "implemented",
  ANALYSIS_BASELINE: "analysis_baseline",
  TRAINED: "trained",
  PLANNED: "planned",
  NOT_IMPLEMENTED: "not_implemented",
  UNSUPPORTED: "unsupported",
};

export const BUNDLEGAME_BASELINE_MODEL_REGISTRY = [
  {
    model_id: "historical_human_logged_v1",
    label: "Historical Human",
    algorithm: "logged_human_choice",
    policy_name: "historical_human",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.REFERENCE,
    implementation_status: RESEARCH_MODEL_STATUSES.IMPLEMENTED,
    baseline_ladder_rank: 0,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: false,
      training_mode: "logged_data_reference",
      training_data_source: "observed participant choices",
      artifact_status: "analysis_generated",
    },
    notes: "Reference row for observed human choices; not a trained model.",
  },
  {
    model_id: "heuristic_route_score_v1",
    label: "Heuristic Route Score",
    algorithm: "route_score_heuristic",
    policy_name: "heuristic_route_score",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.HEURISTIC,
    implementation_status: RESEARCH_MODEL_STATUSES.IMPLEMENTED,
    baseline_ladder_rank: 1,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: false,
      training_mode: "rule_based",
      training_data_source: "candidate bundle metadata",
      artifact_status: "code_baseline",
    },
    notes: "Deterministic route/reward scoring baseline.",
  },
  {
    model_id: "oracle_optimal_v1",
    label: "Oracle Optimal",
    algorithm: "oracle_best_candidate",
    policy_name: "oracle_optimal",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.REFERENCE,
    implementation_status: RESEARCH_MODEL_STATUSES.IMPLEMENTED,
    baseline_ladder_rank: 7,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: false,
      training_mode: "oracle_reference",
      training_data_source: "candidate bundle optimum",
      artifact_status: "analysis_generated",
    },
    notes: "Upper-bound reference computed from legal candidate bundles; not a trained model.",
  },
  {
    model_id: "linear_behavior_cloning_v1",
    label: "Behaviour Cloning Linear Baseline",
    algorithm: "linear_behavior_cloning",
    policy_name: "behavior_cloning_linear",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING,
    implementation_status: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    baseline_ladder_rank: 2,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: true,
      training_mode: "analysis_time_linear_fit",
      training_data_source: "policy_training.csv observed choices",
      artifact_status: "not_persisted",
    },
    notes: "Linear choice model fit during analysis; not a DRL policy.",
  },
  {
    model_id: "linear_reward_model_v1",
    label: "Reward Model Linear Baseline",
    algorithm: "linear_reward_model",
    policy_name: "reward_model_linear",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.REWARD_MODEL,
    implementation_status: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    baseline_ladder_rank: 3,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: true,
      training_mode: "analysis_time_linear_fit",
      training_data_source: "policy_training.csv reward targets",
      artifact_status: "not_persisted",
    },
    notes: "Linear reward proxy fit during analysis; not a DRL policy.",
  },
  {
    model_id: "linear_contextual_bandit_v1",
    label: "Contextual Bandit Linear Baseline",
    algorithm: "linear_contextual_bandit",
    policy_name: "contextual_bandit_linear",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT,
    implementation_status: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    baseline_ladder_rank: 4,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: true,
      training_mode: "analysis_time_linear_ranker",
      training_data_source: "recommendation workbench linear adoption/outcome models",
      artifact_status: "not_persisted",
    },
    notes: "Analysis-time contextual ranking baseline; not a DRL policy.",
  },
  {
    model_id: "cql_offline_rl_v1",
    label: "CQL Offline RL",
    algorithm: "CQL",
    policy_name: "CQL",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    implementation_status: RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED,
    status: RESEARCH_MODEL_STATUSES.PLANNED,
    baseline_ladder_rank: 5,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: false,
      training_mode: "planned_offline_rl",
      training_data_source: "future labeled treatment trajectories",
      artifact_status: "missing",
    },
    notes: "Planned offline-RL model; do not treat as trained until an artifact is registered.",
  },
  {
    model_id: "iql_offline_rl_v1",
    label: "IQL Offline RL",
    algorithm: "IQL",
    policy_name: "IQL",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    implementation_status: RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED,
    status: RESEARCH_MODEL_STATUSES.PLANNED,
    baseline_ladder_rank: 6,
    is_active: false,
    simulation_only: false,
    training_provenance: {
      trained: false,
      training_mode: "planned_offline_rl",
      training_data_source: "future labeled treatment trajectories",
      artifact_status: "missing",
    },
    notes: "Planned offline-RL ablation; do not treat as trained until an artifact is registered.",
  },
];

export const BUNDLEGAME_STUDY_PHASES = [
  {
    id: "A",
    label: "Phase A",
    round_start: 1,
    round_end: 15,
    rounds: 15,
    recommendations_enabled: false,
  },
  {
    id: "B",
    label: "Phase B",
    round_start: 16,
    round_end: 35,
    rounds: 20,
    recommendations_enabled: true,
  },
  {
    id: "C",
    label: "Phase C",
    round_start: 36,
    round_end: 50,
    rounds: 15,
    recommendations_enabled: false,
  },
];

export const BUNDLEGAME_RECOMMENDATION_EXPOSURE = {
  active_phase_ids: ["B"],
  treatment_arm_ids: ["contextual_bandit", "rl_cql"],
  control_arm_ids: ["control"],
  default_ranked_bundles_shown: 1,
  expected_shown_bundle_size: 2,
};

export const BUNDLEGAME_POLICY_ARMS = [
  {
    id: "control",
    label: "Control",
    policy_name: "control",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.REFERENCE,
    implementation_status: RESEARCH_MODEL_STATUSES.IMPLEMENTED,
    show_recommendations: false,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "contextual_bandit",
    label: "Contextual Bandit Baseline",
    policy_name: "contextual_bandit_linear",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT,
    implementation_status: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "rl_cql",
    label: "CQL Offline RL (planned)",
    policy_name: "CQL",
    policy_version: "v1",
    model_type: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    implementation_status: RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED,
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
];

export const BUNDLEGAME_STUDY_PROTOCOL = {
  protocol_id: BUNDLEGAME_STUDY_PROTOCOL_ID,
  protocol_version: BUNDLEGAME_STUDY_PROTOCOL_VERSION,
  title: "BundleGame 50-round decision study",
  target_venue: "",
  expected_total_rounds: BUNDLEGAME_STUDY_TOTAL_ROUNDS,
  phase_plan: BUNDLEGAME_STUDY_PHASES.map((phase) => ({ ...phase })),
  policy_arms: BUNDLEGAME_POLICY_ARMS.map((arm) => ({ ...arm })),
  recommendation_exposure: {
    ...BUNDLEGAME_RECOMMENDATION_EXPOSURE,
    active_phase_ids: [...BUNDLEGAME_RECOMMENDATION_EXPOSURE.active_phase_ids],
    treatment_arm_ids: [...BUNDLEGAME_RECOMMENDATION_EXPOSURE.treatment_arm_ids],
    control_arm_ids: [...BUNDLEGAME_RECOMMENDATION_EXPOSURE.control_arm_ids],
  },
  legal_action_mask_version: DEFAULT_ACTION_MASK_VERSION,
};

export const DEFAULT_POLICY_ARMS = BUNDLEGAME_POLICY_ARMS.map((arm) => ({ ...arm }));
export const DEFAULT_PROTOCOL_PHASES = BUNDLEGAME_STUDY_PHASES.map((phase) => ({
  ...phase,
}));

export const DEFAULT_SURVEY_QUESTIONS = [
  {
    id: "trust_rating",
    label: "Trust",
    min: 1,
    max: 7,
    default_value: 4,
  },
  {
    id: "usefulness_rating",
    label: "Usefulness",
    min: 1,
    max: 7,
    default_value: 4,
  },
  {
    id: "workload_rating",
    label: "Workload",
    min: 1,
    max: 7,
    default_value: 4,
  },
];

/**
 * Post-Phase-A strategy and confidence survey (CHI dynamic-feedback study, Task 2).
 * Administered after round 15, before any feedback: it gives the server a beat to
 * run the first diagnosis AND sharpens it (the weak link at only 15 rounds). Each
 * item is a 1..5 Likert; `maps_to` and `reverse` define the weak prior over
 * W1/W2/W3 that the diagnosis fuses (Task 3). A high score on a non-reverse item
 * raises that weakness's prior; a high score on a reverse item lowers it.
 */
export const CHI_POST_PHASE_A_SURVEY = [
  {
    id: "strat_over_inclusion",
    label: "Took on as many orders as possible",
    prompt: "I tried to take on as many orders as I could.",
    min: 1, max: 5, default_value: 3, maps_to: "W1", reverse: false,
  },
  {
    id: "strat_watched_pick_time",
    label: "Watched added pick time",
    prompt: "I watched how much extra time each added order would take.",
    min: 1, max: 5, default_value: 3, maps_to: "W1", reverse: true,
  },
  {
    id: "strat_avoided_cross_city",
    label: "Avoided cross-city orders",
    prompt: "I avoided orders that sent me across town.",
    min: 1, max: 5, default_value: 3, maps_to: "W2", reverse: true,
  },
  {
    id: "strat_chased_payout",
    label: "Chased highest payout",
    prompt: "I went for the highest paying orders even if they took longer.",
    min: 1, max: 5, default_value: 3, maps_to: "W3", reverse: false,
  },
  {
    id: "confidence_rating",
    label: "Confidence in choices",
    prompt: "How confident were you in your choices?",
    min: 1, max: 5, default_value: 3, maps_to: "confidence", reverse: false,
  },
];

function removeUndefinedDeep(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => removeUndefinedDeep(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, removeUndefinedDeep(entry)]),
    );
  }
  return value;
}

export function normalizeIdArray(value = []) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.map((entry) => String(entry ?? "").trim()).filter(Boolean),
    ),
  ];
}

export function normalizeRankedBundles(value = []) {
  if (!Array.isArray(value)) return [];
  if (value.every((entry) => typeof entry === "string")) {
    const normalized = normalizeIdArray(value);
    return normalized.length > 0 ? [normalized] : [];
  }
  return value
    .map((entry) => normalizeIdArray(entry))
    .filter((bundleIds) => bundleIds.length > 0);
}

function normalizeText(value = "", fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || String(fallback ?? "").trim();
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) return Boolean(fallback);
  return Boolean(value);
}

function normalizeInteger(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function normalizeIsoString(value = "") {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  const millis = Date.parse(normalized);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : "";
}

function normalizeModelType(value = "", fallback = "") {
  const normalized = normalizeText(value || fallback).toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
  const aliases = {
    baseline: RESEARCH_MODEL_TYPES.REFERENCE,
    reference: RESEARCH_MODEL_TYPES.REFERENCE,
    reference_baseline: RESEARCH_MODEL_TYPES.REFERENCE,
    human: RESEARCH_MODEL_TYPES.REFERENCE,
    logged_human: RESEARCH_MODEL_TYPES.REFERENCE,
    heuristic: RESEARCH_MODEL_TYPES.HEURISTIC,
    rule_based: RESEARCH_MODEL_TYPES.HEURISTIC,
    behavior_clone: RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING,
    behaviour_clone: RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING,
    behavior_cloning: RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING,
    behaviour_cloning: RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING,
    bc: RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING,
    reward: RESEARCH_MODEL_TYPES.REWARD_MODEL,
    reward_model: RESEARCH_MODEL_TYPES.REWARD_MODEL,
    contextual_bandit: RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT,
    bandit: RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT,
    offline_rl: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    offline_reinforcement_learning: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    cql: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    iql: RESEARCH_MODEL_TYPES.OFFLINE_RL,
    simulator: RESEARCH_MODEL_TYPES.SIMULATOR_ONLY,
    simulator_only: RESEARCH_MODEL_TYPES.SIMULATOR_ONLY,
    dqn_simulator_only: RESEARCH_MODEL_TYPES.SIMULATOR_ONLY,
    unsupported: RESEARCH_MODEL_TYPES.UNSUPPORTED,
  };
  return aliases[compact] || Object.values(RESEARCH_MODEL_TYPES).includes(compact)
    ? (aliases[compact] || compact)
    : "";
}

function inferModelType(source = {}) {
  const explicit = normalizeModelType(
    source?.model_type ?? source?.modelType ?? source?.type,
  );
  if (explicit) return explicit;
  const haystack = [
    source?.algorithm,
    source?.policy_name,
    source?.model_id,
    source?.id,
    source?.label,
  ]
    .map((entry) => String(entry ?? "").toLowerCase())
    .join(" ");
  if (!haystack.trim()) return RESEARCH_MODEL_TYPES.UNSUPPORTED;
  if (haystack.includes("cql") || haystack.includes("iql")) {
    return RESEARCH_MODEL_TYPES.OFFLINE_RL;
  }
  if (haystack.includes("dqn")) return RESEARCH_MODEL_TYPES.SIMULATOR_ONLY;
  if (haystack.includes("contextual") || haystack.includes("bandit")) {
    return RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT;
  }
  if (haystack.includes("reward")) return RESEARCH_MODEL_TYPES.REWARD_MODEL;
  if (haystack.includes("behavior") || haystack.includes("behaviour")) {
    return RESEARCH_MODEL_TYPES.BEHAVIOR_CLONING;
  }
  if (haystack.includes("heuristic") || haystack.includes("route_score")) {
    return RESEARCH_MODEL_TYPES.HEURISTIC;
  }
  if (
    haystack.includes("historical") ||
    haystack.includes("human") ||
    haystack.includes("control") ||
    haystack.includes("oracle")
  ) {
    return RESEARCH_MODEL_TYPES.REFERENCE;
  }
  return RESEARCH_MODEL_TYPES.UNSUPPORTED;
}

function normalizeImplementationStatus(value = "", modelType = "", fallback = "") {
  const normalized = normalizeText(value || fallback).toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
  const aliases = {
    active: RESEARCH_MODEL_STATUSES.TRAINED,
    complete: RESEARCH_MODEL_STATUSES.TRAINED,
    completed: RESEARCH_MODEL_STATUSES.TRAINED,
    ready: RESEARCH_MODEL_STATUSES.TRAINED,
    trained: RESEARCH_MODEL_STATUSES.TRAINED,
    implemented: RESEARCH_MODEL_STATUSES.IMPLEMENTED,
    production: RESEARCH_MODEL_STATUSES.IMPLEMENTED,
    analysis: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    analysis_baseline: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    prototype: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    draft: RESEARCH_MODEL_STATUSES.PLANNED,
    planned: RESEARCH_MODEL_STATUSES.PLANNED,
    missing: RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED,
    not_implemented: RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED,
    unsupported: RESEARCH_MODEL_STATUSES.UNSUPPORTED,
  };
  if (
    modelType === RESEARCH_MODEL_TYPES.OFFLINE_RL &&
    (!compact || compact === "draft" || compact === "planned")
  ) {
    return RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED;
  }
  if (
    !compact &&
    (modelType === RESEARCH_MODEL_TYPES.REFERENCE ||
      modelType === RESEARCH_MODEL_TYPES.HEURISTIC)
  ) {
    return RESEARCH_MODEL_STATUSES.IMPLEMENTED;
  }
  if (aliases[compact]) return aliases[compact];
  if (modelType === RESEARCH_MODEL_TYPES.UNSUPPORTED) {
    return RESEARCH_MODEL_STATUSES.UNSUPPORTED;
  }
  if (modelType === RESEARCH_MODEL_TYPES.OFFLINE_RL) {
    return RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED;
  }
  return fallback || RESEARCH_MODEL_STATUSES.PLANNED;
}

function normalizeTrainingProvenance(value = {}, source = {}) {
  const provenance = value && typeof value === "object" ? value : {};
  const trainingRows = normalizeInteger(
    provenance?.training_rows ??
      provenance?.rows ??
      source?.training_rows ??
      source?.trainingRows,
  );
  return removeUndefinedDeep({
    trained: normalizeBoolean(
      provenance?.trained,
      source?.status === RESEARCH_MODEL_STATUSES.TRAINED ||
        source?.implementation_status === RESEARCH_MODEL_STATUSES.TRAINED,
    ),
    training_mode: normalizeText(
      provenance?.training_mode ?? provenance?.mode ?? source?.training_mode,
    ),
    training_data_source: normalizeText(
      provenance?.training_data_source ??
        provenance?.data_source ??
        source?.training_data_source,
    ),
    dataset_snapshot_id: normalizeText(
      provenance?.dataset_snapshot_id ?? source?.dataset_snapshot_id,
    ),
    training_rows: trainingRows,
    trained_at: normalizeIsoString(provenance?.trained_at ?? source?.trained_at),
    code_version: normalizeText(
      provenance?.code_version ?? source?.code_version,
    ),
    artifact_status: normalizeText(
      provenance?.artifact_status ?? source?.artifact_status,
    ),
    notes: normalizeText(provenance?.notes ?? source?.training_notes),
  });
}

export function getModelTypeLabel(modelType = "") {
  const normalized = normalizeModelType(modelType, RESEARCH_MODEL_TYPES.UNSUPPORTED);
  return RESEARCH_MODEL_TYPE_LABELS[normalized] || RESEARCH_MODEL_TYPE_LABELS.unsupported;
}

export function getBaselineModelRegistry() {
  return BUNDLEGAME_BASELINE_MODEL_REGISTRY.map((entry) => normalizeResearchModel(entry));
}

export function findBaselineModelDefinition(policyName = "") {
  const normalizedPolicy = normalizeText(policyName).toLowerCase();
  if (!normalizedPolicy) return null;
  return (
    BUNDLEGAME_BASELINE_MODEL_REGISTRY.find((entry) => {
      const candidates = [
        entry.model_id,
        entry.policy_name,
        entry.algorithm,
        entry.label,
      ].map((value) => normalizeText(value).toLowerCase());
      return candidates.includes(normalizedPolicy);
    }) || null
  );
}

export function getPolicyModelMetadata(policyName = "", overrides = {}) {
  const baseline = findBaselineModelDefinition(policyName) || {};
  const normalized = normalizeResearchModel({
    ...baseline,
    ...(overrides && typeof overrides === "object" ? overrides : {}),
    policy_name: normalizeText(
      overrides?.policy_name,
      baseline?.policy_name || policyName,
    ),
  });
  return {
    model_id: normalized.model_id,
    policy_name: normalized.policy_name || normalizeText(policyName),
    policy_version: normalized.policy_version,
    model_type: normalized.model_type,
    model_type_label: normalized.model_type_label,
    implementation_status: normalized.implementation_status,
    baseline_ladder_rank: normalized.baseline_ladder_rank,
    simulation_only: normalized.simulation_only,
    training_mode: normalized.training_provenance?.training_mode || "",
    training_data_source:
      normalized.training_provenance?.training_data_source || "",
    training_rows: normalized.training_provenance?.training_rows ?? null,
    artifact_status: normalized.training_provenance?.artifact_status || "",
    unsupported: normalized.unsupported,
  };
}

function stableHashString(value = "") {
  const input = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildDefaultPhasePlan() {
  return DEFAULT_PROTOCOL_PHASES.map((phase) => ({ ...phase }));
}

function buildDefaultPolicyArms() {
  return DEFAULT_POLICY_ARMS.map((arm) => ({ ...arm }));
}

function buildDefaultSurveyQuestions() {
  return DEFAULT_SURVEY_QUESTIONS.map((question) => ({ ...question }));
}

function normalizeProtocolPhase(phase = {}, index = 0) {
  const fallback = DEFAULT_PROTOCOL_PHASES[index] || {};
  const rounds = Math.max(0, Number(phase?.rounds ?? fallback.rounds) || 0);
  const roundStart = Math.max(
    0,
    Number(
      phase?.round_start ??
        phase?.start_round ??
        phase?.first_round ??
        fallback.round_start,
    ) || 0,
  );
  const roundEnd = Math.max(
    0,
    Number(
      phase?.round_end ??
        phase?.end_round ??
        phase?.last_round ??
        fallback.round_end,
    ) || 0,
  );
  // CHI dynamic-feedback extras carried through normalization (Phase B blocks,
  // post-Phase-A survey/diagnosis schedule). Preserved only when present.
  const extra = {};
  if (Array.isArray(phase?.blocks)) {
    extra.blocks = phase.blocks.map((b = {}) => ({
      id: normalizeText(b?.id),
      kind: normalizeText(b?.kind),
      feedback_enabled: normalizeBoolean(b?.feedback_enabled, b?.kind === "on"),
      test_set: b?.test_set != null ? normalizeText(b.test_set) : null,
      rounds: Math.max(0, Number(b?.rounds) || 0),
      round_start: Math.max(0, Number(b?.round_start) || 0),
      round_end: Math.max(0, Number(b?.round_end) || 0),
      ...(b?.rediagnose_after != null ? { rediagnose_after: normalizeBoolean(b.rediagnose_after, false) } : {}),
    }));
  }
  if (phase?.survey_after !== undefined) extra.survey_after = normalizeBoolean(phase.survey_after, false);
  if (phase?.diagnose_after !== undefined) extra.diagnose_after = normalizeBoolean(phase.diagnose_after, false);
  return {
    id: normalizeText(
      phase?.id ?? phase?.phase ?? fallback.id ?? `phase_${index + 1}`,
    ),
    label: normalizeText(phase?.label, fallback.label || `Phase ${index + 1}`),
    round_start: roundStart,
    round_end: roundEnd,
    rounds,
    recommendations_enabled: normalizeBoolean(
      phase?.recommendations_enabled,
      fallback.recommendations_enabled,
    ),
    ...extra,
  };
}

function applyPhaseRoundRanges(phases = []) {
  let cursor = 1;
  return phases.map((phase = {}) => {
    const rounds = Math.max(0, Number(phase?.rounds) || 0);
    const roundStart = Math.max(1, Number(phase?.round_start) || cursor);
    const roundEnd = Math.max(
      roundStart,
      Number(phase?.round_end) || roundStart + Math.max(0, rounds - 1),
    );
    cursor = roundEnd + 1;
    return {
      ...phase,
      round_start: roundStart,
      round_end: roundEnd,
      rounds: rounds || Math.max(0, roundEnd - roundStart + 1),
    };
  });
}

export function normalizeStudyPolicyArm(arm = {}, index = 0) {
  const fallback = DEFAULT_POLICY_ARMS[index] || {};
  const id = normalizeText(
    arm?.id ?? arm?.policy_arm ?? arm?.policy_name,
    fallback.id || `arm_${index + 1}`,
  );
  const policyName = normalizeText(
    arm?.policy_name ?? arm?.algorithm ?? id,
    fallback.policy_name || id,
  );
  const modelType = inferModelType({
    ...fallback,
    ...arm,
    policy_name: policyName,
  });
  return {
    id,
    label: normalizeText(arm?.label, fallback.label || id),
    policy_name: policyName,
    policy_version: normalizeText(
      arm?.policy_version ?? arm?.version,
      fallback.policy_version || "v1",
    ),
    model_type: modelType,
    model_type_label: getModelTypeLabel(modelType),
    implementation_status: normalizeImplementationStatus(
      arm?.implementation_status ?? arm?.status,
      modelType,
      fallback.implementation_status,
    ),
    show_recommendations: normalizeBoolean(
      arm?.show_recommendations,
      fallback.show_recommendations ?? policyName !== "control",
    ),
    active_phases: normalizeIdArray(
      arm?.active_phases ?? fallback.active_phases ?? ["B"],
    ),
    assignment_weight: Math.max(
      0,
      Number(arm?.assignment_weight ?? fallback.assignment_weight ?? 1) || 0,
    ),
    simulation_only: normalizeBoolean(
      arm?.simulation_only,
      fallback.simulation_only,
    ),
    training_provenance: normalizeTrainingProvenance(
      arm?.training_provenance ?? arm?.trainingProvenance,
      { ...fallback, ...arm },
    ),
    // CHI dynamic-feedback arm metadata (feedback form + whether it re-targets).
    feedback_kind: normalizeText(arm?.feedback_kind, fallback.feedback_kind || ""),
    dynamic: normalizeBoolean(arm?.dynamic, fallback.dynamic ?? false),
    notes: normalizeText(arm?.notes),
  };
}

function normalizeRecommendationExposure(value = {}, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  const fallbackSource = fallback && typeof fallback === "object" ? fallback : {};
  return removeUndefinedDeep({
    active_phase_ids: normalizeIdArray(
      source?.active_phase_ids ??
        source?.activePhaseIds ??
        fallbackSource.active_phase_ids ??
        BUNDLEGAME_RECOMMENDATION_EXPOSURE.active_phase_ids,
    ),
    treatment_arm_ids: normalizeIdArray(
      source?.treatment_arm_ids ??
        source?.treatmentArmIds ??
        fallbackSource.treatment_arm_ids ??
        BUNDLEGAME_RECOMMENDATION_EXPOSURE.treatment_arm_ids,
    ),
    control_arm_ids: normalizeIdArray(
      source?.control_arm_ids ??
        source?.controlArmIds ??
        fallbackSource.control_arm_ids ??
        BUNDLEGAME_RECOMMENDATION_EXPOSURE.control_arm_ids,
    ),
    default_ranked_bundles_shown: Math.max(
      0,
      Number(
        source?.default_ranked_bundles_shown ??
          fallbackSource.default_ranked_bundles_shown ??
          BUNDLEGAME_RECOMMENDATION_EXPOSURE.default_ranked_bundles_shown,
      ) || 0,
    ),
    expected_shown_bundle_size: Math.max(
      0,
      Number(
        source?.expected_shown_bundle_size ??
          fallbackSource.expected_shown_bundle_size ??
          BUNDLEGAME_RECOMMENDATION_EXPOSURE.expected_shown_bundle_size,
      ) || 0,
    ),
  });
}

function normalizeSurveyQuestion(question = {}, index = 0) {
  const fallback = DEFAULT_SURVEY_QUESTIONS[index] || {};
  // Preserve CHI strategy-survey fields (full prompt text + the W1/W2/W3 mapping
  // the diagnosis fuses) when present, so they survive into the runtime protocol.
  const extra = {};
  if (question?.prompt != null) extra.prompt = normalizeText(question.prompt);
  if (question?.maps_to != null) extra.maps_to = normalizeText(question.maps_to);
  if (question?.reverse != null) extra.reverse = normalizeBoolean(question.reverse, false);
  return {
    id: normalizeText(question?.id, fallback.id || `survey_${index + 1}`),
    label: normalizeText(question?.label, fallback.label || `Question ${index + 1}`),
    min: Math.max(1, Number(question?.min ?? fallback.min ?? 1) || 1),
    max: Math.max(
      1,
      Number(question?.max ?? fallback.max ?? 7) || 7,
    ),
    default_value: Math.max(
      1,
      Number(question?.default_value ?? fallback.default_value ?? 4) || 4,
    ),
    ...extra,
  };
}

export function normalizeResearchStudyProtocol(protocol = {}, fallback = {}) {
  const source = protocol && typeof protocol === "object" ? protocol : {};
  const fallbackSource =
    fallback && typeof fallback === "object" ? fallback : {};
  const phasePlanInput = Array.isArray(source?.phase_plan)
    ? source.phase_plan
    : Array.isArray(fallbackSource?.phase_plan)
      ? fallbackSource.phase_plan
      : buildDefaultPhasePlan();
  const policyArmInput = Array.isArray(source?.policy_arms)
    ? source.policy_arms
    : Array.isArray(fallbackSource?.policy_arms)
      ? fallbackSource.policy_arms
      : buildDefaultPolicyArms();
  const surveyQuestionsInput = Array.isArray(source?.survey_questions)
    ? source.survey_questions
    : Array.isArray(fallbackSource?.survey_questions)
      ? fallbackSource.survey_questions
      : buildDefaultSurveyQuestions();
  const phasePlan = applyPhaseRoundRanges(
    phasePlanInput.map((phase, index) => normalizeProtocolPhase(phase, index)),
  );
  const expectedTotalRounds = Math.max(
    0,
    Number(
      source?.expected_total_rounds ??
        source?.total_rounds ??
        fallbackSource.expected_total_rounds ??
        BUNDLEGAME_STUDY_TOTAL_ROUNDS,
    ) || 0,
  );

  return removeUndefinedDeep({
    protocol_id: normalizeText(
      source?.protocol_id ?? source?.id,
      fallbackSource.protocol_id || BUNDLEGAME_STUDY_PROTOCOL_ID,
    ),
    protocol_version: normalizeText(
      source?.protocol_version ?? source?.version,
      fallbackSource.protocol_version || BUNDLEGAME_STUDY_PROTOCOL_VERSION,
    ),
    title: normalizeText(
      source?.title,
      fallbackSource.title || BUNDLEGAME_STUDY_PROTOCOL.title,
    ),
    target_venue: normalizeText(
      source?.target_venue,
      fallbackSource.target_venue || BUNDLEGAME_STUDY_PROTOCOL.target_venue,
    ),
    expected_total_rounds: expectedTotalRounds,
    dataset_root: normalizeText(
      source?.dataset_root,
      fallbackSource.dataset_root || "",
    ),
    scenario_set_version_id: normalizeText(
      source?.scenario_set_version_id,
      fallbackSource.scenario_set_version_id || "",
    ),
    dataset_snapshot_id: normalizeText(
      source?.dataset_snapshot_id,
      fallbackSource.dataset_snapshot_id || "",
    ),
    status: normalizeText(source?.status, fallbackSource.status || "draft"),
    enabled: normalizeBoolean(source?.enabled, fallbackSource.enabled),
    legal_action_mask_version: normalizeText(
      source?.legal_action_mask_version,
      fallbackSource.legal_action_mask_version || DEFAULT_ACTION_MASK_VERSION,
    ),
    pilot_target_n: Math.max(
      0,
      Number(source?.pilot_target_n ?? fallbackSource.pilot_target_n ?? 24) || 0,
    ),
    main_target_n: Math.max(
      0,
      Number(source?.main_target_n ?? fallbackSource.main_target_n ?? 240) || 0,
    ),
    notes: normalizeText(source?.notes, fallbackSource.notes || ""),
    phase_plan: phasePlan,
    policy_arms: policyArmInput.map((arm, index) =>
      normalizeStudyPolicyArm(arm, index),
    ),
    recommendation_exposure: normalizeRecommendationExposure(
      source?.recommendation_exposure ?? source?.recommendationExposure,
      fallbackSource.recommendation_exposure,
    ),
    survey_questions: surveyQuestionsInput.map((question, index) =>
      normalizeSurveyQuestion(question, index),
    ),
    created_at: normalizeIsoString(
      source?.created_at || fallbackSource.created_at || "",
    ),
    updated_at: normalizeIsoString(
      source?.updated_at || fallbackSource.updated_at || "",
    ),
  });
}

function sameArray(left = [], right = []) {
  const normalizedLeft = normalizeIdArray(left);
  const normalizedRight = normalizeIdArray(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((entry, index) => entry === normalizedRight[index]);
}

function getScenarioRoundIndex(scenario = {}, fallbackIndex = 0) {
  return Math.max(
    1,
    Number(
      scenario?.round ??
        scenario?.round_index ??
        scenario?.roundIndex ??
        fallbackIndex + 1,
    ) || fallbackIndex + 1,
  );
}

function scenarioHasRecommendedFlag(scenario = {}) {
  const orders = Array.isArray(scenario?.orders) ? scenario.orders : [];
  return orders.some((order) => Boolean(order?.recommended));
}

function getProtocolValidationMessage(errors = []) {
  return errors.length > 0
    ? `BundleGame protocol snapshot is inconsistent: ${errors.join("; ")}`
    : "";
}

export function getCanonicalResearchStudyProtocol(overrides = {}) {
  return normalizeResearchStudyProtocol(
    {
      ...BUNDLEGAME_STUDY_PROTOCOL,
      ...(overrides && typeof overrides === "object" ? overrides : {}),
    },
    BUNDLEGAME_STUDY_PROTOCOL,
  );
}

export function resolveProtocolPhaseForRound(roundIndex = 1, protocol = {}) {
  const normalized = normalizeResearchStudyProtocol(protocol);
  const round = Math.max(1, Number(roundIndex) || 1);
  return (
    normalized.phase_plan.find(
      (phase) => round >= phase.round_start && round <= phase.round_end,
    ) || null
  );
}

export function validateResearchProtocolDefinition(protocol = {}) {
  const normalized = normalizeResearchStudyProtocol(protocol);
  const canonical = getCanonicalResearchStudyProtocol();
  const errors = [];
  const warnings = [];

  if (normalized.protocol_version !== canonical.protocol_version) {
    errors.push(
      `protocol_version must be ${canonical.protocol_version}, got ${normalized.protocol_version || "blank"}`,
    );
  }
  if (normalized.expected_total_rounds !== BUNDLEGAME_STUDY_TOTAL_ROUNDS) {
    errors.push(
      `expected_total_rounds must be ${BUNDLEGAME_STUDY_TOTAL_ROUNDS}, got ${normalized.expected_total_rounds}`,
    );
  }

  const plannedTotal = normalized.phase_plan.reduce(
    (sum, phase) => sum + Math.max(0, Number(phase.rounds) || 0),
    0,
  );
  if (plannedTotal !== BUNDLEGAME_STUDY_TOTAL_ROUNDS) {
    errors.push(
      `phase_plan totals ${plannedTotal} rounds; expected ${BUNDLEGAME_STUDY_TOTAL_ROUNDS}`,
    );
  }

  canonical.phase_plan.forEach((expectedPhase, index) => {
    const actualPhase = normalized.phase_plan[index];
    if (!actualPhase) {
      errors.push(`missing phase ${expectedPhase.id}`);
      return;
    }
    if (actualPhase.id !== expectedPhase.id) {
      errors.push(
        `phase ${index + 1} id must be ${expectedPhase.id}, got ${actualPhase.id}`,
      );
    }
    if (actualPhase.rounds !== expectedPhase.rounds) {
      errors.push(
        `phase ${expectedPhase.id} must have ${expectedPhase.rounds} rounds, got ${actualPhase.rounds}`,
      );
    }
    if (
      actualPhase.round_start !== expectedPhase.round_start ||
      actualPhase.round_end !== expectedPhase.round_end
    ) {
      errors.push(
        `phase ${expectedPhase.id} must cover rounds ${expectedPhase.round_start}-${expectedPhase.round_end}, got ${actualPhase.round_start}-${actualPhase.round_end}`,
      );
    }
    if (
      Boolean(actualPhase.recommendations_enabled) !==
      Boolean(expectedPhase.recommendations_enabled)
    ) {
      errors.push(
        `phase ${expectedPhase.id} recommendations_enabled must be ${expectedPhase.recommendations_enabled}`,
      );
    }
  });

  const armMap = new Map(normalized.policy_arms.map((arm) => [arm.id, arm]));
  for (const expectedArm of canonical.policy_arms) {
    const actualArm = armMap.get(expectedArm.id);
    if (!actualArm) {
      errors.push(`missing policy arm ${expectedArm.id}`);
      continue;
    }
    if (Boolean(actualArm.show_recommendations) !== Boolean(expectedArm.show_recommendations)) {
      errors.push(
        `policy arm ${expectedArm.id} show_recommendations must be ${expectedArm.show_recommendations}`,
      );
    }
    if (!sameArray(actualArm.active_phases, expectedArm.active_phases)) {
      errors.push(
        `policy arm ${expectedArm.id} active_phases must be ${expectedArm.active_phases.join(",")}`,
      );
    }
  }

  const exposure = normalized.recommendation_exposure || {};
  if (!sameArray(exposure.active_phase_ids, canonical.recommendation_exposure.active_phase_ids)) {
    errors.push(
      `recommendation_exposure.active_phase_ids must be ${canonical.recommendation_exposure.active_phase_ids.join(",")}`,
    );
  }
  if (
    Number(exposure.expected_shown_bundle_size) !==
    Number(canonical.recommendation_exposure.expected_shown_bundle_size)
  ) {
    warnings.push(
      `expected_shown_bundle_size is ${exposure.expected_shown_bundle_size}; canonical value is ${canonical.recommendation_exposure.expected_shown_bundle_size}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    protocol: normalized,
  };
}

export function validateResearchProtocolSnapshot({
  centralConfig = null,
  scenarioBundle = null,
  studyProtocol = null,
  datasetRoot = "",
} = {}) {
  const protocol = normalizeResearchStudyProtocol(
    studyProtocol ||
      scenarioBundle?.metadata?.researchStudy ||
      scenarioBundle?.metadata?.study_protocol ||
      scenarioBundle?.metadata?.research_protocol ||
      {},
    {
      dataset_root: datasetRoot,
      scenario_set_version_id: normalizeText(
        scenarioBundle?.metadata?.scenarioSetVersionId,
      ),
    },
  );
  const definitionValidation = validateResearchProtocolDefinition(protocol);
  const errors = [...definitionValidation.errors];
  const warnings = [...definitionValidation.warnings];
  const normalizedDatasetRoot = normalizeText(datasetRoot);

  const centralProtocol =
    centralConfig?.research_protocol ??
    centralConfig?.researchProtocol ??
    centralConfig?.study_protocol ??
    null;
  if (centralProtocol && typeof centralProtocol === "object") {
    const centralValidation = validateResearchProtocolDefinition(centralProtocol);
    errors.push(
      ...centralValidation.errors.map((error) => `centralConfig ${error}`),
    );
    warnings.push(
      ...centralValidation.warnings.map((warning) => `centralConfig ${warning}`),
    );
    const centralProtocolVersion = normalizeText(
      centralProtocol?.protocol_version ?? centralProtocol?.version,
      BUNDLEGAME_STUDY_PROTOCOL_VERSION,
    );
    const centralTotalRounds = Math.max(
      0,
      Number(
        centralProtocol?.expected_total_rounds ??
          centralProtocol?.total_rounds ??
          BUNDLEGAME_STUDY_TOTAL_ROUNDS,
      ) || 0,
    );
    if (centralProtocolVersion !== BUNDLEGAME_STUDY_PROTOCOL_VERSION) {
      errors.push(
        `centralConfig research_protocol version must be ${BUNDLEGAME_STUDY_PROTOCOL_VERSION}, got ${centralProtocolVersion}`,
      );
    }
    if (centralTotalRounds !== BUNDLEGAME_STUDY_TOTAL_ROUNDS) {
      errors.push(
        `centralConfig research_protocol expected_total_rounds must be ${BUNDLEGAME_STUDY_TOTAL_ROUNDS}, got ${centralTotalRounds}`,
      );
    }
  }

  const centralDataset = normalizeText(centralConfig?.scenario_set);
  if (centralDataset && normalizedDatasetRoot && centralDataset !== normalizedDatasetRoot) {
    errors.push(
      `centralConfig scenario_set ${centralDataset} does not match datasetRoot ${normalizedDatasetRoot}`,
    );
  }

  const metadata = scenarioBundle?.metadata && typeof scenarioBundle.metadata === "object"
    ? scenarioBundle.metadata
    : {};
  const metadataProtocolVersion = normalizeText(
    metadata?.protocol_version ??
      metadata?.research_protocol_version ??
      metadata?.study_protocol_version,
  );
  if (
    metadataProtocolVersion &&
    metadataProtocolVersion !== BUNDLEGAME_STUDY_PROTOCOL_VERSION
  ) {
    errors.push(
      `dataset metadata protocol version must be ${BUNDLEGAME_STUDY_PROTOCOL_VERSION}, got ${metadataProtocolVersion}`,
    );
  }
  const metadataTotalRounds = Number(
    metadata?.expected_total_rounds ?? metadata?.totalRounds ?? metadata?.total_rounds,
  );
  if (Number.isFinite(metadataTotalRounds) && metadataTotalRounds !== BUNDLEGAME_STUDY_TOTAL_ROUNDS) {
    errors.push(
      `dataset metadata expected_total_rounds must be ${BUNDLEGAME_STUDY_TOTAL_ROUNDS}, got ${metadataTotalRounds}`,
    );
  }

  const scenarios = Array.isArray(scenarioBundle?.scenarios)
    ? scenarioBundle.scenarios
    : null;
  if (scenarios) {
    if (scenarios.length !== BUNDLEGAME_STUDY_TOTAL_ROUNDS) {
      errors.push(
        `scenario dataset must contain ${BUNDLEGAME_STUDY_TOTAL_ROUNDS} scenarios, got ${scenarios.length}`,
      );
    }
    const seenRounds = new Set();
    scenarios.forEach((scenario, index) => {
      const roundIndex = getScenarioRoundIndex(scenario, index);
      if (seenRounds.has(roundIndex)) {
        errors.push(`duplicate scenario round ${roundIndex}`);
      }
      seenRounds.add(roundIndex);
      const expectedPhase = resolveProtocolPhaseForRound(roundIndex, protocol);
      const actualPhase = normalizeText(scenario?.phase);
      if (!expectedPhase) {
        errors.push(`round ${roundIndex} is outside the protocol phase plan`);
        return;
      }
      if (actualPhase && actualPhase !== expectedPhase.id) {
        errors.push(
          `round ${roundIndex} phase must be ${expectedPhase.id}, got ${actualPhase}`,
        );
      }
      if (!expectedPhase.recommendations_enabled && scenarioHasRecommendedFlag(scenario)) {
        errors.push(
          `round ${roundIndex} has recommendation flags outside the recommendation phase`,
        );
      }
    });
    for (let round = 1; round <= BUNDLEGAME_STUDY_TOTAL_ROUNDS; round += 1) {
      if (!seenRounds.has(round)) {
        errors.push(`missing scenario round ${round}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    protocol,
    message: getProtocolValidationMessage(errors),
  };
}

export function assertValidResearchProtocolDefinition(protocol = {}) {
  const validation = validateResearchProtocolDefinition(protocol);
  if (!validation.ok) {
    throw new Error(getProtocolValidationMessage(validation.errors));
  }
  return validation.protocol;
}

export function assertValidResearchProtocolSnapshot(options = {}) {
  const validation = validateResearchProtocolSnapshot(options);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
  return validation;
}

export function normalizeResearchStudySurveyResponse(response = {}, fallback = {}) {
  const source = response && typeof response === "object" ? response : {};
  const surveyQuestions = Array.isArray(fallback?.survey_questions)
    ? fallback.survey_questions
    : buildDefaultSurveyQuestions();
  const getDefault = (id, fallbackValue = 4) => {
    const question = surveyQuestions.find((entry) => entry.id === id);
    return Math.max(
      Number(question?.min ?? 1),
      Math.min(
        Number(question?.max ?? 7),
        Number(
          source?.[id] ??
            source?.ratings?.[id] ??
            fallback?.[id] ??
            fallback?.ratings?.[id] ??
            question?.default_value ??
            fallbackValue,
        ) || fallbackValue,
      ),
    );
  };
  return removeUndefinedDeep({
    response_id: normalizeText(
      source?.response_id ?? source?.id,
      `${normalizeText(source?.response_scope, "session_end")}__${Date.now()}`,
    ),
    response_scope: normalizeText(
      source?.response_scope,
      fallback.response_scope || "session_end",
    ),
    phase: normalizeText(source?.phase, fallback.phase || ""),
    decision_round: Math.max(
      0,
      Number(source?.decision_round ?? fallback.decision_round) || 0,
    ),
    trust_rating: getDefault("trust_rating", 4),
    usefulness_rating: getDefault("usefulness_rating", 4),
    workload_rating: getDefault("workload_rating", 4),
    notes: normalizeText(source?.notes, fallback.notes || ""),
    submitted_at: normalizeIsoString(
      source?.submitted_at || fallback.submitted_at || new Date().toISOString(),
    ),
  });
}

export function normalizeResearchStudyState(state = {}, fallback = {}) {
  const source = state && typeof state === "object" ? state : {};
  const fallbackSource =
    fallback && typeof fallback === "object" ? fallback : {};
  const surveyResponses = Array.isArray(
    source?.survey_responses ?? source?.surveyResponses,
  )
    ? source.survey_responses ?? source.surveyResponses
    : Array.isArray(
          fallbackSource?.survey_responses ?? fallbackSource?.surveyResponses,
        )
      ? fallbackSource.survey_responses ?? fallbackSource.surveyResponses
      : [];
  // CHI dynamic-feedback state: the post-Phase-A strategy survey and the per-block
  // diagnosis history (preserved through normalize so they persist + restore).
  const phaseASurvey = (source?.phase_a_survey ?? fallbackSource?.phase_a_survey) || null;
  const diagnosisHistory = Array.isArray(source?.diagnosis_history)
    ? source.diagnosis_history
    : Array.isArray(fallbackSource?.diagnosis_history)
      ? fallbackSource.diagnosis_history
      : [];
  return removeUndefinedDeep({
    protocol_id: normalizeText(
      source?.protocol_id ?? source?.study_protocol_id,
      fallbackSource.protocol_id || "",
    ),
    dataset_root: normalizeText(
      source?.dataset_root,
      fallbackSource.dataset_root || "",
    ),
    scenario_set_version_id: normalizeText(
      source?.scenario_set_version_id,
      fallbackSource.scenario_set_version_id || "",
    ),
    dataset_snapshot_id: normalizeText(
      source?.dataset_snapshot_id,
      fallbackSource.dataset_snapshot_id || "",
    ),
    assigned_arm: normalizeText(
      source?.assigned_arm ?? source?.policy_arm,
      fallbackSource.assigned_arm || "",
    ),
    assignment_method: normalizeText(
      source?.assignment_method,
      fallbackSource.assignment_method || "stable_hash",
    ),
    assigned_at: normalizeIsoString(
      source?.assigned_at || fallbackSource.assigned_at || "",
    ),
    policy_name: normalizeText(
      source?.policy_name,
      fallbackSource.policy_name || "",
    ),
    policy_version: normalizeText(
      source?.policy_version,
      fallbackSource.policy_version || "",
    ),
    legal_action_mask_version: normalizeText(
      source?.legal_action_mask_version,
      fallbackSource.legal_action_mask_version || DEFAULT_ACTION_MASK_VERSION,
    ),
    target_venue: normalizeText(
      source?.target_venue,
      fallbackSource.target_venue || "",
    ),
    survey_responses: surveyResponses.map((response) =>
      normalizeResearchStudySurveyResponse(response),
    ),
    phase_a_survey: phaseASurvey ? { ...phaseASurvey } : undefined,
    diagnosis_history: diagnosisHistory.map((entry) => ({ ...entry })),
  });
}

export function mergeResearchStudyState(existing = {}, next = {}) {
  const current = normalizeResearchStudyState(existing);
  const incoming = normalizeResearchStudyState(next, current);
  const responseMap = new Map();
  for (const response of [...current.survey_responses, ...incoming.survey_responses]) {
    const key = normalizeText(
      response?.response_id,
      `${normalizeText(response?.response_scope)}__${normalizeText(
        response?.submitted_at,
      )}`,
    );
    if (!key) continue;
    responseMap.set(key, normalizeResearchStudySurveyResponse(response));
  }

  return removeUndefinedDeep({
    ...current,
    ...incoming,
    survey_responses: [...responseMap.values()].sort((left, right) =>
      normalizeText(left?.submitted_at).localeCompare(
        normalizeText(right?.submitted_at),
      ),
    ),
  });
}

// TESTING TOGGLE: when true, the live assignment (buildDefaultStudyState) puts every participant on the
// first recommendation arm so the recommendation UI is always exercised. Applied in the live path only,
// NOT inside assignStudyArm, so the randomization stays pure for unit tests. Set false before the study.
export const FORCE_RECOMMENDATION_ARM_FOR_TESTING = true;
export function firstRecommendationArm(protocol = {}) {
  const normalized = normalizeResearchStudyProtocol(protocol);
  return (normalized.policy_arms || []).find((arm) => arm?.show_recommendations && Math.max(0, Number(arm?.assignment_weight) || 0) > 0) || null;
}

export function assignStudyArm(participantId = "", protocol = {}) {
  const normalizedProtocol = normalizeResearchStudyProtocol(protocol);
  const eligibleArms = normalizedProtocol.policy_arms.filter(
    (arm) => Math.max(0, Number(arm?.assignment_weight) || 0) > 0,
  );
  if (eligibleArms.length === 0) return null;
  const totalWeight = eligibleArms.reduce(
    (sum, arm) => sum + Math.max(0, Number(arm?.assignment_weight) || 0),
    0,
  );
  if (!(totalWeight > 0)) return eligibleArms[0];

  const bucket =
    (stableHashString(
      `${normalizeText(participantId)}::${normalizedProtocol.protocol_id}`,
    ) %
      100000) /
    100000;
  let cumulative = 0;
  for (const arm of eligibleArms) {
    cumulative +=
      Math.max(0, Number(arm?.assignment_weight) || 0) / totalWeight;
    if (bucket <= cumulative + 1e-12) return arm;
  }
  return eligibleArms[eligibleArms.length - 1];
}

export function resolveScenarioStudyPhase(scenario = {}, fallback = "") {
  return normalizeText(
    scenario?.phase ??
      scenario?.study_phase ??
      scenario?.research_phase ??
      fallback,
  );
}

function normalizeRecommendationEntry(entry = {}) {
  const source = entry && typeof entry === "object" ? entry : {};
  const rankedBundles = normalizeRankedBundles(
    source?.ranked_bundles ??
      source?.rankedBundles ??
      source?.shown_ranked_bundles ??
      source?.shownRankedBundles ??
      source?.bundle_ids ??
      source?.bundleIds ??
      source?.recommended_bundle_ids ??
      source?.recommendedBundleIds ??
      [],
  );
  const shownBundleIds =
    rankedBundles[0] ||
    normalizeIdArray(
      source?.shown_bundle_ids ??
        source?.shownBundleIds ??
        source?.bundle_ids ??
        source?.bundleIds ??
        source?.recommended_bundle_ids ??
        source?.recommendedBundleIds ??
        [],
    );
  return removeUndefinedDeep({
    shown_bundle_ids: shownBundleIds,
    ranked_bundles: rankedBundles.length > 0 ? rankedBundles : shownBundleIds.length > 0 ? [shownBundleIds] : [],
    dataset_snapshot_id: normalizeText(source?.dataset_snapshot_id),
    policy_version: normalizeText(source?.policy_version),
    action_mask_version: normalizeText(
      source?.action_mask_version,
      DEFAULT_ACTION_MASK_VERSION,
    ),
    notes: normalizeText(source?.notes),
  });
}

export function normalizeResearchModel(model = {}) {
  const source = model && typeof model === "object" ? model : {};
  const modelType = inferModelType(source);
  const implementationStatus = normalizeImplementationStatus(
    source?.implementation_status ?? source?.implementationStatus ?? source?.status,
    modelType,
    source?.implementation_status,
  );
  const unsupported = modelType === RESEARCH_MODEL_TYPES.UNSUPPORTED;
  const recommendationMap =
    source?.recommendation_map && typeof source.recommendation_map === "object"
      ? source.recommendation_map
      : {};
  return removeUndefinedDeep({
    model_id: normalizeText(source?.model_id ?? source?.id),
    label: normalizeText(source?.label),
    dataset_root: normalizeText(source?.dataset_root),
    dataset_snapshot_id: normalizeText(source?.dataset_snapshot_id),
    algorithm: normalizeText(source?.algorithm),
    policy_name: normalizeText(
      source?.policy_name,
      source?.algorithm || source?.model_id || "",
    ),
    policy_version: normalizeText(source?.policy_version, "v1"),
    model_type: modelType,
    model_type_label: getModelTypeLabel(modelType),
    implementation_status: unsupported
      ? RESEARCH_MODEL_STATUSES.UNSUPPORTED
      : implementationStatus,
    status: normalizeText(
      source?.status,
      unsupported
        ? RESEARCH_MODEL_STATUSES.UNSUPPORTED
        : modelType === RESEARCH_MODEL_TYPES.OFFLINE_RL &&
            implementationStatus === RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED
          ? RESEARCH_MODEL_STATUSES.PLANNED
          : "draft",
    ),
    baseline_ladder_rank: normalizeInteger(source?.baseline_ladder_rank),
    is_active:
      unsupported ||
      implementationStatus === RESEARCH_MODEL_STATUSES.NOT_IMPLEMENTED
        ? false
        : normalizeBoolean(source?.is_active),
    simulation_only: normalizeBoolean(source?.simulation_only),
    action_mask_version: normalizeText(
      source?.action_mask_version,
      DEFAULT_ACTION_MASK_VERSION,
    ),
    training_provenance: normalizeTrainingProvenance(
      source?.training_provenance ?? source?.trainingProvenance,
      {
        ...source,
        implementation_status: implementationStatus,
      },
    ),
    metrics:
      source?.metrics && typeof source.metrics === "object"
        ? removeUndefinedDeep(source.metrics)
        : {},
    artifact_uris: Array.isArray(source?.artifact_uris)
      ? source.artifact_uris.map((entry) => normalizeText(entry)).filter(Boolean)
      : [],
    recommendation_map: Object.fromEntries(
      Object.entries(recommendationMap)
        .map(([scenarioId, entry]) => [
          normalizeText(scenarioId),
          normalizeRecommendationEntry(entry),
        ])
        .filter(([scenarioId]) => Boolean(scenarioId)),
    ),
    unsupported,
    unsupported_reason: unsupported
      ? `Unsupported model type for algorithm ${normalizeText(source?.algorithm ?? source?.policy_name ?? source?.model_id, "unknown")}`
      : "",
    notes: normalizeText(source?.notes),
    created_at: normalizeIsoString(source?.created_at),
    updated_at: normalizeIsoString(source?.updated_at),
  });
}

function toRecommendationCandidates(entry = {}, fallbackBundleIds = []) {
  const normalized = normalizeRecommendationEntry(entry);
  const rankedBundles =
    normalized.ranked_bundles.length > 0
      ? normalized.ranked_bundles
      : normalizeRankedBundles(fallbackBundleIds);
  const shownBundleIds = rankedBundles[0] || normalized.shown_bundle_ids;
  return {
    shown_bundle_ids: shownBundleIds,
    shown_ranked_bundles:
      rankedBundles.length > 0
        ? rankedBundles
        : shownBundleIds.length > 0
          ? [shownBundleIds]
          : [],
    dataset_snapshot_id: normalized.dataset_snapshot_id,
    action_mask_version: normalized.action_mask_version,
    policy_version: normalized.policy_version,
    notes: normalized.notes,
  };
}

function getScenarioRecommendationEntry(scenario = {}, key = "") {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey) return null;
  const nestedSources = [
    scenario?.study_recommendations,
    scenario?.studyRecommendations,
    scenario?.recommendation_by_policy,
    scenario?.recommendationByPolicy,
  ];
  for (const source of nestedSources) {
    if (!source || typeof source !== "object") continue;
    const direct = source?.[normalizedKey];
    if (direct && typeof direct === "object") return direct;
  }

  const compactKey = normalizedKey.replace(/[^a-zA-Z0-9]/g, "");
  const candidates = [
    `${normalizedKey}_recommended_bundle_ids`,
    `${normalizedKey}_recommended_order_ids`,
    `${normalizedKey}_ranked_bundles`,
    `${compactKey}RecommendedBundleIds`,
    `${compactKey}RecommendedOrderIds`,
    `${compactKey}RankedBundles`,
  ];
  for (const candidate of candidates) {
    if (scenario?.[candidate] == null) continue;
    return {
      recommended_bundle_ids: scenario[candidate],
    };
  }
  return null;
}

export function resolveRecommendationSlate({
  scenario = {},
  optimal = {},
  studyProtocol = {},
  studyState = {},
  researchModels = [],
} = {}) {
  const protocol = normalizeResearchStudyProtocol(studyProtocol);
  const state = normalizeResearchStudyState(studyState, {
    protocol_id: protocol.protocol_id,
    dataset_root: protocol.dataset_root,
    scenario_set_version_id: protocol.scenario_set_version_id,
    dataset_snapshot_id: protocol.dataset_snapshot_id,
    target_venue: protocol.target_venue,
  });
  const phase = resolveScenarioStudyPhase(scenario);
  const phaseConfig = protocol.phase_plan.find((entry) => entry.id === phase) || null;
  const assignedArm =
    protocol.policy_arms.find((entry) => entry.id === state.assigned_arm) ||
    protocol.policy_arms.find((entry) => entry.policy_name === state.policy_name) ||
    null;

  const policyName = normalizeText(
    state.policy_name,
    assignedArm?.policy_name || "",
  );
  const policyVersion = normalizeText(
    state.policy_version,
    assignedArm?.policy_version || "",
  );
  const recommendationsEnabled =
    Boolean(protocol.enabled) &&
    Boolean(assignedArm?.show_recommendations) &&
    (!phaseConfig ||
      normalizeBoolean(phaseConfig?.recommendations_enabled, true)) &&
    (!assignedArm?.active_phases?.length || assignedArm.active_phases.includes(phase));

  if (!recommendationsEnabled) {
    return {
      study_protocol_id: state.protocol_id || protocol.protocol_id || "",
      phase,
      policy_arm: state.assigned_arm || assignedArm?.id || "",
      policy_name: policyName,
      policy_version: policyVersion,
      dataset_snapshot_id:
        state.dataset_snapshot_id || protocol.dataset_snapshot_id || "",
      legal_action_mask_version:
        state.legal_action_mask_version ||
        protocol.legal_action_mask_version ||
        DEFAULT_ACTION_MASK_VERSION,
      shown_bundle_ids: [],
      shown_ranked_bundles: [],
      recommendation_source: "none",
      simulation_only: Boolean(assignedArm?.simulation_only),
      notes: "",
    };
  }

  const normalizedModels = Array.isArray(researchModels)
    ? researchModels.map((entry) => normalizeResearchModel(entry))
    : [];
  const activeModel =
    normalizedModels.find(
      (entry) =>
        entry.is_active &&
        normalizeText(entry.policy_name) === normalizeText(policyName) &&
        (!protocol.dataset_root ||
          normalizeText(entry.dataset_root) === normalizeText(protocol.dataset_root)),
    ) || null;

  const fromModel =
    activeModel?.recommendation_map?.[normalizeText(scenario?.scenario_id)] || null;
  const fromScenarioArm =
    getScenarioRecommendationEntry(scenario, state.assigned_arm) ||
    getScenarioRecommendationEntry(scenario, policyName);
  const genericScenario = {
    recommended_bundle_ids:
      scenario?.recommended_bundle_ids ??
      scenario?.recommendedBundleIds ??
      scenario?.recommended_order_ids ??
      scenario?.recommendedOrderIds ??
      [],
    ranked_bundles:
      scenario?.ranked_bundles ??
      scenario?.rankedBundles ??
      scenario?.shown_ranked_bundles ??
      scenario?.shownRankedBundles ??
      [],
  };
  const fallbackOptimal = {
    recommended_bundle_ids: optimal?.best_bundle_ids ?? [],
  };

  const resolved =
    (fromModel &&
      toRecommendationCandidates(fromModel, optimal?.best_bundle_ids ?? [])) ||
    (fromScenarioArm &&
      toRecommendationCandidates(fromScenarioArm, optimal?.best_bundle_ids ?? [])) ||
    toRecommendationCandidates(genericScenario, optimal?.best_bundle_ids ?? []) ||
    toRecommendationCandidates(fallbackOptimal, []);

  const recommendationSource = fromModel
    ? "model_registry"
    : fromScenarioArm
      ? "scenario_policy_metadata"
      : resolved.shown_bundle_ids.length > 0 &&
          normalizeIdArray(genericScenario.recommended_bundle_ids).length > 0
        ? "scenario_generic_metadata"
        : "oracle_fallback";

  return {
    study_protocol_id: state.protocol_id || protocol.protocol_id || "",
    phase,
    policy_arm: state.assigned_arm || assignedArm?.id || "",
    policy_name: policyName,
    policy_version:
      resolved.policy_version || policyVersion || activeModel?.policy_version || "",
    dataset_snapshot_id:
      resolved.dataset_snapshot_id ||
      state.dataset_snapshot_id ||
      activeModel?.dataset_snapshot_id ||
      protocol.dataset_snapshot_id ||
      "",
    legal_action_mask_version:
      resolved.action_mask_version ||
      activeModel?.action_mask_version ||
      state.legal_action_mask_version ||
      protocol.legal_action_mask_version ||
      DEFAULT_ACTION_MASK_VERSION,
    shown_bundle_ids: resolved.shown_bundle_ids,
    shown_ranked_bundles: resolved.shown_ranked_bundles,
    recommendation_source: recommendationSource,
    simulation_only: Boolean(activeModel?.simulation_only || assignedArm?.simulation_only),
    model_id: activeModel?.model_id || "",
    notes: resolved.notes || "",
  };
}

/* ========================================================================== *
 * CHI main study: diagnosis + form-varying scaffolding + transfer.
 *
 * A confirmatory variant of the protocol. Round counts are configurable
 * (default 30: A 1-10 unaided, B 11-20 aided-by-scaffold, C 21-30 unaided
 * shifted transfer) so participants reliably reach Phase C (the pilot maxed
 * out at round 27). Four BETWEEN-SUBJECTS arms vary the explanation FORM while
 * the recommended bundle is held fixed (all treated arms use one policy, the
 * `fixed_recommendation_policy`). Arm id == scaffold_type.
 * ========================================================================== */

// =============================================================================================
// EXPERIMENT 3 of 3 — CHI personalization / dynamic (September). Personalized, diagnosis-driven:
// the diagnosis runs at r15/r25/r35 and re-targets; arms are diagnosis-informed. Scenario set
// chi_dynamic_v1. See docs/current/EXPERIMENTS.md.
// =============================================================================================
export const CHI_STUDY_PROTOCOL_ID = "bundlegame_chi_dynamic_v1";
export const CHI_STUDY_PROTOCOL_VERSION = "bundlegame_chi_dynamic_counterfactual_35_round_v1";
// Dynamic counterfactual-feedback study: 15 unaided diagnostic rounds, then 20
// rounds of Phase B split into four blocks of 5 (ON / OFF / ON / OFF).
export const CHI_DEFAULT_ROUNDS_PER_PHASE = { A: 15, B: 20 };
export const CHI_PHASE_B_BLOCK_SIZE = 5;
// Single fixed recommendation policy shared by every treated arm (bundle invariance).
export const CHI_FIXED_RECOMMENDATION_POLICY = "oracle_optimal";

// Arm ids (four-arm dynamic study, equal assignment, ~100 per arm / ~400 total). `control` is
// unaided throughout; the other three show feedback (ON blocks only). `marginal` re-targets each
// block (dynamic), gated by the sign-survival gate. The `component` arm was dropped.
export const CHI_SCAFFOLD_TYPES = ["marginal", "oracle", "aggregate", "control"];
export const CHI_TREATED_SCAFFOLD_TYPES = ["marginal", "oracle", "aggregate"];
export const CHI_DYNAMIC_SCAFFOLD_TYPES = ["marginal"];

// The two COMMON held-out OFF test sets (identical for every participant/arm,
// disjoint from the training pool). OFF block 1 = retention (same distribution);
// OFF block 2 = transfer (shifted: novel stores, longer travel) — primary outcome.
export const CHI_OFF_TEST_SETS = {
  off1: { id: "retention_same_dist", shift: false, label: "Retention (same distribution)" },
  off2: { id: "transfer_shifted", shift: true, label: "Transfer (shifted distribution)" },
};

export const BUNDLEGAME_CHI_SCAFFOLD_ARMS = [
  {
    id: "marginal",
    label: "Marginal (counterfactual best one-step move, $ + time deltas)",
    feedback_kind: "marginal",
    dynamic: true,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "oracle",
    label: "Oracle (best bundle, no reasoning — deskilling control)",
    feedback_kind: "oracle",
    dynamic: false,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "aggregate",
    label: "Aggregate (scalar $/min rate only — ambiguity control)",
    feedback_kind: "aggregate",
    dynamic: false,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "control",
    label: "Control (unaided throughout)",
    feedback_kind: "none",
    dynamic: false,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: false,
    active_phases: [],
    assignment_weight: 1,
  },
];

/**
 * Phase B's four blocks of size `blockSize` (default 5): ON / OFF / ON / OFF.
 * ON blocks draw training menus and fire feedback; OFF blocks use a COMMON
 * held-out test set and fire no feedback. `roundOffset` = Phase A's round_end.
 */
export function buildChiPhaseBBlocks(totalBRounds, blockSize = CHI_PHASE_B_BLOCK_SIZE, roundOffset = 0) {
  const layout = [
    { id: "B1", kind: "on", feedback_enabled: true, test_set: null },
    { id: "B2", kind: "off", feedback_enabled: false, test_set: CHI_OFF_TEST_SETS.off1.id, rediagnose_after: true },
    { id: "B3", kind: "on", feedback_enabled: true, test_set: null },
    { id: "B4", kind: "off", feedback_enabled: false, test_set: CHI_OFF_TEST_SETS.off2.id, rediagnose_after: true },
  ];
  const per = Math.max(1, Math.floor(totalBRounds / layout.length) || blockSize);
  let cursor = roundOffset + 1;
  return layout.map((blk, i) => {
    const rounds = i === layout.length - 1 ? totalBRounds - per * (layout.length - 1) : per;
    const block = { ...blk, rounds, round_start: cursor, round_end: cursor + rounds - 1 };
    cursor += rounds;
    return block;
  });
}

export function buildChiPhasePlan(roundsPerPhase = CHI_DEFAULT_ROUNDS_PER_PHASE) {
  const a = Math.max(1, Number(roundsPerPhase?.A ?? CHI_DEFAULT_ROUNDS_PER_PHASE.A) || 0);
  const b = Math.max(1, Number(roundsPerPhase?.B ?? CHI_DEFAULT_ROUNDS_PER_PHASE.B) || 0);
  return [
    {
      id: "A",
      label: "Phase A (unaided diagnostic battery)",
      round_start: 1,
      round_end: a,
      rounds: a,
      recommendations_enabled: false,
      survey_after: true, // post-Phase-A survey + first diagnosis
      diagnose_after: true,
    },
    {
      id: "B",
      label: "Phase B (blocked ON/OFF/ON/OFF, dynamic feedback)",
      round_start: a + 1,
      round_end: a + b,
      rounds: b,
      recommendations_enabled: true,
      blocks: buildChiPhaseBBlocks(b, CHI_PHASE_B_BLOCK_SIZE, a),
    },
  ];
}

export function buildChiStudyProtocol(overrides = {}) {
  const roundsPerPhase = overrides?.rounds_per_phase || CHI_DEFAULT_ROUNDS_PER_PHASE;
  const phasePlan = buildChiPhasePlan(roundsPerPhase);
  const totalRounds = phasePlan.reduce((sum, p) => sum + p.rounds, 0);
  return {
    protocol_id: CHI_STUDY_PROTOCOL_ID,
    protocol_version: CHI_STUDY_PROTOCOL_VERSION,
    title: "BundleGame CHI dynamic counterfactual-feedback study",
    expected_total_rounds: totalRounds,
    enabled: true,
    phase_plan: phasePlan,
    policy_arms: BUNDLEGAME_CHI_SCAFFOLD_ARMS.map((arm) => ({ ...arm })),
    recommendation_exposure: {
      active_phase_ids: ["B"],
      // Feedback fires only in Phase B ON blocks; OFF blocks are unaided tests.
      on_block_ids: ["B1", "B3"],
      off_block_ids: ["B2", "B4"],
      treatment_arm_ids: ["marginal", "oracle", "aggregate"],
      control_arm_ids: ["control"],
      dynamic_arm_ids: CHI_DYNAMIC_SCAFFOLD_TYPES.slice(),
      default_ranked_bundles_shown: 1,
      expected_shown_bundle_size: 2,
    },
    off_test_sets: { ...CHI_OFF_TEST_SETS },
    // Conventional top-level survey_questions flow through normalization (runtime
    // survey screen); the schedule lives on Phase A (survey_after) + this marker.
    survey_questions: CHI_POST_PHASE_A_SURVEY.map((q) => ({ ...q })),
    survey: { administered_after_phase: "A", before_first_feedback: true },
    fixed_recommendation_policy: CHI_FIXED_RECOMMENDATION_POLICY,
    legal_action_mask_version: DEFAULT_ACTION_MASK_VERSION,
    // Four arms, equal weights, target ~100 per arm (~400 total) for the main study.
    main_target_n: 400,
    ...(overrides && typeof overrides === "object" ? overrides : {}),
  };
}

export function getChiStudyProtocol(overrides = {}) {
  const base = buildChiStudyProtocol(overrides);
  return normalizeResearchStudyProtocol(base, base);
}

/** Stable, participant-level scaffold-arm assignment (== scaffold_type). */
export function assignScaffoldArm(participantId = "", protocol = buildChiStudyProtocol()) {
  return assignStudyArm(participantId, protocol);
}

/* ========================================================================== *
 * CHI FOUNDATIONAL study: NON-PERSONALIZED between-subjects arms.
 *
 * The foundational study runs the SAME 35-round A/B1/B2/B3/B4 schedule on the
 * redesigned `chi_foundational_v1` menu set, but the diagnosis is DORMANT: the
 * phase plan carries NO survey_after / diagnose_after / rediagnose_after, so
 * diagnoseTrigger() and shouldShowSurvey() return nothing and chiDiagnosis is
 * never constructed. The arms vary the ON-block feedback FORM only; none of them
 * read the diagnosis (Sigma_t / spanning are never called):
 *   - control       : no feedback in the ON blocks.
 *   - counterfactual: the best one-step add/drop/swap on the chosen bundle with
 *                     signed ($, time) deltas (marginalFeedback, NO diagnosed-target
 *                     tie-break) -- exactly the `counterfactual` arm in feedbackForArm.
 *   - aggregate     : ONLY the scalar $/min rate of the chosen trip, no move.
 *   - oracle        : OPTIONAL, behind includeOracle, before-choice b* (not wired by
 *                     default; the renderer is the after-choice oracle message today).
 * ========================================================================== */
// Candidate vehicle for EXPERIMENT 2 of 3 — Enriched 4-order (June 30). The June 30 study runs on
// the enriched buildChiScenarioSet menus; its protocol/arm binding is UNIDENTIFIED (TBD). This
// non-personalized foundational protocol (diagnosis dormant) currently EXISTS and chi_foundational_v1
// is what centralConfig points to live, but whether June 30 reuses it is undecided. See the open
// questions in docs/current/EXPERIMENTS.md.
export const CHI_FOUNDATIONAL_PROTOCOL_ID = "bundlegame_chi_foundational_v1";
export const CHI_FOUNDATIONAL_PROTOCOL_VERSION = "bundlegame_chi_foundational_35_round_v1";
export const CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID = "chi_foundational_v1";
// Default (non-oracle) foundational arms; `oracle` is added only when includeOracle is set.
export const CHI_FOUNDATIONAL_ARM_TYPES = ["control", "counterfactual", "aggregate"];

export const BUNDLEGAME_CHI_FOUNDATIONAL_ARMS = [
  {
    id: "control",
    label: "Control (unaided throughout)",
    feedback_kind: "none",
    dynamic: false,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: false,
    active_phases: [],
    assignment_weight: 1,
  },
  {
    id: "counterfactual",
    label: "Counterfactual (best one-step move on the chosen bundle, signed $ + time deltas)",
    feedback_kind: "counterfactual",
    dynamic: false,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "aggregate",
    label: "Aggregate (scalar $/min rate of the chosen trip only)",
    feedback_kind: "aggregate",
    dynamic: false,
    policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
    policy_version: "v1",
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
];

// The optional before-choice oracle arm (deskilling control). Included ONLY behind the
// includeOracle flag; the before-choice b* DISPLAY is a UI step to add when requested.
export const BUNDLEGAME_CHI_FOUNDATIONAL_ORACLE_ARM = {
  id: "oracle",
  label: "Oracle (before-choice best bundle b*, no reasoning — optional, behind a flag)",
  feedback_kind: "oracle",
  dynamic: false,
  policy_name: CHI_FIXED_RECOMMENDATION_POLICY,
  policy_version: "v1",
  show_recommendations: true,
  active_phases: ["B"],
  assignment_weight: 1,
};

/** Foundational phase plan: same A/B layout, but NO diagnosis/survey triggers (dormant). */
export function buildChiFoundationalPhasePlan(roundsPerPhase = CHI_DEFAULT_ROUNDS_PER_PHASE) {
  const plan = buildChiPhasePlan(roundsPerPhase);
  return plan.map((phase) => {
    if (phase.id === "A") {
      // Drop the diagnosis-feeding survey and the post-Phase-A diagnosis.
      const { survey_after, diagnose_after, ...rest } = phase;
      return rest;
    }
    if (phase.id === "B" && Array.isArray(phase.blocks)) {
      // Drop the per-OFF-block re-diagnosis so diagnoseTrigger never fires.
      return { ...phase, blocks: phase.blocks.map(({ rediagnose_after, ...blk }) => blk) };
    }
    return phase;
  });
}

export function buildChiFoundationalStudyProtocol(overrides = {}) {
  const { includeOracle = false, rounds_per_phase, ...rest } = overrides || {};
  const roundsPerPhase = rounds_per_phase || CHI_DEFAULT_ROUNDS_PER_PHASE;
  const phasePlan = buildChiFoundationalPhasePlan(roundsPerPhase);
  const totalRounds = phasePlan.reduce((sum, p) => sum + p.rounds, 0);
  const arms = includeOracle
    ? [...BUNDLEGAME_CHI_FOUNDATIONAL_ARMS, { ...BUNDLEGAME_CHI_FOUNDATIONAL_ORACLE_ARM }]
    : BUNDLEGAME_CHI_FOUNDATIONAL_ARMS.map((arm) => ({ ...arm }));
  const treatmentArmIds = arms.filter((a) => a.id !== "control").map((a) => a.id);
  return {
    protocol_id: CHI_FOUNDATIONAL_PROTOCOL_ID,
    protocol_version: CHI_FOUNDATIONAL_PROTOCOL_VERSION,
    title: "BundleGame CHI foundational study (non-personalized arms)",
    expected_total_rounds: totalRounds,
    enabled: true,
    // Marker: this protocol does NOT personalize, so the diagnosis stays dormant. Dormancy is
    // enforced structurally by the phase plan (no diagnose_after / rediagnose_after / survey_after).
    personalized: false,
    scenario_set_version_id: CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID,
    dataset_root: CHI_FOUNDATIONAL_SCENARIO_SET_VERSION_ID,
    phase_plan: phasePlan,
    policy_arms: arms,
    recommendation_exposure: {
      active_phase_ids: ["B"],
      on_block_ids: ["B1", "B3"],
      off_block_ids: ["B2", "B4"],
      treatment_arm_ids: treatmentArmIds,
      control_arm_ids: ["control"],
      dynamic_arm_ids: [], // NONE re-target; the diagnosis is dormant
      default_ranked_bundles_shown: 0,
      expected_shown_bundle_size: 2,
    },
    off_test_sets: { ...CHI_OFF_TEST_SETS },
    // No post-Phase-A survey (it feeds the diagnosis, which is dormant here).
    survey: { administered_after_phase: null, before_first_feedback: false },
    fixed_recommendation_policy: CHI_FIXED_RECOMMENDATION_POLICY,
    legal_action_mask_version: DEFAULT_ACTION_MASK_VERSION,
    ...(rest && typeof rest === "object" ? rest : {}),
  };
}

export function getChiFoundationalStudyProtocol(overrides = {}) {
  const base = buildChiFoundationalStudyProtocol(overrides);
  return normalizeResearchStudyProtocol(base, base);
}

/**
 * Validate a foundational protocol: A/B contiguous, the non-personalized arms with control
 * unaided, and -- the point of the foundational study -- the diagnosis stays DORMANT (no
 * survey_after / diagnose_after / rediagnose_after anywhere, and no dynamic arm).
 */
export function validateChiFoundationalStudyProtocol(protocol = buildChiFoundationalStudyProtocol()) {
  const normalized = normalizeResearchStudyProtocol(protocol, protocol);
  const errors = [];
  const phases = normalized.phase_plan || [];
  if (phases.map((p) => p.id).join(",") !== "A,B") errors.push(`phase ids must be A,B`);
  const phaseA = phases.find((p) => p.id === "A");
  const phaseB = phases.find((p) => p.id === "B");
  if (phaseA?.survey_after) errors.push("foundational phase A must NOT administer the survey (diagnosis is dormant)");
  if (phaseA?.diagnose_after) errors.push("foundational phase A must NOT diagnose (diagnosis is dormant)");
  for (const blk of phaseB?.blocks || []) {
    if (blk.rediagnose_after) errors.push(`foundational block ${blk.id} must NOT re-diagnose (diagnosis is dormant)`);
  }
  const armIds = (normalized.policy_arms || []).map((a) => a.id);
  for (const required of CHI_FOUNDATIONAL_ARM_TYPES) {
    if (!armIds.includes(required)) errors.push(`missing foundational arm "${required}"`);
  }
  if ((normalized.policy_arms || []).some((a) => a.dynamic)) errors.push("no foundational arm may be dynamic (none re-targets)");
  const control = (normalized.policy_arms || []).find((a) => a.id === "control");
  if (control && control.show_recommendations) errors.push("control arm must be unaided (show_recommendations false)");
  return { ok: errors.length === 0, errors };
}

/** Stable, participant-level foundational-arm assignment (random across a random id). */
export function assignFoundationalArm(participantId = "", protocol = buildChiFoundationalStudyProtocol()) {
  return assignStudyArm(participantId, protocol);
}

/**
 * Validate a CHI protocol: configurable totals, phases A/B/C contiguous,
 * recommendations only in Phase B, exactly the four scaffold arms, control
 * unaided, and the bundle-invariance guarantee (all treated arms share one
 * fixed recommendation policy).
 */
export function validateChiStudyProtocol(protocol = buildChiStudyProtocol()) {
  const normalized = normalizeResearchStudyProtocol(protocol, protocol);
  const errors = [];

  const phases = normalized.phase_plan;
  const ids = phases.map((p) => p.id).join(",");
  if (ids !== "A,B") errors.push(`phase ids must be A,B, got ${ids}`);
  const total = phases.reduce((sum, p) => sum + Math.max(0, Number(p.rounds) || 0), 0);
  if (total !== normalized.expected_total_rounds) {
    errors.push(`phase rounds total ${total} != expected_total_rounds ${normalized.expected_total_rounds}`);
  }
  let cursor = 1;
  for (const p of phases) {
    if (p.round_start !== cursor) {
      errors.push(`phase ${p.id} must start at round ${cursor}, got ${p.round_start}`);
    }
    cursor = p.round_end + 1;
  }
  for (const p of phases) {
    const shouldEnable = p.id === "B";
    if (Boolean(p.recommendations_enabled) !== shouldEnable) {
      errors.push(`phase ${p.id} recommendations_enabled must be ${shouldEnable}`);
    }
  }

  // Phase A is followed by the survey + first diagnosis (before any feedback).
  const phaseA = phases.find((p) => p.id === "A");
  if (phaseA && (!phaseA.survey_after || !phaseA.diagnose_after)) {
    errors.push("Phase A must schedule the survey and first diagnosis before Phase B");
  }

  // Phase B = four blocks ON/OFF/ON/OFF; feedback ONLY in ON blocks; the two OFF
  // blocks carry the two COMMON held-out test sets (retention, then shifted).
  const phaseB = phases.find((p) => p.id === "B");
  const blocks = Array.isArray(phaseB?.blocks) ? phaseB.blocks : [];
  const kinds = blocks.map((b) => b.kind).join(",");
  if (kinds !== "on,off,on,off") {
    errors.push(`Phase B blocks must be on,off,on,off, got ${kinds || "(none)"}`);
  }
  let bCursor = phaseB ? phaseB.round_start : NaN;
  for (const blk of blocks) {
    if (blk.round_start !== bCursor) {
      errors.push(`block ${blk.id} must start at round ${bCursor}, got ${blk.round_start}`);
    }
    bCursor = blk.round_end + 1;
    const wantFeedback = blk.kind === "on";
    if (Boolean(blk.feedback_enabled) !== wantFeedback) {
      errors.push(`block ${blk.id} feedback_enabled must be ${wantFeedback} (feedback only in ON blocks)`);
    }
    if (blk.kind === "off" && !blk.test_set) {
      errors.push(`OFF block ${blk.id} must reference a common held-out test set`);
    }
  }
  const offSets = blocks.filter((b) => b.kind === "off").map((b) => b.test_set);
  if (offSets.length === 2) {
    if (offSets[0] !== CHI_OFF_TEST_SETS.off1.id) errors.push(`OFF block 1 must be ${CHI_OFF_TEST_SETS.off1.id}`);
    if (offSets[1] !== CHI_OFF_TEST_SETS.off2.id) errors.push(`OFF block 2 (transfer) must be ${CHI_OFF_TEST_SETS.off2.id}`);
    if (offSets[0] === offSets[1]) errors.push("the two OFF test sets must be distinct");
  }

  const armIds = normalized.policy_arms.map((a) => a.id).sort().join(",");
  if (armIds !== "aggregate,control,marginal,oracle") {
    errors.push(`arms must be exactly marginal,oracle,aggregate,control; got ${armIds}`);
  }
  const armById = new Map(normalized.policy_arms.map((a) => [a.id, a]));
  if (armById.get("control")?.show_recommendations) {
    errors.push("control must not show recommendations (unaided throughout)");
  }
  for (const id of CHI_TREATED_SCAFFOLD_TYPES) {
    const arm = armById.get(id);
    if (arm && !arm.show_recommendations) {
      errors.push(`treated arm ${id} must show recommendations`);
    }
  }
  // marginal + component are the dynamic (re-targeting) arms.
  for (const id of CHI_DYNAMIC_SCAFFOLD_TYPES) {
    if (armById.get(id) && !armById.get(id).dynamic) {
      errors.push(`arm ${id} must be dynamic (re-targets each block)`);
    }
  }
  // Bundle-invariance: all treated arms must use the same fixed policy.
  const treatedPolicies = new Set(
    CHI_TREATED_SCAFFOLD_TYPES.map((id) => normalizeText(armById.get(id)?.policy_name)),
  );
  if (treatedPolicies.size !== 1) {
    errors.push(
      `all treated arms must share one fixed recommendation policy; got ${[...treatedPolicies].join(", ")}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    protocol: normalized,
    expected_total_rounds: normalized.expected_total_rounds,
    phase_round_counts: Object.fromEntries(phases.map((p) => [p.id, p.rounds])),
    phase_b_blocks: blocks.map((b) => ({ id: b.id, kind: b.kind, rounds: b.rounds, test_set: b.test_set })),
  };
}

export function assertValidChiStudyProtocol(protocol = buildChiStudyProtocol()) {
  const validation = validateChiStudyProtocol(protocol);
  if (!validation.ok) {
    throw new Error(`CHI protocol invalid: ${validation.errors.join("; ")}`);
  }
  return validation;
}
