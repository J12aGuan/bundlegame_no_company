export const DEFAULT_ACTION_MASK_VERSION = "legal_bundle_mask_v1";

export const BUNDLEGAME_STUDY_PROTOCOL_VERSION = "bundlegame_abc_50_round_v1";
export const BUNDLEGAME_STUDY_PROTOCOL_ID = "bundlegame_abc_recommendation_v1";
export const BUNDLEGAME_STUDY_TOTAL_ROUNDS = 50;

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
    show_recommendations: false,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "contextual_bandit",
    label: "Contextual Bandit",
    policy_name: "contextual_bandit",
    policy_version: "v1",
    show_recommendations: true,
    active_phases: ["B"],
    assignment_weight: 1,
  },
  {
    id: "rl_cql",
    label: "Offline RL (CQL)",
    policy_name: "CQL",
    policy_version: "v1",
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

function normalizeIsoString(value = "") {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  const millis = Date.parse(normalized);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : "";
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
  return {
    id,
    label: normalizeText(arm?.label, fallback.label || id),
    policy_name: policyName,
    policy_version: normalizeText(
      arm?.policy_version ?? arm?.version,
      fallback.policy_version || "v1",
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
  const recommendationMap =
    source?.recommendation_map && typeof source.recommendation_map === "object"
      ? source.recommendation_map
      : {};
  return removeUndefinedDeep({
    model_id: normalizeText(source?.model_id ?? source?.id),
    dataset_root: normalizeText(source?.dataset_root),
    dataset_snapshot_id: normalizeText(source?.dataset_snapshot_id),
    algorithm: normalizeText(source?.algorithm),
    policy_name: normalizeText(
      source?.policy_name,
      source?.algorithm || source?.model_id || "",
    ),
    policy_version: normalizeText(source?.policy_version, "v1"),
    status: normalizeText(source?.status, "draft"),
    is_active: normalizeBoolean(source?.is_active),
    simulation_only: normalizeBoolean(source?.simulation_only),
    action_mask_version: normalizeText(
      source?.action_mask_version,
      DEFAULT_ACTION_MASK_VERSION,
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
