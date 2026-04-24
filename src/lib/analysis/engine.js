import { applySharedItemBundleSavings } from "../bundleTime.js";

export const NEAR_OPTIMAL_THRESHOLD = 0.95;
export const DEFAULT_BOOTSTRAP_B = 500;
export const DEFAULT_RANDOM_SEED = 42;

const TIME_SUMMARY_KEYS = [
  "thinkingTime",
  "startPickingConfirmationTime",
  "aisleTravelTime",
  "itemAddToCartTime",
  "localDeliveryTime",
  "cityTravelTime",
  "penaltyTime",
  "idleOrOtherTime",
];

export const DECISION_FACT_EXPORT_COLUMNS = [
  "dataset_root",
  "participant_id",
  "decision_source",
  "decision_timestamp",
  "timestamp_available",
  "round_coverage_status",
  "round_index",
  "scenario_id",
  "classification",
  "phase",
  "current_city",
  "chosen_orders",
  "best_bundle_ids",
  "second_best_bundle_ids",
  "bundle_size",
  "success",
  "is_failure",
  "duration",
  "participant_earnings",
  "participant_modeled_time",
  "participant_score",
  "best_score",
  "score_ratio_to_best",
  "percent_regret",
  "is_exact_optimal",
  "is_near_optimal",
  "scenario_set_version_id",
  "summary_total_rounds",
  "summary_rounds_completed",
  "summary_optimal_choices",
  "summary_total_game_time",
  "summary_completed_game",
  "progress_completed_scenarios_count",
  "progress_current_round",
  "progress_current_location",
  "progress_in_progress_scenario",
  "scenario_total_time_seconds",
  "thinking_time",
  "start_picking_confirmation_time",
  "aisle_travel_time",
  "item_add_to_cart_time",
  "local_delivery_time",
  "city_travel_time",
  "penalty_time",
  "idle_or_other_time",
  "delivery_runtime_time",
  "non_delivery_runtime_time",
  "runtime_modeled_delta",
  "qa_completed_game_mismatch",
  "qa_missing_recommendation_labels",
];

export const ANALYSIS_MASTER_EXPORT_COLUMNS = [
  "dataset_root",
  "participant_id",
  "decision_source",
  "decision_timestamp",
  "timestamp_available",
  "round_coverage_status",
  "qa_completed_game_mismatch",
  "qa_missing_recommendation_labels",
  "scenario_set_version_id",
  "round_index",
  "phase",
  "phase_progress_index",
  "classification",
  "scenario_id",
  "current_city",
  "scenario_max_bundle",
  "scenario_order_count",
  "scenario_order_ids",
  "shown_recommendation_status",
  "shown_recommendation_bundle_ids",
  "recommendation_quality",
  "followed_recommendation",
  "shown_recommendation_score",
  "shown_recommendation_score_ratio_to_best",
  "shown_recommendation_percent_regret",
  "recommendation_helpful",
  "recommendation_harmful",
  "chosen_orders",
  "best_bundle_ids",
  "second_best_bundle_ids",
  "bundle_size",
  "success",
  "is_failure",
  "duration",
  "participant_earnings",
  "participant_modeled_time",
  "participant_score",
  "best_score",
  "score_ratio_to_best",
  "percent_regret",
  "is_exact_optimal",
  "is_near_optimal",
  "summary_total_rounds",
  "summary_rounds_completed",
  "summary_optimal_choices",
  "summary_total_game_time",
  "summary_completed_game",
  "progress_completed_scenarios_count",
  "progress_current_round",
  "progress_current_location",
  "progress_in_progress_scenario",
  "scenario_total_time_seconds",
  "thinking_time",
  "start_picking_confirmation_time",
  "aisle_travel_time",
  "item_add_to_cart_time",
  "local_delivery_time",
  "city_travel_time",
  "penalty_time",
  "idle_or_other_time",
  "delivery_runtime_time",
  "non_delivery_runtime_time",
  "runtime_modeled_delta",
  "prior_decisions_count",
  "prior_optimal_rate",
  "prior_failure_rate",
  "prior_mean_bundle_size",
  "prior_recommendation_compliance",
  "prior_mean_regret",
  "prior_mean_score_ratio",
  "prior_phase_score_ratio",
  "prior_phase_failure_rate",
  "metadata_join_status",
];

export const POLICY_TRAINING_EXPORT_COLUMNS = [
  "dataset_root",
  "participant_id",
  "round_index",
  "state_decision_source",
  "state_decision_timestamp",
  "state_timestamp_available",
  "state_round_coverage_status",
  "state_qa_completed_game_mismatch",
  "state_qa_missing_recommendation_labels",
  "phase",
  "classification",
  "scenario_id",
  "state_current_city",
  "state_phase_progress_index",
  "state_prior_decisions_count",
  "state_prior_optimal_rate",
  "state_prior_failure_rate",
  "state_prior_recommendation_compliance",
  "state_prior_mean_bundle_size",
  "state_prior_mean_regret",
  "state_prior_mean_score_ratio",
  "state_prior_phase_score_ratio",
  "action_bundle_ids",
  "action_bundle_size",
  "action_score_ratio_to_best",
  "action_percent_regret",
  "action_score",
  "action_modeled_time",
  "action_earnings",
  "action_is_optimal",
  "action_is_near_optimal",
  "action_matches_shown_recommendation",
  "action_recommendation_quality",
  "observed_chosen_action",
  "observed_followed_recommendation",
  "reward_target",
  "observed_reward",
  "next_round_index",
  "next_phase",
  "next_current_city",
  "next_prior_optimal_rate",
  "next_prior_failure_rate",
  "next_prior_mean_regret",
  "done",
];

export const RECOMMENDATION_WORKBENCH_EXPORT_COLUMNS = [
  "dataset_root",
  "participant_id",
  "round_index",
  "phase",
  "classification",
  "scenario_id",
  "baseline_expected_score_ratio",
  "predicted_adoption_probability",
  "predicted_outcome_score_ratio",
  "predicted_expected_score_ratio",
  "predicted_lift_vs_baseline",
  "recommended_bundle_ids",
  "recommended_bundle_size",
  "recommended_bundle_score_ratio_to_best",
  "recommended_bundle_percent_regret",
  "recommended_bundle_is_optimal",
  "historical_chosen_bundle_ids",
  "historical_score_ratio_to_best",
  "oracle_bundle_ids",
  "oracle_score_ratio_to_best",
  "oracle_gap",
  "why_ranked_high",
];

export const RECOMMENDATION_SUMMARY_EXPORT_COLUMNS = [
  "scope",
  "group_value",
  "n_states",
  "mean_baseline_expected_score_ratio",
  "mean_predicted_adoption_probability",
  "mean_predicted_outcome_score_ratio",
  "mean_predicted_expected_score_ratio",
  "mean_predicted_lift_vs_baseline",
  "recommended_optimal_rate",
  "recommended_mean_regret",
  "historical_mean_score_ratio",
  "oracle_mean_score_ratio",
];

export const POLICY_COMPARISON_EXPORT_COLUMNS = [
  "policy_name",
  "scope",
  "group_value",
  "n_states",
  "mean_reward",
  "mean_regret",
  "optimal_rate",
  "mean_bundle_size",
  "mean_lift_vs_historical",
];

export const OPE_SUMMARY_EXPORT_COLUMNS = [
  "policy_name",
  "scope",
  "group_value",
  "n_states",
  "ips",
  "snips",
  "direct_method",
  "doubly_robust",
  "fqe_one_step",
  "match_rate",
  "mean_target_propensity",
];

export const SANDBOX_SUMMARY_EXPORT_COLUMNS = [
  "policy_name",
  "simulation_label",
  "n_states",
  "iterations",
  "seed",
  "mean_simulated_reward",
  "simulated_reward_ci_low",
  "simulated_reward_ci_high",
  "mean_gap_vs_historical",
];

export const RESEARCH_FEATURE_VERSION = "research_v2";
export const DATASET_SNAPSHOT_SCHEMA_VERSION = 1;

export function getDecisionFactExportColumns(cohortField = "") {
  const columns = [...DECISION_FACT_EXPORT_COLUMNS];
  const normalized = String(cohortField || "").trim();
  if (normalized && !columns.includes(normalized)) columns.push(normalized);
  return columns;
}

function appendUniqueColumns(columns = [], extras = []) {
  const out = [...columns];
  for (const entry of extras) {
    const key = String(entry || "").trim();
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

export function getAnalysisMasterExportColumns(
  cohortField = "",
  metadataFields = [],
) {
  return appendUniqueColumns(
    appendUniqueColumns(ANALYSIS_MASTER_EXPORT_COLUMNS, [cohortField]),
    metadataFields,
  );
}

export function getPolicyTrainingExportColumns(extraFields = []) {
  return appendUniqueColumns(POLICY_TRAINING_EXPORT_COLUMNS, extraFields);
}

export function getRecommendationWorkbenchExportColumns() {
  return [...RECOMMENDATION_WORKBENCH_EXPORT_COLUMNS];
}

export function getRecommendationSummaryExportColumns() {
  return [...RECOMMENDATION_SUMMARY_EXPORT_COLUMNS];
}

export function getPolicyComparisonExportColumns() {
  return [...POLICY_COMPARISON_EXPORT_COLUMNS];
}

export function getOpeSummaryExportColumns() {
  return [...OPE_SUMMARY_EXPORT_COLUMNS];
}

export function getSandboxSummaryExportColumns() {
  return [...SANDBOX_SUMMARY_EXPORT_COLUMNS];
}

function makeIssue({
  severity = "warning",
  issue_type = "unknown",
  participant_id = "",
  round_index = null,
  scenario_id = "",
  message = "",
} = {}) {
  return {
    severity,
    issue_type,
    participant_id,
    round_index,
    scenario_id,
    message,
  };
}

function normalizeClassification(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "easy" || normalized === "medium" || normalized === "hard")
    return normalized;
  return "unclassified";
}

function valueToFloat(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function timestampToFloat(value) {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t / 1000 : 0;
  }
  if (typeof value?.toDate === "function") {
    const t = value.toDate()?.getTime?.();
    return Number.isFinite(t) ? t / 1000 : 0;
  }
  if (typeof value === "object") {
    const seconds = Number(value.seconds);
    const nanoseconds = Number(value.nanoseconds || 0);
    if (Number.isFinite(seconds)) {
      return (
        seconds +
        (Number.isFinite(nanoseconds) ? nanoseconds / 1_000_000_000 : 0)
      );
    }
  }
  return 0;
}

function percentile(values = [], q = 0.5) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const xs = [...values].sort((a, b) => a - b);
  if (xs.length === 1) return xs[0];
  const idx = (xs.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.min(xs.length - 1, lo + 1);
  const frac = idx - lo;
  return xs[lo] * (1 - frac) + xs[hi] * frac;
}

function summarizeContinuous(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      n: 0,
      mean: null,
      median: null,
      q1: null,
      q3: null,
      iqr: null,
    };
  }
  const n = values.length;
  const mean = values.reduce((acc, x) => acc + x, 0) / n;
  const median = percentile(values, 0.5);
  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  return {
    n,
    mean,
    median,
    q1,
    q3,
    iqr: q1 == null || q3 == null ? null : q3 - q1,
  };
}

function summarizeRate(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return { n: 0, x: 0, rate: null };
  }
  const x = values.reduce((acc, v) => acc + (Number(v) > 0 ? 1 : 0), 0);
  return {
    n: values.length,
    x,
    rate: x / values.length,
  };
}

function wilsonInterval(x, n, z = 1.959963984540054) {
  if (!Number.isFinite(x) || !Number.isFinite(n) || n <= 0) return [null, null];
  const p = x / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function createRng(seed = DEFAULT_RANDOM_SEED) {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function bootstrapCI(
  values = [],
  statistic = "median",
  b = DEFAULT_BOOTSTRAP_B,
  seed = DEFAULT_RANDOM_SEED,
) {
  if (!Array.isArray(values) || values.length === 0) return [null, null];
  if (values.length === 1) return [values[0], values[0]];
  if (statistic !== "median" && statistic !== "mean") return [null, null];

  const rng = createRng(seed);
  const n = values.length;
  const samples = [];
  const rounds = Math.max(1, Number(b) || 1);

  for (let i = 0; i < rounds; i += 1) {
    const resample = [];
    for (let j = 0; j < n; j += 1) {
      resample.push(values[Math.floor(rng() * n)]);
    }
    samples.push(
      statistic === "median"
        ? percentile(resample, 0.5)
        : summarizeContinuous(resample).mean,
    );
  }

  samples.sort((a, b2) => a - b2);
  const loIdx = Math.floor(0.025 * (samples.length - 1));
  const hiIdx = Math.floor(0.975 * (samples.length - 1));
  return [samples[loIdx], samples[hiIdx]];
}

function erfApprox(x) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absX);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(x) {
  return 0.5 * (1 + erfApprox(x / Math.sqrt(2)));
}

function twoProportionZTest(x1, n1, x2, n2) {
  if (Math.min(n1, n2) <= 0) return { diff: null, z: null, p_value: null };
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(Math.max(0, pooled * (1 - pooled) * (1 / n1 + 1 / n2)));
  if (se === 0) return { diff: p1 - p2, z: null, p_value: null };
  const z = (p1 - p2) / se;
  return {
    diff: p1 - p2,
    z,
    p_value: 2 * (1 - normalCdf(Math.abs(z))),
  };
}

function bootstrapDiffMedianCI(
  valuesA = [],
  valuesB = [],
  b = DEFAULT_BOOTSTRAP_B,
  seed = DEFAULT_RANDOM_SEED,
) {
  if (!valuesA.length || !valuesB.length) return [null, null, null];
  const rng = createRng(seed);
  const na = valuesA.length;
  const nb = valuesB.length;
  const rounds = Math.max(1, Number(b) || 1);
  const diffs = [];

  for (let i = 0; i < rounds; i += 1) {
    const sampleA = [];
    const sampleB = [];
    for (let j = 0; j < na; j += 1)
      sampleA.push(valuesA[Math.floor(rng() * na)]);
    for (let j = 0; j < nb; j += 1)
      sampleB.push(valuesB[Math.floor(rng() * nb)]);
    const medA = percentile(sampleA, 0.5);
    const medB = percentile(sampleB, 0.5);
    diffs.push((medA ?? 0) - (medB ?? 0));
  }

  diffs.sort((a, b2) => a - b2);
  const point =
    (percentile(valuesA, 0.5) ?? 0) - (percentile(valuesB, 0.5) ?? 0);
  const loIdx = Math.floor(0.025 * (diffs.length - 1));
  const hiIdx = Math.floor(0.975 * (diffs.length - 1));
  return [point, diffs[loIdx], diffs[hiIdx]];
}

function getCrossCityExtraTime(
  orderCity = "",
  currentCity = "",
  citiesDataset = {},
  storeDataset = {},
) {
  if (!orderCity || !currentCity || orderCity === currentCity) return 0;

  const direct = citiesDataset?.travelTimes?.[currentCity]?.[orderCity];
  if (Number.isFinite(Number(direct)) && Number(direct) > 0)
    return Number(direct);

  const row = storeDataset?.distances?.[currentCity] || {};
  const destinations = Array.isArray(row.destinations) ? row.destinations : [];
  const distances = Array.isArray(row.distances) ? row.distances : [];
  const idx = destinations.indexOf(orderCity);
  if (idx < 0) return 0;
  const value = Number(distances[idx]);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function computeModeledBundleTime(
  bundleOrders = [],
  currentCity = "",
  citiesDataset = {},
  storeDataset = {},
) {
  let simulatedCity = String(currentCity || "");
  const orderTimes = [];

  for (const order of bundleOrders) {
    const base = Math.max(0, Number(order?.estimatedTime) || 0);
    const extra = getCrossCityExtraTime(
      String(order?.city || ""),
      simulatedCity,
      citiesDataset,
      storeDataset,
    );
    orderTimes.push(base + extra);
    if (order?.city) simulatedCity = String(order.city);
  }

  const discounted = applySharedItemBundleSavings(bundleOrders, orderTimes, {
    storeDataset,
  });
  return Math.max(0, Number(discounted?.discountedTotalTime) || 0);
}

function scoreBundle({
  bundleIds = [],
  ordersById = {},
  currentCity = "",
  citiesDataset = {},
  storeDataset = {},
  earningsOverride = null,
} = {}) {
  const missingOrderIds = bundleIds.filter((orderId) => !ordersById[orderId]);
  if (missingOrderIds.length > 0) {
    return {
      missing_order_ids: missingOrderIds,
      modeled_time: null,
      earnings: null,
      score: null,
    };
  }

  const bundleOrders = bundleIds.map((orderId) => ordersById[orderId]);
  const modeledTime = computeModeledBundleTime(
    bundleOrders,
    currentCity,
    citiesDataset,
    storeDataset,
  );
  const earnings =
    earningsOverride != null
      ? Number(earningsOverride)
      : bundleOrders.reduce(
          (acc, order) => acc + (Number(order?.earnings) || 0),
          0,
        );
  const score = modeledTime > 0 ? earnings / modeledTime : null;
  return {
    missing_order_ids: [],
    modeled_time: modeledTime,
    earnings,
    score,
  };
}

function timestampToIsoString(value = null) {
  const seconds = timestampToFloat(value);
  if (!(seconds > 0)) return "";
  return new Date(seconds * 1000).toISOString();
}

function getDecisionKey(participantId = "", roundIndex = 0) {
  return `${String(participantId || "").trim()}::${Number(roundIndex) || 0}`;
}

function getLatestRoundSummaries(participants = []) {
  const decisions = [];
  const qaIssues = [];

  for (const participant of participants) {
    const participantId = String(participant?.id || "");
    const actions = Array.isArray(participant?.actions)
      ? participant.actions
      : [];
    const summaries = [];

    for (const action of actions) {
      if (!action || action.type !== "round_summary") continue;
      const roundIndex = Number(action.round_index);
      if (!Number.isInteger(roundIndex)) continue;
      const stamp =
        timestampToFloat(action.updatedAt) ||
        timestampToFloat(action.createdAt);
      summaries.push({ roundIndex, action, stamp });
    }

    const grouped = new Map();
    for (const row of summaries) {
      const bucket = grouped.get(row.roundIndex) || [];
      bucket.push(row);
      grouped.set(row.roundIndex, bucket);
    }

    for (const [roundIndex, rows] of grouped.entries()) {
      rows.sort((a, b) => a.stamp - b.stamp);
      const winner = rows[rows.length - 1]?.action || {};
      if (rows.length > 1) {
        qaIssues.push(
          makeIssue({
            severity: "warning",
            issue_type: "duplicate_round_summary",
            participant_id: participantId,
            round_index: roundIndex,
            message: `Found ${rows.length} round_summary actions; latest kept.`,
          }),
        );
      }

      const chosenOrders = Array.isArray(winner.chosen_orders)
        ? winner.chosen_orders.map((x) => String(x))
        : [];
      const timestamp =
        timestampToIsoString(winner.updatedAt) ||
        timestampToIsoString(winner.createdAt);
      const decision = {
        participant_id: participantId,
        round_index: roundIndex,
        decision_source: "round_summary",
        source_scenario_set_version_id: String(
          winner?.scenarioSetVersionId || "",
        ).trim(),
        decision_timestamp: timestamp || null,
        timestamp_available: Number(Boolean(timestamp)),
        round_coverage_status: timestamp
          ? "timestamped_round_summary"
          : "round_summary_missing_timestamp",
        chosen_orders: chosenOrders,
        success: Boolean(winner.success),
        duration: Number(winner.duration) || 0,
        participant_earnings: Number(winner.earnings) || 0,
        current_city: String(
          winner.current_city ||
            winner.starting_city ||
            winner?.state_snapshot?.current_city ||
            "",
        ),
        final_location: String(winner.final_location || ""),
        scenario_id: String(winner.scenario_id || ""),
        classification: String(winner.classification || ""),
        phase: String(winner.phase || ""),
        shown_recommendation_bundle_ids: normalizeIdArray(
          winner.shown_recommendation_bundle_ids ||
            winner.recommended_bundle_ids ||
            winner?.state_snapshot?.shown_recommendation_bundle_ids,
        ),
        recommendation_quality: String(
          winner.recommendation_quality ||
            winner?.state_snapshot?.recommendation_quality ||
            "",
        ),
        stamp:
          timestampToFloat(winner.updatedAt) ||
          timestampToFloat(winner.createdAt),
      };
      decisions.push(decision);
    }
  }

  decisions.sort((a, b) => {
    if (a.participant_id !== b.participant_id)
      return a.participant_id.localeCompare(b.participant_id);
    return a.round_index - b.round_index;
  });

  return { decisions, qaIssues };
}

function getActionSummaryReconstructedDecisions({
  participants = [],
  scenarioBundle = {},
  scenarioSetVersionId = "",
  startingLocation = "",
} = {}) {
  const decisions = [];
  const qaIssues = [];
  const { ordersById, optimalByScenario } = buildIndexes(scenarioBundle);
  const { byId: scenarioById } = getScenarioLookup(scenarioBundle);

  for (const participant of participants) {
    const participantId = String(participant?.id || "");
    if (!participantId) continue;

    const versionState = getParticipantVersionState(
      participant,
      scenarioSetVersionId,
    );
    const actionsByScenarioId =
      versionState?.actionsEntry?.actionsByScenarioId &&
      typeof versionState.actionsEntry.actionsByScenarioId === "object"
        ? versionState.actionsEntry.actionsByScenarioId
        : {};
    const completedScenarios = new Set(
      normalizeScenarioIdList(versionState?.progressEntry?.completedScenarios),
    );
    const roundsCompleted = Math.max(
      0,
      Number(versionState?.summaryEntry?.roundsCompleted) ||
        Number(versionState?.progressEntry?.roundsCompleted) ||
        0,
    );

    const scenarioRows = Object.entries(actionsByScenarioId)
      .map(([scenarioId, entry]) => {
        const scenario = scenarioById[String(scenarioId || "")] || null;
        return {
          scenarioId: String(scenarioId || ""),
          scenario,
          roundIndex: Number(scenario?.round),
          entry,
        };
      })
      .filter(
        (row) =>
          row?.scenario &&
          Number.isInteger(row?.roundIndex) &&
          row?.entry &&
          Array.isArray(row.entry.orderSummary) &&
          row.entry.orderSummary.length > 0,
      )
      .sort((left, right) => left.roundIndex - right.roundIndex);

    let currentCity = String(startingLocation || "");

    for (const row of scenarioRows) {
      const chosenOrders = normalizeIdArray(row?.entry?.orderSummary);
      if (chosenOrders.length === 0) continue;

      const scenarioId = String(row?.scenarioId || "");
      const roundIndex = Number(row?.roundIndex);
      const scenario = row?.scenario || {};
      const optimal = optimalByScenario[scenarioId] || {};
      const confirmedSuccess =
        completedScenarios.has(scenarioId) || roundsCompleted >= roundIndex;

      if (!confirmedSuccess) {
        qaIssues.push(
          makeIssue({
            severity: "warning",
            issue_type: "reconstructed_round_excluded_unconfirmed_success",
            participant_id: participantId,
            round_index: roundIndex,
            scenario_id: scenarioId,
            message:
              "Skipped an action-summary reconstruction row because success could not be confirmed from progress/summary state.",
          }),
        );
        continue;
      }

      const normalizedTimeSummary = normalizeStoredTimeSummary(
        row?.entry?.timeSummary,
      );
      const totalTime =
        valueToFloat(row?.entry?.totalTimeSeconds) ??
        sumTimeSummary(normalizedTimeSummary) ??
        0;
      const participantEarnings = chosenOrders.reduce(
        (sum, orderId) => sum + (Number(ordersById?.[orderId]?.earnings) || 0),
        0,
      );
      const inferredFinalLocation = chosenOrders.length
        ? String(
            ordersById?.[chosenOrders[chosenOrders.length - 1]]?.city ||
              currentCity ||
              "",
          )
        : String(currentCity || "");
      const shownRecommendationBundleIds = getScenarioRecommendationBundleIds(
        scenario,
        ordersById,
        optimal,
      );

      decisions.push({
        participant_id: participantId,
        round_index: roundIndex,
        decision_source: "action_summary_reconstructed",
        decision_timestamp: null,
        timestamp_available: 0,
        round_coverage_status: "reconstructed_action_summary",
        chosen_orders: chosenOrders,
        success: true,
        duration: Number(totalTime) || 0,
        participant_earnings: participantEarnings,
        current_city: currentCity,
        final_location: inferredFinalLocation,
        scenario_id: scenarioId,
        classification: String(scenario?.classification || ""),
        phase: String(scenario?.phase || ""),
        shown_recommendation_bundle_ids: shownRecommendationBundleIds,
        recommendation_quality: shownRecommendationBundleIds.length
          ? "unknown"
          : "none",
        stamp: 0,
      });

      if (inferredFinalLocation) currentCity = inferredFinalLocation;
    }
  }

  decisions.sort((a, b) => {
    if (a.participant_id !== b.participant_id)
      return a.participant_id.localeCompare(b.participant_id);
    return a.round_index - b.round_index;
  });

  return { decisions, qaIssues };
}

function mergeDecisionSources(
  roundSummaryDecisions = [],
  reconstructedDecisions = [],
) {
  const qaIssues = [];
  const merged = new Map();

  for (const decision of reconstructedDecisions) {
    merged.set(
      getDecisionKey(decision?.participant_id, decision?.round_index),
      decision,
    );
  }

  for (const decision of roundSummaryDecisions) {
    const key = getDecisionKey(decision?.participant_id, decision?.round_index);
    const existing = merged.get(key);
    if (existing) {
      const bundleMismatch =
        bundleSignature(existing?.chosen_orders) !==
        bundleSignature(decision?.chosen_orders);
      const successMismatch =
        Number(Boolean(existing?.success)) !== Number(Boolean(decision?.success));
      if (bundleMismatch || successMismatch) {
        qaIssues.push(
          makeIssue({
            severity: "warning",
            issue_type: "decision_source_conflict",
            participant_id: String(decision?.participant_id || ""),
            round_index: Number(decision?.round_index),
            scenario_id: String(
              decision?.scenario_id || existing?.scenario_id || "",
            ),
            message:
              "round_summary and reconstructed action summary disagreed; the timestamped round_summary row was kept.",
          }),
        );
      }
    }
    merged.set(key, {
      ...(existing || {}),
      ...decision,
      current_city: String(
        decision?.current_city || existing?.current_city || "",
      ),
      final_location: String(
        decision?.final_location || existing?.final_location || "",
      ),
      scenario_id: String(decision?.scenario_id || existing?.scenario_id || ""),
      classification: String(
        decision?.classification || existing?.classification || "",
      ),
      phase: String(decision?.phase || existing?.phase || ""),
      shown_recommendation_bundle_ids: normalizeIdArray(
        decision?.shown_recommendation_bundle_ids ||
          existing?.shown_recommendation_bundle_ids,
      ),
      recommendation_quality: String(
        decision?.recommendation_quality || existing?.recommendation_quality || "",
      ),
    });
  }

  return {
    decisions: [...merged.values()].sort((a, b) => {
      if (a.participant_id !== b.participant_id)
        return a.participant_id.localeCompare(b.participant_id);
      return a.round_index - b.round_index;
    }),
    qaIssues,
  };
}

function buildIndexes(scenarioBundle = {}) {
  const scenarios = Array.isArray(scenarioBundle?.scenarios)
    ? scenarioBundle.scenarios
    : [];
  const orders = Array.isArray(scenarioBundle?.orders)
    ? scenarioBundle.orders
    : [];
  const optimal = Array.isArray(scenarioBundle?.optimal)
    ? scenarioBundle.optimal
    : [];

  const scenarioByRound = {};
  for (const scenario of scenarios) {
    const round = Number(scenario?.round);
    if (!Number.isInteger(round)) continue;
    scenarioByRound[round] = scenario;
  }

  const ordersById = {};
  for (const order of orders) {
    const id = String(order?.id || "");
    if (!id) continue;
    ordersById[id] = order;
  }

  const optimalByScenario = {};
  for (const entry of optimal) {
    const scenarioId = String(entry?.scenario_id || "");
    if (!scenarioId) continue;
    optimalByScenario[scenarioId] = entry;
  }

  return { scenarioByRound, ordersById, optimalByScenario };
}

function checkMultiStoreBundle(chosenOrders = [], ordersById = {}) {
  if (!Array.isArray(chosenOrders) || chosenOrders.length <= 1) return false;
  const stores = chosenOrders
    .map((id) => String(ordersById[id]?.store || ""))
    .filter(Boolean);
  return new Set(stores).size > 1;
}

function collectRate(rows = [], key = "") {
  return rows
    .map((row) => row?.[key])
    .filter((value) => value !== null && value !== undefined)
    .map((value) => (Number(value) > 0 ? 1 : 0));
}

function collectContinuous(rows = [], key = "", excludeFailures = true) {
  const values = [];
  for (const row of rows) {
    if (excludeFailures && Number(row?.is_failure) === 1) continue;
    const value = valueToFloat(row?.[key]);
    if (value != null) values.push(value);
  }
  return values;
}

function buildKpiRows(rows = [], groupKey = null, options = {}) {
  const bootstrapB = Number(options.bootstrapB) || DEFAULT_BOOTSTRAP_B;
  const seed = Number(options.seed) || DEFAULT_RANDOM_SEED;
  const groups = new Map();
  if (!groupKey) {
    groups.set("overall", rows);
  } else {
    for (const row of rows) {
      const value = String(row?.[groupKey] ?? "");
      const bucket = groups.get(value) || [];
      bucket.push(row);
      groups.set(value, bucket);
    }
  }

  const output = [];
  for (const [groupValue, groupRows] of groups.entries()) {
    const exactVals = collectRate(groupRows, "is_exact_optimal");
    const nearVals = collectRate(groupRows, "is_near_optimal");
    const failVals = collectRate(groupRows, "is_failure");

    const exact = summarizeRate(exactVals);
    const near = summarizeRate(nearVals);
    const fail = summarizeRate(failVals);

    const [exactLow, exactHigh] = exact.n
      ? wilsonInterval(exact.x, exact.n)
      : [null, null];
    const [nearLow, nearHigh] = near.n
      ? wilsonInterval(near.x, near.n)
      : [null, null];
    const [failLow, failHigh] = fail.n
      ? wilsonInterval(fail.x, fail.n)
      : [null, null];

    const ratioVals = collectContinuous(groupRows, "score_ratio_to_best");
    const regretVals = collectContinuous(groupRows, "percent_regret");
    const durationVals = collectContinuous(groupRows, "duration", false);
    const modeledVals = collectContinuous(
      groupRows,
      "participant_modeled_time",
    );

    const ratioSummary = summarizeContinuous(ratioVals);
    const regretSummary = summarizeContinuous(regretVals);
    const durationSummary = summarizeContinuous(durationVals);
    const modeledSummary = summarizeContinuous(modeledVals);

    const [ratioMeanLow, ratioMeanHigh] = bootstrapCI(
      ratioVals,
      "mean",
      bootstrapB,
      seed,
    );
    const [ratioMedianLow, ratioMedianHigh] = bootstrapCI(
      ratioVals,
      "median",
      bootstrapB,
      seed,
    );
    const [regretMeanLow, regretMeanHigh] = bootstrapCI(
      regretVals,
      "mean",
      bootstrapB,
      seed,
    );
    const [regretMedianLow, regretMedianHigh] = bootstrapCI(
      regretVals,
      "median",
      bootstrapB,
      seed,
    );

    output.push({
      [groupKey || "scope"]: groupValue,
      n_decisions: groupRows.length,
      n_non_failure_for_continuous: ratioVals.length,
      exact_optimal_rate: exact.rate,
      exact_optimal_rate_ci_low: exactLow,
      exact_optimal_rate_ci_high: exactHigh,
      near_optimal_rate: near.rate,
      near_optimal_rate_ci_low: nearLow,
      near_optimal_rate_ci_high: nearHigh,
      failure_rate: fail.rate,
      failure_rate_ci_low: failLow,
      failure_rate_ci_high: failHigh,
      score_ratio_to_best_mean: ratioSummary.mean,
      score_ratio_to_best_mean_ci_low: ratioMeanLow,
      score_ratio_to_best_mean_ci_high: ratioMeanHigh,
      score_ratio_to_best_median: ratioSummary.median,
      score_ratio_to_best_median_ci_low: ratioMedianLow,
      score_ratio_to_best_median_ci_high: ratioMedianHigh,
      score_ratio_to_best_q1: ratioSummary.q1,
      score_ratio_to_best_q3: ratioSummary.q3,
      score_ratio_to_best_iqr: ratioSummary.iqr,
      percent_regret_mean: regretSummary.mean,
      percent_regret_mean_ci_low: regretMeanLow,
      percent_regret_mean_ci_high: regretMeanHigh,
      percent_regret_median: regretSummary.median,
      percent_regret_median_ci_low: regretMedianLow,
      percent_regret_median_ci_high: regretMedianHigh,
      percent_regret_q1: regretSummary.q1,
      percent_regret_q3: regretSummary.q3,
      percent_regret_iqr: regretSummary.iqr,
      duration_mean: durationSummary.mean,
      duration_median: durationSummary.median,
      duration_q1: durationSummary.q1,
      duration_q3: durationSummary.q3,
      duration_iqr: durationSummary.iqr,
      participant_modeled_time_mean: modeledSummary.mean,
      participant_modeled_time_median: modeledSummary.median,
    });
  }

  if (groupKey === "round_index") {
    output.sort((a, b) => Number(a.round_index) - Number(b.round_index));
  } else if (groupKey) {
    output.sort((a, b) =>
      String(a[groupKey]).localeCompare(String(b[groupKey])),
    );
  }

  return output;
}

const TIMING_KPI_SPECS = [
  { key: "scenario_total_time_seconds", out: "scenario_total_time_seconds" },
  { key: "participant_modeled_time", out: "participant_modeled_time" },
  { key: "runtime_modeled_delta", out: "runtime_modeled_delta" },
  { key: "delivery_runtime_time", out: "delivery_runtime_time" },
  { key: "non_delivery_runtime_time", out: "non_delivery_runtime_time" },
  { key: "thinking_time", out: "thinking_time" },
  {
    key: "start_picking_confirmation_time",
    out: "start_picking_confirmation_time",
  },
  { key: "aisle_travel_time", out: "aisle_travel_time" },
  { key: "item_add_to_cart_time", out: "item_add_to_cart_time" },
  { key: "local_delivery_time", out: "local_delivery_time" },
  { key: "city_travel_time", out: "city_travel_time" },
  { key: "penalty_time", out: "penalty_time" },
  { key: "idle_or_other_time", out: "idle_or_other_time" },
];

function buildTimingKpiRows(rows = [], groupKey = null) {
  const groups = new Map();
  if (!groupKey) {
    groups.set("overall", rows);
  } else {
    for (const row of rows) {
      const value = String(row?.[groupKey] ?? "");
      const bucket = groups.get(value) || [];
      bucket.push(row);
      groups.set(value, bucket);
    }
  }

  const out = [];
  for (const [groupValue, groupRows] of groups.entries()) {
    const row = {
      [groupKey || "scope"]: groupValue,
      n_decisions: groupRows.length,
      n_rows_with_runtime_timing: collectContinuous(
        groupRows,
        "scenario_total_time_seconds",
        false,
      ).length,
    };
    for (const spec of TIMING_KPI_SPECS) {
      const values = collectContinuous(groupRows, spec.key, false);
      const summary = summarizeContinuous(values);
      row[`${spec.out}_mean`] = summary.mean;
      row[`${spec.out}_median`] = summary.median;
      row[`${spec.out}_q1`] = summary.q1;
      row[`${spec.out}_q3`] = summary.q3;
      row[`${spec.out}_iqr`] = summary.iqr;
    }
    out.push(row);
  }

  if (groupKey === "round_index") {
    out.sort((a, b) => Number(a.round_index) - Number(b.round_index));
  } else if (groupKey) {
    out.sort((a, b) => String(a[groupKey]).localeCompare(String(b[groupKey])));
  }

  return out;
}

function buildCohortComparisons(
  rows = [],
  cohortKey = "configuration",
  options = {},
) {
  const bootstrapB = Number(options.bootstrapB) || DEFAULT_BOOTSTRAP_B;
  const seed = Number(options.seed) || DEFAULT_RANDOM_SEED;
  const grouped = new Map();

  for (const row of rows) {
    const cohortValue = row?.[cohortKey];
    if (cohortValue == null || cohortValue === "") continue;
    const key = String(cohortValue);
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const cohorts = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
  const out = [];
  for (let i = 0; i < cohorts.length; i += 1) {
    for (let j = i + 1; j < cohorts.length; j += 1) {
      const a = cohorts[i];
      const b = cohorts[j];
      const rowsA = grouped.get(a) || [];
      const rowsB = grouped.get(b) || [];

      const exactA = collectRate(rowsA, "is_exact_optimal");
      const exactB = collectRate(rowsB, "is_exact_optimal");
      const nearA = collectRate(rowsA, "is_near_optimal");
      const nearB = collectRate(rowsB, "is_near_optimal");
      const failA = collectRate(rowsA, "is_failure");
      const failB = collectRate(rowsB, "is_failure");

      const ratioA = collectContinuous(rowsA, "score_ratio_to_best");
      const ratioB = collectContinuous(rowsB, "score_ratio_to_best");
      const regretA = collectContinuous(rowsA, "percent_regret");
      const regretB = collectContinuous(rowsB, "percent_regret");

      const exactTest = twoProportionZTest(
        exactA.reduce((acc, v) => acc + v, 0),
        exactA.length,
        exactB.reduce((acc, v) => acc + v, 0),
        exactB.length,
      );
      const nearTest = twoProportionZTest(
        nearA.reduce((acc, v) => acc + v, 0),
        nearA.length,
        nearB.reduce((acc, v) => acc + v, 0),
        nearB.length,
      );
      const failTest = twoProportionZTest(
        failA.reduce((acc, v) => acc + v, 0),
        failA.length,
        failB.reduce((acc, v) => acc + v, 0),
        failB.length,
      );

      const [ratioPoint, ratioLow, ratioHigh] = bootstrapDiffMedianCI(
        ratioA,
        ratioB,
        bootstrapB,
        seed,
      );
      const [regretPoint, regretLow, regretHigh] = bootstrapDiffMedianCI(
        regretA,
        regretB,
        bootstrapB,
        seed,
      );

      out.push({
        cohort_col: cohortKey,
        cohort_a: a,
        cohort_b: b,
        n_a: rowsA.length,
        n_b: rowsB.length,
        exact_rate_diff: exactTest.diff,
        exact_rate_z: exactTest.z,
        exact_rate_p_value: exactTest.p_value,
        near_rate_diff: nearTest.diff,
        near_rate_z: nearTest.z,
        near_rate_p_value: nearTest.p_value,
        failure_rate_diff: failTest.diff,
        failure_rate_z: failTest.z,
        failure_rate_p_value: failTest.p_value,
        ratio_median_diff: ratioPoint,
        ratio_median_diff_ci_low: ratioLow,
        ratio_median_diff_ci_high: ratioHigh,
        regret_median_diff: regretPoint,
        regret_median_diff_ci_low: regretLow,
        regret_median_diff_ci_high: regretHigh,
      });
    }
  }

  return out;
}

function rowsToMap(rows = [], key = "") {
  const out = {};
  for (const row of rows) {
    out[String(row?.[key] ?? "")] = row;
  }
  return out;
}

function createEmptyTimeSummary() {
  return {
    thinkingTime: 0,
    startPickingConfirmationTime: 0,
    aisleTravelTime: 0,
    itemAddToCartTime: 0,
    localDeliveryTime: 0,
    cityTravelTime: 0,
    penaltyTime: 0,
    idleOrOtherTime: 0,
  };
}

function normalizeStoredTimeSummary(summary = null) {
  if (!summary || typeof summary !== "object") return null;
  const out = createEmptyTimeSummary();
  for (const key of TIME_SUMMARY_KEYS) {
    out[key] = Math.max(0, Number(summary?.[key]) || 0);
  }
  return out;
}

function sumTimeSummary(summary = null) {
  if (!summary) return null;
  return Object.values(summary).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
}

function getScenarioSetVersionId(scenarioBundle = {}) {
  return String(scenarioBundle?.metadata?.scenarioSetVersionId || "").trim();
}

function getVersionMap(doc = null, key = "") {
  if (!doc || typeof doc !== "object") return {};
  const map = doc?.[key];
  return map && typeof map === "object" ? map : {};
}

function normalizeScenarioIdList(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.map((entry) => String(entry ?? "").trim()).filter(Boolean),
    ),
  ];
}

function getParticipantVersionState(
  participant = {},
  scenarioSetVersionId = "",
) {
  if (!scenarioSetVersionId) {
    return {
      summaryEntry: null,
      progressEntry: null,
      actionsEntry: null,
    };
  }

  const summaryMap = getVersionMap(
    participant?.summaryDoc || participant?.progressSummary,
    "summaryByScenarioSetVersionId",
  );
  const progressMap = getVersionMap(
    participant?.scenarioSetProgressDoc,
    "progressByScenarioSetVersionId",
  );
  const actionsMap = getVersionMap(
    participant?.scenarioActionsDoc,
    "actionsByScenarioSetVersionId",
  );

  const summaryEntry =
    summaryMap?.[scenarioSetVersionId] &&
    typeof summaryMap[scenarioSetVersionId] === "object"
      ? summaryMap[scenarioSetVersionId]
      : null;
  const progressEntry =
    progressMap?.[scenarioSetVersionId] &&
    typeof progressMap[scenarioSetVersionId] === "object"
      ? progressMap[scenarioSetVersionId]
      : null;
  const actionsEntry =
    actionsMap?.[scenarioSetVersionId] &&
    typeof actionsMap[scenarioSetVersionId] === "object"
      ? actionsMap[scenarioSetVersionId]
      : null;

  return { summaryEntry, progressEntry, actionsEntry };
}

function createDataHealth({
  scenarioSetVersionId = "",
  legacyMode = false,
  participantStates = {},
  decisionFacts = [],
} = {}) {
  const states = Object.values(participantStates);
  const participantsWithVersionSummary = states.filter(
    (state) => state.summaryEntry,
  ).length;
  const participantsWithVersionProgress = states.filter(
    (state) => state.progressEntry,
  ).length;
  const participantsWithVersionActions = states.filter(
    (state) => state.actionsEntry,
  ).length;
  const participantsWithAnyVersionState = states.filter(
    (state) => state.summaryEntry || state.progressEntry || state.actionsEntry,
  ).length;
  const participantsWithCompleteVersionState = states.filter(
    (state) => state.summaryEntry && state.progressEntry && state.actionsEntry,
  ).length;

  return {
    datasetScenarioSetVersionId: scenarioSetVersionId,
    legacyMode,
    participantsLoaded: states.length,
    participantsWithVersionSummary,
    participantsWithVersionProgress,
    participantsWithVersionActions,
    participantsWithAnyVersionState,
    participantsWithCompleteVersionState,
    decisionRowsWithTiming: decisionFacts.filter(
      (row) => valueToFloat(row.scenario_total_time_seconds) != null,
    ).length,
    decisionRowsMissingTiming: decisionFacts.filter(
      (row) => valueToFloat(row.scenario_total_time_seconds) == null,
    ).length,
    timestampedDecisionRows: decisionFacts.filter(
      (row) => Number(row?.timestamp_available) === 1,
    ).length,
    reconstructedDecisionRows: decisionFacts.filter(
      (row) => String(row?.decision_source || "") === "action_summary_reconstructed",
    ).length,
    rowSourceCounts: decisionFacts.reduce((counts, row) => {
      const key = String(row?.decision_source || "unknown");
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {}),
  };
}

export function buildDecisionFacts({
  participants = [],
  scenarioBundle = {},
  datasetRoot = "",
  citiesDataset = {},
  storeDataset = {},
  cohortField = "configuration",
} = {}) {
  const { decisions: roundSummaryDecisions, qaIssues: roundSummaryIssues } =
    getLatestRoundSummaries(participants);
  const qaIssues = [...roundSummaryIssues];
  const issueKeys = new Set();
  const { scenarioByRound, ordersById, optimalByScenario } =
    buildIndexes(scenarioBundle);
  const { byId: scenarioById } = getScenarioLookup(scenarioBundle);
  const participantMap = rowsToMap(participants, "id");
  const participantCity = {};
  const participantStates = {};

  const metadataStart = String(
    scenarioBundle?.metadata?.startinglocation || "",
  );
  const citiesStart = String(citiesDataset?.startinglocation || "");
  const startingLocation = citiesStart || metadataStart;
  const scenarioSetVersionId = getScenarioSetVersionId(scenarioBundle);
  const legacyMode = !scenarioSetVersionId;
  const compatibleRoundSummaryDecisions = roundSummaryDecisions.filter(
    (decision) => {
      const sourceVersion = String(
        decision?.source_scenario_set_version_id || "",
      ).trim();
      if (legacyMode || !sourceVersion || sourceVersion === scenarioSetVersionId)
        return true;
      qaIssues.push(
        makeIssue({
          issue_type: "round_summary_dataset_mismatch",
          participant_id: String(decision?.participant_id || ""),
          round_index: Number(decision?.round_index) || null,
          scenario_id: String(decision?.scenario_id || ""),
          message: `Skipped round_summary tagged with scenarioSetVersionId "${sourceVersion}" while analyzing "${scenarioSetVersionId}".`,
        }),
      );
      return false;
    },
  );
  const datasetHasRecommendationLabels = Object.values(scenarioByRound).some(
    (scenario) =>
      getScenarioRecommendationBundleIds(
        scenario,
        ordersById,
        optimalByScenario[String(scenario?.scenario_id || "")] || {},
      ).length > 0,
  );

  for (const participant of participants) {
    const participantId = String(participant?.id || "");
    if (!participantId) continue;
    participantStates[participantId] = getParticipantVersionState(
      participant,
      scenarioSetVersionId,
    );
  }

  const {
    decisions: reconstructedDecisions,
    qaIssues: reconstructedIssues,
  } = getActionSummaryReconstructedDecisions({
    participants,
    scenarioBundle,
    scenarioSetVersionId,
    startingLocation,
  });
  qaIssues.push(...reconstructedIssues);

  const {
    decisions,
    qaIssues: mergeIssues,
  } = mergeDecisionSources(
    compatibleRoundSummaryDecisions,
    reconstructedDecisions,
  );
  qaIssues.push(...mergeIssues);

  function pushIssueOnce(key, issue) {
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    qaIssues.push(issue);
  }

  if (legacyMode) {
    pushIssueOnce(
      "missing_dataset_scenario_set_version_id",
      makeIssue({
        severity: "warning",
        issue_type: "missing_dataset_scenario_set_version_id",
        message:
          "Selected dataset metadata has no scenarioSetVersionId; timing/progress enrichment is disabled.",
      }),
    );
  }

  if (!datasetHasRecommendationLabels) {
    pushIssueOnce(
      "dataset_missing_recommendation_labels",
      makeIssue({
        severity: "warning",
        issue_type: "dataset_missing_recommendation_labels",
        message:
          "Dataset scenarios do not include recommendation-treatment labels; treat this dataset as benchmark-only for recommendation research.",
      }),
    );
  }

  const missingClassificationScenarios = new Set();
  const factRows = [];

  for (const decision of decisions) {
    const participantId = decision.participant_id;
    const roundIndex = Number(decision.round_index);
    const chosenOrders = Array.isArray(decision.chosen_orders)
      ? decision.chosen_orders
      : [];
    const success = Boolean(decision.success);
    const participant = participantMap[participantId] || {};
    const versionState = participantStates[participantId] || {
      summaryEntry: null,
      progressEntry: null,
      actionsEntry: null,
    };

    if (!legacyMode) {
      if (!versionState.summaryEntry) {
        pushIssueOnce(
          `missing_version_matched_summary_entry:${participantId}`,
          makeIssue({
            severity: "warning",
            issue_type: "missing_version_matched_summary_entry",
            participant_id: participantId,
            message: `No summary entry matched scenarioSetVersionId "${scenarioSetVersionId}".`,
          }),
        );
      }
      if (!versionState.progressEntry) {
        pushIssueOnce(
          `missing_version_matched_progress_entry:${participantId}`,
          makeIssue({
            severity: "warning",
            issue_type: "missing_version_matched_progress_entry",
            participant_id: participantId,
            message: `No progress entry matched scenarioSetVersionId "${scenarioSetVersionId}".`,
          }),
        );
      }
      if (!versionState.actionsEntry) {
        pushIssueOnce(
          `missing_version_matched_action_summary_entry:${participantId}`,
          makeIssue({
            severity: "warning",
            issue_type: "missing_version_matched_action_summary_entry",
            participant_id: participantId,
            message: `No action summary entry matched scenarioSetVersionId "${scenarioSetVersionId}".`,
          }),
        );
      }
    }

    let currentCity =
      String(decision?.current_city || "") ||
      participantCity[participantId] ||
      startingLocation;
    if (!currentCity && chosenOrders.length > 0) {
      currentCity = String(ordersById[chosenOrders[0]]?.city || "");
    }

    const scenario =
      scenarioById[String(decision?.scenario_id || "")] ||
      scenarioByRound[roundIndex];
    if (!scenario) {
      qaIssues.push(
        makeIssue({
          severity: "error",
          issue_type: "missing_scenario_for_round",
          participant_id: participantId,
          round_index: roundIndex,
          message: "No scenario entry found for round.",
        }),
      );
      continue;
    }

    const scenarioId = String(
      decision?.scenario_id || scenario?.scenario_id || "",
    );
    const optimal = optimalByScenario[scenarioId];
    if (!optimal) {
      qaIssues.push(
        makeIssue({
          severity: "error",
          issue_type: "missing_optimal_for_scenario",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message: "No optimal entry found for scenario_id.",
        }),
      );
      continue;
    }

    const classification = normalizeClassification(scenario?.classification);
    if (
      classification === "unclassified" &&
      !missingClassificationScenarios.has(scenarioId)
    ) {
      missingClassificationScenarios.add(scenarioId);
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "missing_classification",
          participant_id: "",
          round_index: roundIndex,
          scenario_id: scenarioId,
          message:
            'Scenario missing classification; assigned to "unclassified".',
        }),
      );
    }

    const allowedIds = new Set(
      (Array.isArray(scenario?.order_ids) ? scenario.order_ids : []).map((x) =>
        String(x),
      ),
    );
    const unknownChosen = chosenOrders.filter(
      (orderId) => !allowedIds.has(orderId),
    );
    if (unknownChosen.length > 0) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "unknown_chosen_order_ids",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message: `Chosen orders not in scenario order_ids: ${JSON.stringify(unknownChosen)}`,
        }),
      );
    }

    if (checkMultiStoreBundle(chosenOrders, ordersById)) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "invalid_bundle_store_mismatch",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message: "Selected multi-order bundle spans multiple stores.",
        }),
      );
    }

    const canonicalParticipantEarnings = chosenOrders.reduce((acc, orderId) => {
      return acc + (Number(ordersById[orderId]?.earnings) || 0);
    }, 0);
    const loggedParticipantEarnings = valueToFloat(decision.participant_earnings);
    const participantEarnings = canonicalParticipantEarnings;
    if (
      loggedParticipantEarnings != null &&
      Math.abs(loggedParticipantEarnings - canonicalParticipantEarnings) > 0.01
    ) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "round_summary_earnings_mismatch",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message:
            "Logged round_summary earnings differed from canonical order earnings; analytics used canonical order earnings for scoring.",
        }),
      );
    }

    const candidates = evaluateCandidateBundles({
      scenario,
      optimal,
      ordersById,
      currentCity,
      citiesDataset,
      storeDataset,
    });
    const dynamicBestCandidate = candidates[0] || null;
    const dynamicSecondBestCandidate = candidates[1] || null;
    const storedBestSignature = bundleSignature(optimal?.best_bundle_ids);
    const dynamicBestSignature = bundleSignature(dynamicBestCandidate?.bundleIds);
    if (
      dynamicBestCandidate &&
      storedBestSignature &&
      dynamicBestSignature &&
      storedBestSignature !== dynamicBestSignature
    ) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "stored_optimal_mismatch",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message:
            "Stored optimal bundle does not match the dynamically recomputed oracle under the current scoring model.",
        }),
      );
    }

    const participantEval = scoreBundle({
      bundleIds: chosenOrders,
      ordersById,
      currentCity,
      citiesDataset,
      storeDataset,
      earningsOverride: participantEarnings,
    });
    const reportedParticipantEarnings = success
      ? canonicalParticipantEarnings
      : loggedParticipantEarnings ?? 0;

    const bestBundleIds = normalizeIdArray(dynamicBestCandidate?.bundleIds);
    const secondBestBundleIds = normalizeIdArray(
      dynamicSecondBestCandidate?.bundleIds,
    );

    const participantScore = participantEval.score;
    const bestScore = dynamicBestCandidate?.score ?? null;

    let scoreRatioToBest = null;
    let percentRegret = null;
    if (participantScore != null && bestScore != null && bestScore > 0) {
      scoreRatioToBest = participantScore / bestScore;
      percentRegret = 1 - scoreRatioToBest;
    }

    let isExactOptimal = Number(
      chosenOrders.length === bestBundleIds.length &&
        chosenOrders.every((id, idx) => id === bestBundleIds[idx]),
    );
    let isNearOptimal = Number(
      scoreRatioToBest != null && scoreRatioToBest >= NEAR_OPTIMAL_THRESHOLD,
    );
    let participantModeledTime = participantEval.modeled_time;
    let participantScoreFinal = participantScore;
    let scoreRatioFinal = scoreRatioToBest;
    let percentRegretFinal = percentRegret;
    if (!success) {
      isExactOptimal = 0;
      isNearOptimal = 0;
      participantModeledTime = null;
      participantScoreFinal = null;
      scoreRatioFinal = null;
      percentRegretFinal = null;
    }

    const summaryEntry = versionState.summaryEntry;
    const progressEntry = versionState.progressEntry;
    const qaCompletedGameMismatch = Number(
      Boolean(summaryEntry?.completedGame) &&
        valueToFloat(summaryEntry?.totalRounds) != null &&
        valueToFloat(summaryEntry?.roundsCompleted) != null &&
        Number(summaryEntry.totalRounds) > 0 &&
        Number(summaryEntry.roundsCompleted) < Number(summaryEntry.totalRounds),
    );
    if (qaCompletedGameMismatch) {
      pushIssueOnce(
        `qa_completed_game_mismatch:${participantId}`,
        makeIssue({
          severity: "warning",
          issue_type: "qa_completed_game_mismatch",
          participant_id: participantId,
          message:
            "Summary marked completedGame=true even though roundsCompleted is below totalRounds.",
        }),
      );
    }
    const actionsByScenarioId =
      versionState.actionsEntry?.actionsByScenarioId &&
      typeof versionState.actionsEntry.actionsByScenarioId === "object"
        ? versionState.actionsEntry.actionsByScenarioId
        : {};
    const rawTimingEntry =
      actionsByScenarioId?.[scenarioId] &&
      typeof actionsByScenarioId[scenarioId] === "object"
        ? actionsByScenarioId[scenarioId]
        : null;

    if (!legacyMode && versionState.actionsEntry && !rawTimingEntry) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "missing_per_scenario_timing_entry",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message: `No action timing entry matched scenario "${scenarioId}" for scenarioSetVersionId "${scenarioSetVersionId}".`,
        }),
      );
    }

    const normalizedTimeSummary = normalizeStoredTimeSummary(
      rawTimingEntry?.timeSummary,
    );
    const explicitTotal = valueToFloat(rawTimingEntry?.totalTimeSeconds);
    const computedTotal = sumTimeSummary(normalizedTimeSummary);
    let scenarioTotalTimeSeconds = explicitTotal;
    if (scenarioTotalTimeSeconds == null && computedTotal != null) {
      scenarioTotalTimeSeconds = computedTotal;
    }
    if (
      explicitTotal != null &&
      computedTotal != null &&
      Math.abs(explicitTotal - computedTotal) > 0.25
    ) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "timing_total_mismatch",
          participant_id: participantId,
          round_index: roundIndex,
          scenario_id: scenarioId,
          message: `Stored totalTimeSeconds (${explicitTotal}) differs from timeSummary sum (${computedTotal}).`,
        }),
      );
    }

    const thinkingTime = normalizedTimeSummary?.thinkingTime ?? null;
    const startPickingConfirmationTime =
      normalizedTimeSummary?.startPickingConfirmationTime ?? null;
    const aisleTravelTime = normalizedTimeSummary?.aisleTravelTime ?? null;
    const itemAddToCartTime = normalizedTimeSummary?.itemAddToCartTime ?? null;
    const localDeliveryTime = normalizedTimeSummary?.localDeliveryTime ?? null;
    const cityTravelTime = normalizedTimeSummary?.cityTravelTime ?? null;
    const penaltyTime = normalizedTimeSummary?.penaltyTime ?? null;
    const idleOrOtherTime = normalizedTimeSummary?.idleOrOtherTime ?? null;
    const deliveryRuntimeTime = normalizedTimeSummary
      ? (normalizedTimeSummary.localDeliveryTime || 0) +
        (normalizedTimeSummary.cityTravelTime || 0)
      : null;
    const nonDeliveryRuntimeTime = normalizedTimeSummary
      ? (normalizedTimeSummary.thinkingTime || 0) +
        (normalizedTimeSummary.startPickingConfirmationTime || 0) +
        (normalizedTimeSummary.aisleTravelTime || 0) +
        (normalizedTimeSummary.itemAddToCartTime || 0) +
        (normalizedTimeSummary.penaltyTime || 0) +
        (normalizedTimeSummary.idleOrOtherTime || 0)
      : null;
    const runtimeModeledDelta =
      scenarioTotalTimeSeconds != null && participantModeledTime != null
        ? scenarioTotalTimeSeconds - participantModeledTime
        : null;

    const row = {
      dataset_root: datasetRoot,
      participant_id: participantId,
      decision_source: String(decision?.decision_source || "round_summary"),
      decision_timestamp: decision?.decision_timestamp || null,
      timestamp_available: Number(Boolean(decision?.timestamp_available)),
      round_coverage_status:
        String(decision?.round_coverage_status || "").trim() ||
        (decision?.decision_source === "action_summary_reconstructed"
          ? "reconstructed_action_summary"
          : "timestamped_round_summary"),
      round_index: roundIndex,
      scenario_id: scenarioId,
      classification,
      phase: String(decision.phase || scenario?.phase || ""),
      current_city: currentCity,
      chosen_orders: chosenOrders,
      best_bundle_ids: bestBundleIds,
      second_best_bundle_ids: secondBestBundleIds,
      bundle_size: chosenOrders.length,
      success: Number(success),
      is_failure: Number(!success),
      duration: Number(decision.duration) || 0,
      participant_earnings: reportedParticipantEarnings,
      participant_modeled_time: participantModeledTime,
      participant_score: participantScoreFinal,
      best_score: bestScore,
      score_ratio_to_best: scoreRatioFinal,
      percent_regret: percentRegretFinal,
      is_exact_optimal: isExactOptimal,
      is_near_optimal: isNearOptimal,
      scenario_set_version_id: scenarioSetVersionId || null,
      summary_total_rounds: valueToFloat(summaryEntry?.totalRounds),
      summary_rounds_completed: valueToFloat(summaryEntry?.roundsCompleted),
      summary_optimal_choices: valueToFloat(summaryEntry?.optimalChoices),
      summary_total_game_time: valueToFloat(summaryEntry?.totalGameTime),
      summary_completed_game:
        summaryEntry == null
          ? null
          : Number(Boolean(summaryEntry?.completedGame)),
      progress_completed_scenarios_count: progressEntry
        ? normalizeScenarioIdList(progressEntry?.completedScenarios).length
        : null,
      progress_current_round: valueToFloat(progressEntry?.currentRound),
      progress_current_location: progressEntry
        ? String(progressEntry?.currentLocation || "")
        : null,
      progress_in_progress_scenario: progressEntry
        ? String(progressEntry?.inProgressScenario || "")
        : null,
      scenario_total_time_seconds: scenarioTotalTimeSeconds,
      thinking_time: thinkingTime,
      start_picking_confirmation_time: startPickingConfirmationTime,
      aisle_travel_time: aisleTravelTime,
      item_add_to_cart_time: itemAddToCartTime,
      local_delivery_time: localDeliveryTime,
      city_travel_time: cityTravelTime,
      penalty_time: penaltyTime,
      idle_or_other_time: idleOrOtherTime,
      delivery_runtime_time: deliveryRuntimeTime,
      non_delivery_runtime_time: nonDeliveryRuntimeTime,
      runtime_modeled_delta: runtimeModeledDelta,
      qa_completed_game_mismatch: qaCompletedGameMismatch,
      qa_missing_recommendation_labels: Number(!datasetHasRecommendationLabels),
      [cohortField]: participant?.[cohortField],
    };
    factRows.push(row);

    if (success && decision.final_location) {
      participantCity[participantId] = String(decision.final_location);
    }
  }

  return {
    decisionFacts: factRows,
    qaIssues,
    dataHealth: createDataHealth({
      scenarioSetVersionId,
      legacyMode,
      participantStates,
      decisionFacts: factRows,
    }),
  };
}

const RESERVED_METADATA_FIELDS = new Set([
  "id",
  "participant_id",
  "liveSessionId",
  "live_session_id",
  "__metadataJoinStatus",
  "__metadataJoinMatchedValue",
  "__metadataJoinMethod",
]);

function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(Number(value))) return min;
  return Math.min(max, Math.max(min, Number(value)));
}

function mean(values = []) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeIdArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return normalizeIdArray(parsed);
    } catch {
      // Fall through to split-based normalization.
    }
    return trimmed
      .split(/[|,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function bundleSignature(bundleIds = []) {
  return [...normalizeIdArray(bundleIds)]
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

function parseNumeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function makeMetadataIssue(
  message = "",
  issueType = "metadata_issue",
  severity = "warning",
) {
  return makeIssue({
    severity,
    issue_type: issueType,
    message,
  });
}

function mergeParticipantMetadata(
  participants = [],
  metadataRows = [],
  {
    metadataJoinKey = "participant_id",
    participantJoinKey = "id",
    metadataSessionKey = "",
    participantSessionKey = "liveSessionId",
  } = {},
) {
  const normalizedRows = Array.isArray(metadataRows)
    ? metadataRows.filter(
        (row) => row && typeof row === "object" && !Array.isArray(row),
      )
    : [];

  if (normalizedRows.length === 0) {
    return {
      participants: participants.map((participant) => ({
        ...participant,
        __metadataJoinStatus: "none",
      })),
      metadataFields: [],
      qaIssues: [],
    };
  }

  const primaryKey =
    String(metadataJoinKey || "participant_id").trim() || "participant_id";
  const participantKey = String(participantJoinKey || "id").trim() || "id";
  const sessionKey = String(metadataSessionKey || "").trim();
  const participantSession =
    String(participantSessionKey || "liveSessionId").trim() || "liveSessionId";

  const metadataFields = [
    ...new Set(
      normalizedRows
        .flatMap((row) => Object.keys(row || {}))
        .filter((key) => !RESERVED_METADATA_FIELDS.has(key)),
    ),
  ];

  const primaryLookup = new Map();
  const fallbackLookup = new Map();

  for (const row of normalizedRows) {
    const joinValue = String(row?.[primaryKey] ?? "").trim();
    if (joinValue && !primaryLookup.has(joinValue))
      primaryLookup.set(joinValue, row);
    const fallbackValue = sessionKey
      ? String(row?.[sessionKey] ?? "").trim()
      : "";
    if (fallbackValue && !fallbackLookup.has(fallbackValue))
      fallbackLookup.set(fallbackValue, row);
  }

  let matchedCount = 0;
  let fallbackCount = 0;
  let unmatchedCount = 0;

  const mergedParticipants = participants.map((participant) => {
    const participantValue = String(participant?.[participantKey] ?? "").trim();
    const participantSessionValue = String(
      participant?.[participantSession] ?? "",
    ).trim();
    let matchedRow = participantValue
      ? primaryLookup.get(participantValue)
      : null;
    let method = "none";

    if (matchedRow) {
      method = "participant_id";
    } else if (sessionKey && participantSessionValue) {
      matchedRow = fallbackLookup.get(participantSessionValue) || null;
      if (matchedRow) method = "session_fallback";
    }

    if (matchedRow) {
      matchedCount += 1;
      if (method === "session_fallback") fallbackCount += 1;
    } else {
      unmatchedCount += 1;
    }

    const merged = { ...participant };
    for (const field of metadataFields) {
      if (RESERVED_METADATA_FIELDS.has(field)) continue;
      if (matchedRow && matchedRow[field] !== undefined) {
        merged[field] = matchedRow[field];
      }
    }

    merged.__metadataJoinStatus = matchedRow ? method : "unmatched";
    return merged;
  });

  const qaIssues = [];
  if (unmatchedCount > 0) {
    qaIssues.push(
      makeMetadataIssue(
        `${unmatchedCount} participant rows could not be matched to uploaded metadata using "${primaryKey}"${sessionKey ? ` or "${sessionKey}"` : ""}.`,
        "failed_metadata_join",
      ),
    );
  }
  if (fallbackCount > 0) {
    qaIssues.push(
      makeMetadataIssue(
        `${fallbackCount} metadata joins used the explicit session fallback "${sessionKey}".`,
        "metadata_session_fallback_used",
      ),
    );
  }

  return {
    participants: mergedParticipants,
    metadataFields,
    qaIssues,
    metadataSummary: {
      rowsLoaded: normalizedRows.length,
      matchedParticipants: matchedCount,
      unmatchedParticipants: unmatchedCount,
      fallbackMatches: fallbackCount,
    },
  };
}

function getScenarioLookup(scenarioBundle = {}) {
  const scenarios = Array.isArray(scenarioBundle?.scenarios)
    ? scenarioBundle.scenarios
    : [];
  const byId = {};
  const byPhase = {};

  for (const scenario of scenarios) {
    const scenarioId = String(scenario?.scenario_id || "").trim();
    if (scenarioId) byId[scenarioId] = scenario;
    const phase = String(scenario?.phase || "").trim() || "Unknown";
    const round = Number(scenario?.round);
    const bucket = byPhase[phase] || [];
    if (Number.isInteger(round)) bucket.push(round);
    byPhase[phase] = bucket;
  }

  for (const key of Object.keys(byPhase)) {
    byPhase[key].sort((left, right) => left - right);
  }

  return { byId, byPhase };
}

function getScenarioRecommendationBundleIds(
  scenario = {},
  ordersById = {},
  optimal = {},
) {
  const directKeys = [
    "recommended_order_ids",
    "recommendedOrderIds",
    "recommended_orders",
    "recommendedOrders",
    "recommended_bundle_ids",
    "recommendedBundleIds",
  ];

  for (const key of directKeys) {
    const normalized = normalizeIdArray(scenario?.[key]);
    if (normalized.length > 0) return normalized;
  }

  const optimalKeys = ["recommended_bundle_ids", "recommendedBundleIds"];
  for (const key of optimalKeys) {
    const normalized = normalizeIdArray(optimal?.[key]);
    if (normalized.length > 0) return normalized;
  }

  const scenarioOrderIds = normalizeIdArray(scenario?.order_ids);
  const flagged = scenarioOrderIds.filter((orderId) =>
    Boolean(ordersById?.[orderId]?.recommended),
  );
  return flagged;
}

function generateCombinations(values = [], maxSize = values.length) {
  const output = [];
  const limit = Math.min(
    values.length,
    Math.max(1, Number(maxSize) || values.length),
  );

  function walk(startIndex, current) {
    if (current.length > 0) output.push([...current]);
    if (current.length >= limit) return;
    for (let index = startIndex; index < values.length; index += 1) {
      current.push(values[index]);
      walk(index + 1, current);
      current.pop();
    }
  }

  walk(0, []);
  return output;
}

function evaluateCandidateBundles({
  scenario = {},
  optimal = {},
  ordersById = {},
  currentCity = "",
  citiesDataset = {},
  storeDataset = {},
} = {}) {
  const scenarioOrderIds = normalizeIdArray(scenario?.order_ids);
  const maxBundle = Math.min(
    scenarioOrderIds.length,
    Math.max(1, Number(scenario?.max_bundle) || scenarioOrderIds.length || 1),
  );
  const shownBundleIds = getScenarioRecommendationBundleIds(
    scenario,
    ordersById,
    optimal,
  );
  const shownBundleSignature = bundleSignature(shownBundleIds);
  const storedBestBundleSignature = bundleSignature(optimal?.best_bundle_ids);

  const rawCandidates = generateCombinations(scenarioOrderIds, maxBundle)
    .filter((bundleIds) => !checkMultiStoreBundle(bundleIds, ordersById))
    .map((bundleIds) => {
      const evaluation = scoreBundle({
        bundleIds,
        ordersById,
        currentCity,
        citiesDataset,
        storeDataset,
      });
      const signature = bundleSignature(bundleIds);
      return {
        bundleIds,
        bundleSignature: signature,
        bundleSize: bundleIds.length,
        earnings: evaluation?.earnings ?? null,
        modeledTime: evaluation?.modeled_time ?? null,
        score: evaluation?.score ?? null,
        isStoredOptimal: Number(signature === storedBestBundleSignature),
      };
    })
    .sort((left, right) => {
      const scoreDiff = (right.score ?? -Infinity) - (left.score ?? -Infinity);
      if (scoreDiff !== 0) return scoreDiff;
      return left.bundleSize - right.bundleSize;
    });

  const bestCandidate = rawCandidates[0] || null;
  const secondBestCandidate = rawCandidates[1] || null;
  const bestBundleSignature = String(bestCandidate?.bundleSignature || "");
  const bestScore = bestCandidate?.score ?? null;

  return rawCandidates.map((candidate) => {
    const scoreRatio =
      bestScore && candidate?.score != null ? candidate.score / bestScore : null;
    const percentRegret = scoreRatio != null ? 1 - scoreRatio : null;
    return {
      ...candidate,
      scoreRatioToBest: scoreRatio,
      percentRegret,
      isOptimal: Number(candidate.bundleSignature === bestBundleSignature),
      isNearOptimal: Number(
        scoreRatio != null && scoreRatio >= NEAR_OPTIMAL_THRESHOLD,
      ),
      matchesShownRecommendation: Number(
        shownBundleSignature && candidate.bundleSignature === shownBundleSignature,
      ),
      recommendationQuality:
        scoreRatio != null && scoreRatio >= 0.999999 ? "optimal" : "suboptimal",
      dynamicBestBundleIds: bestCandidate?.bundleIds ?? [],
      dynamicSecondBestBundleIds: secondBestCandidate?.bundleIds ?? [],
    };
  });
}

function linearRegressionSlope(points = []) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  const xs = points
    .map((point) => Number(point?.x))
    .filter((value) => Number.isFinite(value));
  const ys = points
    .map((point) => Number(point?.y))
    .filter((value) => Number.isFinite(value));
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const xMean = mean(xs) ?? 0;
  const yMean = mean(ys) ?? 0;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const xDelta = xs[index] - xMean;
    numerator += xDelta * (ys[index] - yMean);
    denominator += xDelta * xDelta;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

function solveLinearSystem(matrix = [], vector = []) {
  const size = matrix.length;
  if (!size || size !== vector.length) return null;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let col = 0; col < size; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivotRow][col])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][col]) < 1e-10) return null;
    if (pivotRow !== col) {
      const temp = augmented[col];
      augmented[col] = augmented[pivotRow];
      augmented[pivotRow] = temp;
    }

    const pivot = augmented[col][col];
    for (let j = col; j <= size; j += 1) {
      augmented[col][j] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = col; j <= size; j += 1) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fitLinearModel(
  rows = [],
  featureKeys = [],
  targetKey = "",
  {
    clipRange = [0, 1],
    regularization = 0.15,
    minRows = 4,
    defaultValue = 0.5,
  } = {},
) {
  const samples = rows
    .filter(
      (row) =>
        row &&
        row[targetKey] != null &&
        Number.isFinite(Number(row[targetKey])),
    )
    .map((row) => ({ ...row, [targetKey]: Number(row[targetKey]) }));

  const fallbackValue =
    mean(samples.map((row) => row[targetKey])) ?? defaultValue;
  if (samples.length < Math.max(minRows, featureKeys.length + 1)) {
    return {
      type: "fallback",
      defaultValue: clamp(fallbackValue, clipRange[0], clipRange[1]),
      featureKeys,
      clipRange,
      trainingRows: samples.length,
    };
  }

  const means = featureKeys.map(
    (key) => mean(samples.map((row) => Number(row[key]) || 0)) ?? 0,
  );
  const scales = featureKeys.map((key, index) => {
    const values = samples.map((row) => Number(row[key]) || 0);
    const mu = means[index];
    const variance = mean(values.map((value) => (value - mu) ** 2)) ?? 0;
    return Math.sqrt(Math.max(variance, 1e-12)) || 1;
  });

  const width = featureKeys.length + 1;
  const gram = Array.from({ length: width }, () => Array(width).fill(0));
  const rhs = Array(width).fill(0);

  for (const row of samples) {
    const featureVector = [1];
    for (let index = 0; index < featureKeys.length; index += 1) {
      const raw = Number(row?.[featureKeys[index]]) || 0;
      featureVector.push((raw - means[index]) / scales[index]);
    }

    for (let i = 0; i < width; i += 1) {
      rhs[i] += featureVector[i] * row[targetKey];
      for (let j = 0; j < width; j += 1) {
        gram[i][j] += featureVector[i] * featureVector[j];
      }
    }
  }

  for (let i = 1; i < width; i += 1) {
    gram[i][i] += regularization;
  }

  const coefficients = solveLinearSystem(gram, rhs);
  if (!coefficients) {
    return {
      type: "fallback",
      defaultValue: clamp(fallbackValue, clipRange[0], clipRange[1]),
      featureKeys,
      clipRange,
      trainingRows: samples.length,
    };
  }

  return {
    type: "linear",
    coefficients,
    featureKeys,
    means,
    scales,
    defaultValue: clamp(fallbackValue, clipRange[0], clipRange[1]),
    clipRange,
    trainingRows: samples.length,
  };
}

function predictLinearModel(model = {}, featureMap = {}) {
  if (model?.type !== "linear") {
    return clamp(model?.defaultValue ?? 0.5, ...(model?.clipRange || [0, 1]));
  }

  let output = Number(model?.coefficients?.[0]) || 0;
  for (let index = 0; index < model.featureKeys.length; index += 1) {
    const key = model.featureKeys[index];
    const raw = Number(featureMap?.[key]) || 0;
    const normalized =
      (raw - (model.means[index] || 0)) / (model.scales[index] || 1);
    output += (model.coefficients[index + 1] || 0) * normalized;
  }

  return clamp(output, ...(model.clipRange || [0, 1]));
}

function explainLinearModel(model = {}, featureMap = {}, labelMap = {}) {
  if (model?.type !== "linear") return "baseline_mean";

  const contributions = model.featureKeys.map((key, index) => {
    const raw = Number(featureMap?.[key]) || 0;
    const normalized =
      (raw - (model.means[index] || 0)) / (model.scales[index] || 1);
    return {
      label: labelMap[key] || key,
      value: (model.coefficients[index + 1] || 0) * normalized,
    };
  });

  return contributions
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, 3)
    .map(
      (entry) =>
        `${entry.label}:${entry.value >= 0 ? "+" : ""}${entry.value.toFixed(3)}`,
    )
    .join(" | ");
}

function makeRecommendationFeatureRow(masterRow = {}, candidate = {}) {
  const scenarioMaxBundle = Math.max(
    1,
    Number(masterRow?.scenario_max_bundle) || 1,
  );
  return {
    prior_optimal_rate: Number(masterRow?.prior_optimal_rate) || 0,
    prior_failure_rate: Number(masterRow?.prior_failure_rate) || 0,
    prior_recommendation_compliance:
      Number(masterRow?.prior_recommendation_compliance) || 0,
    prior_mean_bundle_size: Number(masterRow?.prior_mean_bundle_size) || 0,
    prior_mean_regret: Number(masterRow?.prior_mean_regret) || 0,
    prior_mean_score_ratio: Number(masterRow?.prior_mean_score_ratio) || 0,
    prior_phase_score_ratio:
      Number(masterRow?.prior_phase_score_ratio) ||
      Number(masterRow?.prior_mean_score_ratio) ||
      0,
    phase_progress_index: Number(masterRow?.phase_progress_index) || 0,
    scenario_max_bundle: scenarioMaxBundle,
    candidate_bundle_size: Number(candidate?.bundleSize) || 0,
    candidate_bundle_size_ratio:
      scenarioMaxBundle > 0
        ? (Number(candidate?.bundleSize) || 0) / scenarioMaxBundle
        : 0,
    candidate_score_ratio_to_best: Number(candidate?.scoreRatioToBest) || 0,
    candidate_percent_regret: Number(candidate?.percentRegret) || 0,
    candidate_is_optimal: Number(candidate?.isOptimal) || 0,
    candidate_is_near_optimal: Number(candidate?.isNearOptimal) || 0,
  };
}

function getBehaviorSummary(rows = [], groupKey = "", groupValue = "overall") {
  const scoreRatios = rows
    .map((row) => valueToFloat(row?.score_ratio_to_best))
    .filter((value) => value != null);
  const regrets = rows
    .map((row) => valueToFloat(row?.percent_regret))
    .filter((value) => value != null);
  const durations = rows
    .map((row) => valueToFloat(row?.duration))
    .filter((value) => value != null);
  const bundleSizes = rows
    .map((row) => valueToFloat(row?.bundle_size))
    .filter((value) => value != null);
  const followRows = rows.filter((row) => row?.followed_recommendation != null);
  const followRate = mean(
    followRows.map((row) => Number(row.followed_recommendation)),
  );
  const helpRate = mean(
    rows
      .filter((row) => row?.recommendation_helpful != null)
      .map((row) => Number(row.recommendation_helpful)),
  );
  const harmRate = mean(
    rows
      .filter((row) => row?.recommendation_harmful != null)
      .map((row) => Number(row.recommendation_harmful)),
  );

  return {
    [groupKey || "scope"]: groupValue,
    n_decisions: rows.length,
    exact_optimal_rate: mean(
      rows.map((row) => Number(row?.is_exact_optimal) || 0),
    ),
    failure_rate: mean(rows.map((row) => Number(row?.is_failure) || 0)),
    mean_score_ratio: mean(scoreRatios),
    mean_regret: mean(regrets),
    mean_bundle_size: mean(bundleSizes),
    mean_duration: mean(durations),
    recommendation_follow_rate: followRate,
    recommendation_help_rate: helpRate,
    recommendation_harm_rate: harmRate,
  };
}

function buildBehaviorSummaryRows(rows = [], groupKey = "") {
  const groups = new Map();
  for (const row of rows) {
    const value = String(row?.[groupKey] ?? "unknown");
    const bucket = groups.get(value) || [];
    bucket.push(row);
    groups.set(value, bucket);
  }

  return [...groups.entries()]
    .map(([groupValue, bucket]) =>
      getBehaviorSummary(bucket, groupKey, groupValue),
    )
    .sort((left, right) =>
      String(left?.[groupKey] ?? "").localeCompare(
        String(right?.[groupKey] ?? ""),
      ),
    );
}

function buildParticipantTrajectoryRows(masterRows = []) {
  const groups = new Map();
  for (const row of masterRows) {
    const participantId = String(row?.participant_id || "");
    if (!participantId) continue;
    const bucket = groups.get(participantId) || [];
    bucket.push(row);
    groups.set(participantId, bucket);
  }

  return [...groups.entries()].map(([participantId, rows]) => {
    const sorted = [...rows].sort(
      (left, right) => Number(left.round_index) - Number(right.round_index),
    );
    const scoreSeries = sorted
      .filter((row) => valueToFloat(row?.score_ratio_to_best) != null)
      .map((row) => ({
        x: Number(row.round_index),
        y: Number(row.score_ratio_to_best),
      }));
    const meanScore = mean(scoreSeries.map((entry) => entry.y)) ?? 0;
    const slope = linearRegressionSlope(scoreSeries);
    let segment = "mixed";
    if (meanScore >= 0.85 && slope >= -0.01) {
      segment = "stable_high";
    } else if (slope >= 0.03) {
      segment = "improving";
    } else if (slope <= -0.03) {
      segment = "declining";
    } else if (meanScore < 0.65) {
      segment = "stable_low";
    }

    return {
      participant_id: participantId,
      n_decisions: sorted.length,
      mean_score_ratio: meanScore,
      slope_score_ratio: slope,
      mean_failure_rate: mean(
        sorted.map((row) => Number(row?.is_failure) || 0),
      ),
      mean_bundle_size: mean(
        sorted.map((row) => Number(row?.bundle_size) || 0),
      ),
      trajectory_segment: segment,
    };
  });
}

function summarizeTrajectorySegments(trajectoryRows = []) {
  const counts = new Map();
  for (const row of trajectoryRows) {
    const segment = String(row?.trajectory_segment || "mixed");
    counts.set(segment, (counts.get(segment) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([trajectory_segment, n_participants]) => ({
      trajectory_segment,
      n_participants,
    }))
    .sort((left, right) =>
      String(left.trajectory_segment).localeCompare(
        String(right.trajectory_segment),
      ),
    );
}

function buildTransferSummary(masterRows = []) {
  const groups = new Map();
  for (const row of masterRows) {
    const participantId = String(row?.participant_id || "");
    if (!participantId) continue;
    const bucket = groups.get(participantId) || [];
    bucket.push(row);
    groups.set(participantId, bucket);
  }

  const deltas = [];
  for (const rows of groups.values()) {
    const phaseA = mean(
      rows
        .filter((row) => row?.phase === "A")
        .map((row) => valueToFloat(row?.score_ratio_to_best))
        .filter((value) => value != null),
    );
    const phaseC = mean(
      rows
        .filter((row) => row?.phase === "C")
        .map((row) => valueToFloat(row?.score_ratio_to_best))
        .filter((value) => value != null),
    );
    if (phaseA != null && phaseC != null) deltas.push(phaseC - phaseA);
  }

  return {
    participants_with_transfer_measure: deltas.length,
    mean_phase_c_minus_a_score_ratio: mean(deltas),
    median_phase_c_minus_a_score_ratio: percentile(deltas, 0.5),
  };
}

function buildAnalysisMasterRows({
  decisionFacts = [],
  participants = [],
  scenarioBundle = {},
  citiesDataset = {},
  storeDataset = {},
  extraFields = [],
} = {}) {
  const { scenarioByRound, ordersById, optimalByScenario } =
    buildIndexes(scenarioBundle);
  const { byId: scenarioById, byPhase } = getScenarioLookup(scenarioBundle);
  const participantMap = rowsToMap(participants, "id");
  const qaIssues = [];

  const masterRows = decisionFacts.map((row) => {
    const scenario =
      scenarioById[row?.scenario_id] ||
      scenarioByRound[Number(row?.round_index)] ||
      {};
    const optimal = optimalByScenario[String(row?.scenario_id || "")] || {};
    const scenarioOrderIds = normalizeIdArray(scenario?.order_ids);
    const shownRecommendationBundleIds = getScenarioRecommendationBundleIds(
      scenario,
      ordersById,
      optimal,
    );
    const shownRecommendationEval = shownRecommendationBundleIds.length
      ? scoreBundle({
          bundleIds: shownRecommendationBundleIds,
          ordersById,
          currentCity: row?.current_city,
          citiesDataset,
          storeDataset,
        })
      : null;
    const shownScoreRatio =
      shownRecommendationEval?.score != null &&
      valueToFloat(row?.best_score) != null &&
      Number(row.best_score) > 0
        ? shownRecommendationEval.score / Number(row.best_score)
        : null;
    const shownPercentRegret =
      shownScoreRatio != null ? 1 - shownScoreRatio : null;
    const recommendationQuality =
      shownRecommendationBundleIds.length === 0
        ? "none"
        : shownScoreRatio != null && shownScoreRatio >= 0.999999
          ? "optimal"
          : "suboptimal";
    const followedRecommendation =
      shownRecommendationBundleIds.length === 0
        ? null
        : Number(
            bundleSignature(row?.chosen_orders) ===
              bundleSignature(shownRecommendationBundleIds),
          );
    const recommendationHelpful =
      shownScoreRatio != null && valueToFloat(row?.score_ratio_to_best) != null
        ? Number(shownScoreRatio > Number(row.score_ratio_to_best) + 1e-9)
        : null;
    const recommendationHarmful =
      shownScoreRatio != null && valueToFloat(row?.score_ratio_to_best) != null
        ? Number(shownScoreRatio < Number(row.score_ratio_to_best) - 1e-9)
        : null;
    const phase = String(row?.phase || scenario?.phase || "");
    const phaseRounds = byPhase[phase] || [];
    const phaseProgressIndex =
      phaseRounds.indexOf(Number(row?.round_index)) + 1 || 0;
    const participant = participantMap[String(row?.participant_id || "")] || {};

    if (
      shownRecommendationBundleIds.length > 0 &&
      shownRecommendationEval?.score == null
    ) {
      qaIssues.push(
        makeIssue({
          severity: "warning",
          issue_type: "missing_recommendation_bundle_score",
          participant_id: String(row?.participant_id || ""),
          round_index: Number(row?.round_index),
          scenario_id: String(row?.scenario_id || ""),
          message:
            "Displayed recommendation bundle could not be scored from the current dataset.",
        }),
      );
    }

    return {
      ...row,
      phase,
      phase_progress_index: phaseProgressIndex,
      scenario_max_bundle: Math.max(
        1,
        Number(scenario?.max_bundle) || scenarioOrderIds.length || 1,
      ),
      scenario_order_count: scenarioOrderIds.length,
      scenario_order_ids: scenarioOrderIds,
      shown_recommendation_status:
        shownRecommendationBundleIds.length > 0 ? "shown" : "none",
      shown_recommendation_bundle_ids: shownRecommendationBundleIds,
      recommendation_quality: recommendationQuality,
      followed_recommendation: followedRecommendation,
      shown_recommendation_score: shownRecommendationEval?.score ?? null,
      shown_recommendation_score_ratio_to_best: shownScoreRatio,
      shown_recommendation_percent_regret: shownPercentRegret,
      recommendation_helpful: recommendationHelpful,
      recommendation_harmful: recommendationHarmful,
      metadata_join_status: participant?.__metadataJoinStatus || "none",
    };
  });

  for (const row of masterRows) {
    const participant = participantMap[String(row?.participant_id || "")] || {};
    for (const field of extraFields) {
      if (field && participant[field] !== undefined)
        row[field] = participant[field];
    }
  }

  const rowsByParticipant = new Map();
  for (const row of masterRows) {
    const participantId = String(row?.participant_id || "");
    const bucket = rowsByParticipant.get(participantId) || [];
    bucket.push(row);
    rowsByParticipant.set(participantId, bucket);
  }

  for (const rows of rowsByParticipant.values()) {
    rows.sort(
      (left, right) => Number(left.round_index) - Number(right.round_index),
    );
    for (let index = 0; index < rows.length; index += 1) {
      const current = rows[index];
      const priorRows = rows.slice(0, index);
      const priorPhaseRows = priorRows.filter(
        (row) => row?.phase === current?.phase,
      );
      const priorRecommendationRows = priorRows.filter(
        (row) => row?.followed_recommendation != null,
      );
      const priorRegretValues = priorRows
        .map((row) => valueToFloat(row?.percent_regret))
        .filter((value) => value != null);
      const priorScoreValues = priorRows
        .map((row) => valueToFloat(row?.score_ratio_to_best))
        .filter((value) => value != null);
      const priorPhaseScoreValues = priorPhaseRows
        .map((row) => valueToFloat(row?.score_ratio_to_best))
        .filter((value) => value != null);

      current.prior_decisions_count = priorRows.length;
      current.prior_optimal_rate = mean(
        priorRows.map((row) => Number(row?.is_exact_optimal) || 0),
      );
      current.prior_failure_rate = mean(
        priorRows.map((row) => Number(row?.is_failure) || 0),
      );
      current.prior_mean_bundle_size = mean(
        priorRows.map((row) => Number(row?.bundle_size) || 0),
      );
      current.prior_recommendation_compliance = mean(
        priorRecommendationRows.map((row) =>
          Number(row?.followed_recommendation),
        ),
      );
      current.prior_mean_regret = mean(priorRegretValues);
      current.prior_mean_score_ratio = mean(priorScoreValues);
      current.prior_phase_score_ratio =
        mean(priorPhaseScoreValues) ?? mean(priorScoreValues);
      current.prior_phase_failure_rate =
        mean(priorPhaseRows.map((row) => Number(row?.is_failure) || 0)) ??
        mean(priorRows.map((row) => Number(row?.is_failure) || 0));
    }
  }

  return { masterRows, qaIssues };
}

function buildPolicyTrainingRows({
  masterRows = [],
  scenarioBundle = {},
  citiesDataset = {},
  storeDataset = {},
  extraFields = [],
} = {}) {
  const { scenarioByRound, ordersById, optimalByScenario } =
    buildIndexes(scenarioBundle);
  const rowsByParticipant = new Map();
  for (const row of masterRows) {
    const participantId = String(row?.participant_id || "");
    const bucket = rowsByParticipant.get(participantId) || [];
    bucket.push(row);
    rowsByParticipant.set(participantId, bucket);
  }

  for (const rows of rowsByParticipant.values()) {
    rows.sort(
      (left, right) => Number(left.round_index) - Number(right.round_index),
    );
  }

  const policyRows = [];

  for (const row of masterRows) {
    const scenario = scenarioByRound[Number(row?.round_index)] || {};
    const optimal = optimalByScenario[String(row?.scenario_id || "")] || {};
    const candidates = evaluateCandidateBundles({
      scenario,
      optimal,
      ordersById,
      currentCity: row?.current_city,
      citiesDataset,
      storeDataset,
    });
    const participantRows =
      rowsByParticipant.get(String(row?.participant_id || "")) || [];
    const currentIndex = participantRows.findIndex((entry) => entry === row);
    const nextRow =
      currentIndex >= 0 ? participantRows[currentIndex + 1] || null : null;
    const chosenSignature = bundleSignature(row?.chosen_orders);

    for (const candidate of candidates) {
      const policyRow = {
        dataset_root: row?.dataset_root,
        participant_id: row?.participant_id,
        round_index: row?.round_index,
        state_decision_source: row?.decision_source,
        state_decision_timestamp: row?.decision_timestamp,
        state_timestamp_available: row?.timestamp_available,
        state_round_coverage_status: row?.round_coverage_status,
        state_qa_completed_game_mismatch: row?.qa_completed_game_mismatch,
        state_qa_missing_recommendation_labels:
          row?.qa_missing_recommendation_labels,
        phase: row?.phase,
        classification: row?.classification,
        scenario_id: row?.scenario_id,
        state_current_city: row?.current_city,
        state_phase_progress_index: row?.phase_progress_index,
        state_prior_decisions_count: row?.prior_decisions_count,
        state_prior_optimal_rate: row?.prior_optimal_rate,
        state_prior_failure_rate: row?.prior_failure_rate,
        state_prior_recommendation_compliance:
          row?.prior_recommendation_compliance,
        state_prior_mean_bundle_size: row?.prior_mean_bundle_size,
        state_prior_mean_regret: row?.prior_mean_regret,
        state_prior_mean_score_ratio: row?.prior_mean_score_ratio,
        state_prior_phase_score_ratio: row?.prior_phase_score_ratio,
        action_bundle_ids: candidate.bundleIds,
        action_bundle_size: candidate.bundleSize,
        action_score_ratio_to_best: candidate.scoreRatioToBest,
        action_percent_regret: candidate.percentRegret,
        action_score: candidate.score,
        action_modeled_time: candidate.modeledTime,
        action_earnings: candidate.earnings,
        action_is_optimal: candidate.isOptimal,
        action_is_near_optimal: candidate.isNearOptimal,
        action_matches_shown_recommendation:
          candidate.matchesShownRecommendation,
        action_recommendation_quality: candidate.recommendationQuality,
        observed_chosen_action: Number(
          candidate.bundleSignature === chosenSignature,
        ),
        observed_followed_recommendation: row?.followed_recommendation,
        reward_target: candidate.scoreRatioToBest,
        observed_reward:
          candidate.bundleSignature === chosenSignature
            ? (row?.score_ratio_to_best ?? 0)
            : null,
        next_round_index: nextRow?.round_index ?? null,
        next_phase: nextRow?.phase ?? null,
        next_current_city: nextRow?.current_city ?? null,
        next_prior_optimal_rate: nextRow?.prior_optimal_rate ?? null,
        next_prior_failure_rate: nextRow?.prior_failure_rate ?? null,
        next_prior_mean_regret: nextRow?.prior_mean_regret ?? null,
        done: Number(!nextRow),
      };
      for (const field of extraFields) {
        if (field in row) policyRow[field] = row[field];
      }
      policyRows.push(policyRow);
    }
  }

  return policyRows;
}

function buildRecommendationWorkbench({
  masterRows = [],
  scenarioBundle = {},
  citiesDataset = {},
  storeDataset = {},
} = {}) {
  const { scenarioByRound, ordersById, optimalByScenario } =
    buildIndexes(scenarioBundle);
  const adoptionTrainingRows = [];
  const outcomeTrainingRows = [];

  for (const row of masterRows) {
    const scenario = scenarioByRound[Number(row?.round_index)] || {};
    const optimal = optimalByScenario[String(row?.scenario_id || "")] || {};
    const candidates = evaluateCandidateBundles({
      scenario,
      optimal,
      ordersById,
      currentCity: row?.current_city,
      citiesDataset,
      storeDataset,
    });
    const chosenSignature = bundleSignature(row?.chosen_orders);
    const chosenCandidate = candidates.find(
      (candidate) => candidate.bundleSignature === chosenSignature,
    );
    if (chosenCandidate) {
      outcomeTrainingRows.push({
        ...makeRecommendationFeatureRow(row, chosenCandidate),
        target: valueToFloat(row?.score_ratio_to_best) ?? 0,
      });
    }

    if (row?.shown_recommendation_status === "shown") {
      const shownCandidate = candidates.find(
        (candidate) => Number(candidate.matchesShownRecommendation) === 1,
      );
      if (shownCandidate) {
        adoptionTrainingRows.push({
          ...makeRecommendationFeatureRow(row, shownCandidate),
          target: Number(row?.followed_recommendation) || 0,
        });
      }
    }
  }

  const adoptionFeatureKeys = [
    "prior_optimal_rate",
    "prior_failure_rate",
    "prior_recommendation_compliance",
    "prior_mean_bundle_size",
    "phase_progress_index",
    "candidate_bundle_size_ratio",
    "candidate_score_ratio_to_best",
    "candidate_is_optimal",
  ];
  const outcomeFeatureKeys = [
    "prior_optimal_rate",
    "prior_failure_rate",
    "prior_mean_regret",
    "prior_mean_score_ratio",
    "prior_phase_score_ratio",
    "candidate_bundle_size_ratio",
    "candidate_score_ratio_to_best",
    "candidate_is_optimal",
  ];
  const adoptionModel = fitLinearModel(
    adoptionTrainingRows,
    adoptionFeatureKeys,
    "target",
    {
      defaultValue: 0.5,
      clipRange: [0, 1],
      minRows: 3,
    },
  );
  const outcomeModel = fitLinearModel(
    outcomeTrainingRows,
    outcomeFeatureKeys,
    "target",
    {
      defaultValue: mean(outcomeTrainingRows.map((row) => row.target)) ?? 0.5,
      clipRange: [0, 1],
      minRows: 4,
    },
  );

  const labelMap = {
    prior_optimal_rate: "prior_optimal",
    prior_failure_rate: "prior_failure",
    prior_recommendation_compliance: "prior_follow",
    prior_mean_bundle_size: "prior_bundle",
    phase_progress_index: "phase_progress",
    candidate_bundle_size_ratio: "bundle_ratio",
    candidate_score_ratio_to_best: "candidate_ratio",
    candidate_is_optimal: "candidate_optimal",
    prior_mean_regret: "prior_regret",
    prior_mean_score_ratio: "prior_score",
    prior_phase_score_ratio: "phase_score",
  };

  const workbenchRows = masterRows.map((row) => {
    const scenario = scenarioByRound[Number(row?.round_index)] || {};
    const optimal = optimalByScenario[String(row?.scenario_id || "")] || {};
    const candidates = evaluateCandidateBundles({
      scenario,
      optimal,
      ordersById,
      currentCity: row?.current_city,
      citiesDataset,
      storeDataset,
    });
    const baseline = clamp(
      valueToFloat(row?.prior_phase_score_ratio) ??
        valueToFloat(row?.prior_mean_score_ratio) ??
        outcomeModel?.defaultValue ??
        0.5,
      0,
      1,
    );
    const scoredCandidates = candidates.map((candidate) => {
      const featureRow = makeRecommendationFeatureRow(row, candidate);
      const adoption = predictLinearModel(adoptionModel, featureRow);
      const outcome = predictLinearModel(outcomeModel, featureRow);
      const expected = adoption * outcome + (1 - adoption) * baseline;
      return {
        ...candidate,
        adoption,
        outcome,
        expected,
        why: [
          explainLinearModel(outcomeModel, featureRow, labelMap),
          explainLinearModel(adoptionModel, featureRow, labelMap),
        ]
          .filter(Boolean)
          .join(" || "),
      };
    });

    const recommended =
      [...scoredCandidates].sort((left, right) => {
        const expectedDiff =
          (right.expected ?? -Infinity) - (left.expected ?? -Infinity);
        if (expectedDiff !== 0) return expectedDiff;
        const theoreticalDiff =
          (right.scoreRatioToBest ?? -Infinity) -
          (left.scoreRatioToBest ?? -Infinity);
        if (theoreticalDiff !== 0) return theoreticalDiff;
        return (right.score ?? -Infinity) - (left.score ?? -Infinity);
      })[0] || null;

    return {
      dataset_root: row?.dataset_root,
      participant_id: row?.participant_id,
      round_index: row?.round_index,
      phase: row?.phase,
      classification: row?.classification,
      scenario_id: row?.scenario_id,
      baseline_expected_score_ratio: baseline,
      predicted_adoption_probability: recommended?.adoption ?? null,
      predicted_outcome_score_ratio: recommended?.outcome ?? null,
      predicted_expected_score_ratio: recommended?.expected ?? null,
      predicted_lift_vs_baseline:
        recommended?.expected != null ? recommended.expected - baseline : null,
      recommended_bundle_ids: recommended?.bundleIds ?? [],
      recommended_bundle_size: recommended?.bundleSize ?? null,
      recommended_bundle_score_ratio_to_best:
        recommended?.scoreRatioToBest ?? null,
      recommended_bundle_percent_regret: recommended?.percentRegret ?? null,
      recommended_bundle_is_optimal: recommended?.isOptimal ?? null,
      historical_chosen_bundle_ids: row?.chosen_orders ?? [],
      historical_score_ratio_to_best: row?.score_ratio_to_best ?? null,
      oracle_bundle_ids: row?.best_bundle_ids ?? [],
      oracle_score_ratio_to_best: 1,
      oracle_gap:
        recommended?.scoreRatioToBest != null
          ? 1 - recommended.scoreRatioToBest
          : null,
      why_ranked_high: recommended?.why || "no_candidate",
    };
  });

  function summarizeRecommendationRows(rows = [], groupKey = null) {
    const grouped = new Map();
    if (!groupKey) {
      grouped.set("overall", rows);
    } else {
      for (const row of rows) {
        const value = String(row?.[groupKey] ?? "");
        const bucket = grouped.get(value) || [];
        bucket.push(row);
        grouped.set(value, bucket);
      }
    }

    return [...grouped.entries()].map(([groupValue, bucket]) => ({
      scope: groupKey || "overall",
      group_value: groupValue,
      n_states: bucket.length,
      mean_baseline_expected_score_ratio: mean(
        bucket
          .map((row) => valueToFloat(row?.baseline_expected_score_ratio))
          .filter((value) => value != null),
      ),
      mean_predicted_adoption_probability: mean(
        bucket
          .map((row) => valueToFloat(row?.predicted_adoption_probability))
          .filter((value) => value != null),
      ),
      mean_predicted_outcome_score_ratio: mean(
        bucket
          .map((row) => valueToFloat(row?.predicted_outcome_score_ratio))
          .filter((value) => value != null),
      ),
      mean_predicted_expected_score_ratio: mean(
        bucket
          .map((row) => valueToFloat(row?.predicted_expected_score_ratio))
          .filter((value) => value != null),
      ),
      mean_predicted_lift_vs_baseline: mean(
        bucket
          .map((row) => valueToFloat(row?.predicted_lift_vs_baseline))
          .filter((value) => value != null),
      ),
      recommended_optimal_rate: mean(
        bucket.map((row) => Number(row?.recommended_bundle_is_optimal) || 0),
      ),
      recommended_mean_regret: mean(
        bucket
          .map((row) => valueToFloat(row?.recommended_bundle_percent_regret))
          .filter((value) => value != null),
      ),
      historical_mean_score_ratio: mean(
        bucket
          .map((row) => valueToFloat(row?.historical_score_ratio_to_best))
          .filter((value) => value != null),
      ),
      oracle_mean_score_ratio: mean(
        bucket
          .map((row) => valueToFloat(row?.oracle_score_ratio_to_best))
          .filter((value) => value != null),
      ),
    }));
  }

  const recommendationSummary = [
    ...summarizeRecommendationRows(workbenchRows, null),
    ...summarizeRecommendationRows(workbenchRows, "phase"),
    ...summarizeRecommendationRows(workbenchRows, "classification"),
  ];

  return {
    adoptionModel,
    outcomeModel,
    workbenchRows,
    recommendationSummary,
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

function getSnapshotSplit(participantId = "") {
  const bucket = stableHashString(participantId) % 1000;
  const ratio = bucket / 1000;
  if (ratio < 0.7) return "train";
  if (ratio < 0.85) return "validation";
  return "test";
}

function buildSplitManifest(masterRows = []) {
  const splits = {
    train: { participant_ids: new Set(), row_count: 0 },
    validation: { participant_ids: new Set(), row_count: 0 },
    test: { participant_ids: new Set(), row_count: 0 },
  };

  for (const row of masterRows) {
    const participantId = String(row?.participant_id || "").trim();
    if (!participantId) continue;
    const split = getSnapshotSplit(participantId);
    splits[split].participant_ids.add(participantId);
    splits[split].row_count += 1;
  }

  return {
    method: "stable_hash_participant_id",
    train: {
      participant_count: splits.train.participant_ids.size,
      row_count: splits.train.row_count,
    },
    validation: {
      participant_count: splits.validation.participant_ids.size,
      row_count: splits.validation.row_count,
    },
    test: {
      participant_count: splits.test.participant_ids.size,
      row_count: splits.test.row_count,
    },
  };
}

function softmax(values = []) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const safeValues = values.map((value) =>
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );
  const maxValue = Math.max(...safeValues);
  const exps = safeValues.map((value) =>
    Math.exp(Math.max(-20, Math.min(20, value - maxValue))),
  );
  const denom = exps.reduce((sum, value) => sum + value, 0);
  if (!(denom > 0)) return safeValues.map(() => 1 / safeValues.length);
  return exps.map((value) => value / denom);
}

function makePolicyModelFeatureRow(row = {}) {
  return {
    prior_optimal_rate: Number(
      row?.state_prior_optimal_rate ?? row?.prior_optimal_rate,
    ) || 0,
    prior_failure_rate: Number(
      row?.state_prior_failure_rate ?? row?.prior_failure_rate,
    ) || 0,
    prior_recommendation_compliance: Number(
      row?.state_prior_recommendation_compliance ??
        row?.prior_recommendation_compliance,
    ) || 0,
    prior_mean_bundle_size: Number(
      row?.state_prior_mean_bundle_size ?? row?.prior_mean_bundle_size,
    ) || 0,
    prior_mean_regret: Number(
      row?.state_prior_mean_regret ?? row?.prior_mean_regret,
    ) || 0,
    prior_mean_score_ratio: Number(
      row?.state_prior_mean_score_ratio ?? row?.prior_mean_score_ratio,
    ) || 0,
    prior_phase_score_ratio: Number(
      row?.state_prior_phase_score_ratio ?? row?.prior_phase_score_ratio,
    ) || 0,
    phase_progress_index: Number(
      row?.state_phase_progress_index ?? row?.phase_progress_index,
    ) || 0,
    action_bundle_size: Number(row?.action_bundle_size ?? row?.bundle_size) || 0,
    action_score_ratio_to_best: Number(
      row?.action_score_ratio_to_best ?? row?.score_ratio_to_best,
    ) || 0,
    action_percent_regret: Number(
      row?.action_percent_regret ?? row?.percent_regret,
    ) || 0,
    action_is_optimal: Number(row?.action_is_optimal ?? row?.is_exact_optimal) || 0,
    action_is_near_optimal:
      Number(row?.action_is_near_optimal ?? row?.is_near_optimal) || 0,
  };
}

function chooseTopCandidate(candidates = [], scoreAccessor = () => null) {
  return (
    [...candidates].sort((left, right) => {
      const scoreDiff =
        (scoreAccessor(right) ?? -Infinity) - (scoreAccessor(left) ?? -Infinity);
      if (scoreDiff !== 0) return scoreDiff;
      const ratioDiff =
        (valueToFloat(right?.action_score_ratio_to_best) ?? -Infinity) -
        (valueToFloat(left?.action_score_ratio_to_best) ?? -Infinity);
      if (ratioDiff !== 0) return ratioDiff;
      return (
        (valueToFloat(right?.action_score) ?? -Infinity) -
        (valueToFloat(left?.action_score) ?? -Infinity)
      );
    })[0] || null
  );
}

function summarizePolicyRows(rows = [], groupKey = null) {
  const grouped = new Map();
  for (const row of rows) {
    const policyName = String(row?.policy_name || "");
    const groupValue = groupKey
      ? String(row?.[groupKey] ?? "unknown")
      : "overall";
    const key = `${policyName}::${groupValue}`;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()].map(([key, bucket]) => {
    const [policyName, groupValue = "overall"] = String(key).split("::");
    return {
      policy_name: policyName,
      scope: groupKey || "overall",
      group_value: groupValue,
      n_states: bucket.length,
      mean_reward: mean(
        bucket
          .map((row) => valueToFloat(row?.policy_expected_reward))
          .filter((value) => value != null),
      ),
      mean_regret: mean(
        bucket
          .map((row) => valueToFloat(row?.policy_regret))
          .filter((value) => value != null),
      ),
      optimal_rate: mean(
        bucket.map((row) => Number(row?.policy_is_optimal) || 0),
      ),
      mean_bundle_size: mean(
        bucket
          .map((row) => valueToFloat(row?.policy_bundle_size))
          .filter((value) => value != null),
      ),
      mean_lift_vs_historical: mean(
        bucket
          .map((row) => valueToFloat(row?.lift_vs_historical))
          .filter((value) => value != null),
      ),
    };
  });
}

function summarizeOpeRows(rows = [], groupKey = null) {
  const grouped = new Map();
  for (const row of rows) {
    const policyName = String(row?.policy_name || "");
    const groupValue = groupKey
      ? String(row?.[groupKey] ?? "unknown")
      : "overall";
    const key = `${policyName}::${groupValue}`;
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()].map(([key, bucket]) => {
    const [policyName, groupValue = "overall"] = String(key).split("::");
    const nStates = bucket.length;
    const weightedRewards = bucket.map((row) => {
      const propensity = Math.max(
        1e-6,
        valueToFloat(row?.target_behavior_propensity) ?? 1e-6,
      );
      const observedReward = valueToFloat(row?.historical_reward) ?? 0;
      return Number(row?.match_logged_action)
        ? observedReward / propensity
        : 0;
    });
    const weights = bucket.map((row) => {
      const propensity = Math.max(
        1e-6,
        valueToFloat(row?.target_behavior_propensity) ?? 1e-6,
      );
      return Number(row?.match_logged_action) ? 1 / propensity : 0;
    });
    const directMethod = mean(
      bucket
        .map((row) => valueToFloat(row?.policy_reward_prediction))
        .filter((value) => value != null),
    );
    const doublyRobust = mean(
      bucket.map((row) => {
        const targetPred = valueToFloat(row?.policy_reward_prediction) ?? 0;
        const loggedPred = valueToFloat(row?.historical_reward_prediction) ?? 0;
        const observedReward = valueToFloat(row?.historical_reward) ?? 0;
        const propensity = Math.max(
          1e-6,
          valueToFloat(row?.target_behavior_propensity) ?? 1e-6,
        );
        return targetPred +
          (Number(row?.match_logged_action)
            ? (observedReward - loggedPred) / propensity
            : 0);
      }),
    );

    return {
      policy_name: policyName,
      scope: groupKey || "overall",
      group_value: groupValue,
      n_states: nStates,
      ips: nStates > 0 ? weightedRewards.reduce((sum, value) => sum + value, 0) / nStates : null,
      snips:
        weights.reduce((sum, value) => sum + value, 0) > 0
          ? weightedRewards.reduce((sum, value) => sum + value, 0) /
            weights.reduce((sum, value) => sum + value, 0)
          : null,
      direct_method: directMethod,
      doubly_robust: doublyRobust,
      fqe_one_step: directMethod,
      match_rate: mean(bucket.map((row) => Number(row?.match_logged_action) || 0)),
      mean_target_propensity: mean(
        bucket
          .map((row) => valueToFloat(row?.target_behavior_propensity))
          .filter((value) => value != null),
      ),
    };
  });
}

function buildSandboxSummaryRows(
  rows = [],
  { iterations = 300, seed = DEFAULT_RANDOM_SEED } = {},
) {
  const grouped = new Map();
  for (const row of rows) {
    const key = String(row?.policy_name || "");
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()].map(([policyName, bucket], index) => {
    const rewards = bucket
      .map((row) => valueToFloat(row?.policy_expected_reward))
      .filter((value) => value != null);
    const gaps = bucket
      .map((row) => valueToFloat(row?.lift_vs_historical))
      .filter((value) => value != null);
    const [ciLow, ciHigh] = bootstrapCI(
      rewards,
      "mean",
      Math.max(50, Number(iterations) || 300),
      Number(seed) + index,
    );
    return {
      policy_name: policyName,
      simulation_label: "bootstrap_expected_reward",
      n_states: bucket.length,
      iterations: Math.max(50, Number(iterations) || 300),
      seed: Number(seed) || DEFAULT_RANDOM_SEED,
      mean_simulated_reward: mean(rewards),
      simulated_reward_ci_low: ciLow,
      simulated_reward_ci_high: ciHigh,
      mean_gap_vs_historical: mean(gaps),
    };
  });
}

function buildPolicyEvaluationSuite({
  policyTrainingRows = [],
  recommendationWorkbenchRows = [],
} = {}) {
  if (!Array.isArray(policyTrainingRows) || policyTrainingRows.length === 0) {
    return {
      policyStateRows: [],
      policyComparisons: [],
      opeSummary: [],
      sandboxSummary: [],
    };
  }

  const behaviorFeatureKeys = [
    "prior_optimal_rate",
    "prior_failure_rate",
    "prior_recommendation_compliance",
    "prior_mean_bundle_size",
    "prior_mean_regret",
    "phase_progress_index",
    "action_bundle_size",
    "action_score_ratio_to_best",
    "action_is_optimal",
  ];
  const rewardFeatureKeys = [
    "prior_optimal_rate",
    "prior_failure_rate",
    "prior_mean_regret",
    "prior_mean_score_ratio",
    "prior_phase_score_ratio",
    "phase_progress_index",
    "action_bundle_size",
    "action_score_ratio_to_best",
    "action_percent_regret",
    "action_is_optimal",
  ];

  const behaviorTrainingRows = policyTrainingRows.map((row) => ({
    ...makePolicyModelFeatureRow(row),
    target: Number(row?.observed_chosen_action) || 0,
  }));
  const rewardTrainingRows = policyTrainingRows
    .filter((row) => valueToFloat(row?.reward_target) != null)
    .map((row) => ({
      ...makePolicyModelFeatureRow(row),
      target: Number(row?.reward_target) || 0,
    }));

  const behaviorModel = fitLinearModel(
    behaviorTrainingRows,
    behaviorFeatureKeys,
    "target",
    {
      defaultValue: 0.2,
      clipRange: [0.001, 1],
      minRows: 8,
    },
  );
  const rewardModel = fitLinearModel(
    rewardTrainingRows,
    rewardFeatureKeys,
    "target",
    {
      defaultValue:
        mean(rewardTrainingRows.map((row) => Number(row?.target) || 0)) ?? 0.5,
      clipRange: [0, 1],
      minRows: 8,
    },
  );

  const grouped = new Map();
  for (const row of policyTrainingRows) {
    const key = getDecisionKey(row?.participant_id, row?.round_index);
    const bucket = grouped.get(key) || [];
    bucket.push(row);
    grouped.set(key, bucket);
  }

  const recommendationMap = new Map(
    recommendationWorkbenchRows.map((row) => [
      getDecisionKey(row?.participant_id, row?.round_index),
      row,
    ]),
  );

  const policyStateRows = [];

  for (const [stateKey, rows] of grouped.entries()) {
    const enriched = rows.map((row) => {
      const featureRow = makePolicyModelFeatureRow(row);
      return {
        ...row,
        __featureRow: featureRow,
        __behaviorScore: predictLinearModel(behaviorModel, featureRow),
        __rewardScore: predictLinearModel(rewardModel, featureRow),
      };
    });
    const behaviorProbabilities = softmax(
      enriched.map((row) => (row.__behaviorScore ?? 0) * 5),
    );
    for (let index = 0; index < enriched.length; index += 1) {
      enriched[index].estimated_behavior_probability =
        behaviorProbabilities[index] ?? 0;
    }

    const historical =
      enriched.find((row) => Number(row?.observed_chosen_action) === 1) ||
      chooseTopCandidate(enriched, (row) => row?.estimated_behavior_probability);
    const oracle = chooseTopCandidate(
      enriched,
      (row) => row?.action_score_ratio_to_best,
    );
    const rewardPolicy = chooseTopCandidate(enriched, (row) => row?.__rewardScore);
    const behaviorClone = chooseTopCandidate(
      enriched,
      (row) => row?.__behaviorScore,
    );
    const workbenchRow = recommendationMap.get(stateKey) || null;
    const contextualBandit =
      enriched.find(
        (row) =>
          bundleSignature(row?.action_bundle_ids) ===
          bundleSignature(workbenchRow?.recommended_bundle_ids),
      ) || rewardPolicy;

    const policyChoices = [
      ["historical_human", historical, valueToFloat(historical?.observed_reward) ?? valueToFloat(historical?.reward_target)],
      ["behavior_clone", behaviorClone, valueToFloat(behaviorClone?.reward_target)],
      ["reward_model", rewardPolicy, valueToFloat(rewardPolicy?.reward_target)],
      [
        "contextual_bandit",
        contextualBandit,
        valueToFloat(workbenchRow?.predicted_expected_score_ratio) ??
          valueToFloat(contextualBandit?.reward_target),
      ],
      ["oracle_optimal", oracle, valueToFloat(oracle?.reward_target)],
    ];

    const historicalReward =
      valueToFloat(historical?.observed_reward) ??
      valueToFloat(historical?.reward_target);
    const historicalRewardPrediction = historical
      ? predictLinearModel(rewardModel, historical.__featureRow)
      : null;

    for (const [policyName, selectedRow, expectedReward] of policyChoices) {
      if (!selectedRow) continue;
      policyStateRows.push({
        policy_name: policyName,
        participant_id: selectedRow?.participant_id,
        round_index: selectedRow?.round_index,
        phase: selectedRow?.phase,
        classification: selectedRow?.classification,
        scenario_id: selectedRow?.scenario_id,
        policy_bundle_ids: selectedRow?.action_bundle_ids ?? [],
        policy_bundle_size: selectedRow?.action_bundle_size ?? null,
        policy_reward: selectedRow?.reward_target ?? null,
        policy_expected_reward: expectedReward ?? selectedRow?.reward_target ?? null,
        policy_regret: selectedRow?.action_percent_regret ?? null,
        policy_is_optimal: selectedRow?.action_is_optimal ?? null,
        lift_vs_historical:
          expectedReward != null && historicalReward != null
            ? expectedReward - historicalReward
            : null,
        historical_bundle_ids: historical?.action_bundle_ids ?? [],
        historical_reward: historicalReward,
        historical_reward_prediction: historicalRewardPrediction,
        policy_reward_prediction: predictLinearModel(
          rewardModel,
          selectedRow.__featureRow,
        ),
        target_behavior_propensity:
          selectedRow?.estimated_behavior_probability ?? null,
        match_logged_action: Number(
          bundleSignature(selectedRow?.action_bundle_ids) ===
            bundleSignature(historical?.action_bundle_ids),
        ),
      });
    }
  }

  const policyComparisons = [
    ...summarizePolicyRows(policyStateRows, null),
    ...summarizePolicyRows(policyStateRows, "phase"),
    ...summarizePolicyRows(policyStateRows, "classification"),
  ];
  const opeSummary = [
    ...summarizeOpeRows(policyStateRows, null),
    ...summarizeOpeRows(policyStateRows, "classification"),
  ];
  const sandboxSummary = buildSandboxSummaryRows(policyStateRows);

  return {
    behaviorModel,
    rewardModel,
    policyStateRows,
    policyComparisons,
    opeSummary,
    sandboxSummary,
  };
}

export function buildDatasetSnapshot({
  analysis = {},
  datasetRoot = "",
  scenarioBundle = {},
} = {}) {
  const masterRows = Array.isArray(analysis?.analysisMasterRows)
    ? analysis.analysisMasterRows
    : [];
  const qaIssues = Array.isArray(analysis?.qaIssues) ? analysis.qaIssues : [];
  const issueTypeCounts = {};
  for (const issue of qaIssues) {
    const issueType = String(issue?.issue_type || "unknown");
    issueTypeCounts[issueType] = (issueTypeCounts[issueType] || 0) + 1;
  }

  const blockers = [];
  if (masterRows.some((row) => Number(row?.qa_missing_recommendation_labels) === 1)) {
    blockers.push("missing_recommendation_labels");
  }
  if (masterRows.some((row) => Number(row?.qa_completed_game_mismatch) === 1)) {
    blockers.push("completed_game_mismatch");
  }
  if (!masterRows.some((row) => Number(row?.timestamp_available) === 1)) {
    blockers.push("missing_timestamps");
  }

  return {
    schema_version: DATASET_SNAPSHOT_SCHEMA_VERSION,
    snapshot_id: `${String(datasetRoot || "dataset").trim() || "dataset"}_${Date.now()}`,
    created_at: new Date().toISOString(),
    dataset_root: datasetRoot,
    dataset_version:
      String(scenarioBundle?.metadata?.scenarioSetVersionId || "").trim() || null,
    feature_version: RESEARCH_FEATURE_VERSION,
    benchmark_only_dataset: Number(blockers.includes("missing_recommendation_labels")),
    split_manifest: buildSplitManifest(masterRows),
    qa_report: {
      paper_ready: blockers.length === 0,
      blockers,
      blocker_count: blockers.length,
      warning_count: qaIssues.filter(
        (issue) => String(issue?.severity || "") === "warning",
      ).length,
      issue_type_counts: issueTypeCounts,
    },
    analysis_outputs: {
      analysis_master_rows: masterRows.length,
      policy_training_rows: Array.isArray(analysis?.policyTrainingRows)
        ? analysis.policyTrainingRows.length
        : 0,
      row_source_counts: analysis?.metadata?.data_health?.rowSourceCounts || {},
      timestamped_rows:
        analysis?.metadata?.data_health?.timestampedDecisionRows || 0,
      reconstructed_rows:
        analysis?.metadata?.data_health?.reconstructedDecisionRows || 0,
    },
  };
}

export function computeAnalytics({
  participants = [],
  scenarioBundle = {},
  datasetRoot = "",
  citiesDataset = {},
  storeDataset = {},
  cohortField = "configuration",
  metadataRows = [],
  metadataJoinOptions = {},
  bootstrapB = DEFAULT_BOOTSTRAP_B,
  seed = DEFAULT_RANDOM_SEED,
} = {}) {
  const metadataMerge = mergeParticipantMetadata(
    participants,
    metadataRows,
    metadataJoinOptions,
  );
  const mergedParticipants = metadataMerge.participants;

  const {
    decisionFacts,
    qaIssues: baseQaIssues,
    dataHealth,
  } = buildDecisionFacts({
    participants: mergedParticipants,
    scenarioBundle,
    datasetRoot,
    citiesDataset,
    storeDataset,
    cohortField,
  });

  const researchRows = buildAnalysisMasterRows({
    decisionFacts,
    participants: mergedParticipants,
    scenarioBundle,
    citiesDataset,
    storeDataset,
    extraFields: appendUniqueColumns(metadataMerge.metadataFields, [
      cohortField,
    ]),
  });
  const analysisMasterRows = researchRows.masterRows;
  const policyTrainingRows = buildPolicyTrainingRows({
    masterRows: analysisMasterRows,
    scenarioBundle,
    citiesDataset,
    storeDataset,
    extraFields: appendUniqueColumns(metadataMerge.metadataFields, [
      cohortField,
    ]),
  });
  const recommendationWorkbench = buildRecommendationWorkbench({
    masterRows: analysisMasterRows,
    scenarioBundle,
    citiesDataset,
    storeDataset,
  });
  const policyEvaluation = buildPolicyEvaluationSuite({
    policyTrainingRows,
    recommendationWorkbenchRows: recommendationWorkbench.workbenchRows,
  });
  const participantTrajectories =
    buildParticipantTrajectoryRows(analysisMasterRows);
  const trajectorySegments = summarizeTrajectorySegments(
    participantTrajectories,
  );
  const behaviorByPhase = buildBehaviorSummaryRows(analysisMasterRows, "phase");
  const behaviorByRecommendationQuality = buildBehaviorSummaryRows(
    analysisMasterRows,
    "recommendation_quality",
  );
  const behaviorByTrajectorySegment = buildBehaviorSummaryRows(
    analysisMasterRows.map((row) => {
      const participantTrajectory = participantTrajectories.find(
        (entry) => entry.participant_id === row.participant_id,
      );
      return {
        ...row,
        trajectory_segment:
          participantTrajectory?.trajectory_segment || "mixed",
      };
    }),
    "trajectory_segment",
  );
  const transferSummary = buildTransferSummary(analysisMasterRows);

  const qaIssues = [
    ...baseQaIssues,
    ...metadataMerge.qaIssues,
    ...researchRows.qaIssues,
  ];

  const overall = buildKpiRows(analysisMasterRows, null, { bootstrapB, seed });
  const byClassification = buildKpiRows(analysisMasterRows, "classification", {
    bootstrapB,
    seed,
  });
  const byRound = buildKpiRows(analysisMasterRows, "round_index", {
    bootstrapB,
    seed,
  });
  const byParticipant = buildKpiRows(analysisMasterRows, "participant_id", {
    bootstrapB,
    seed,
  });
  const byCohort = buildKpiRows(analysisMasterRows, cohortField, {
    bootstrapB,
    seed,
  });
  const timingOverall = buildTimingKpiRows(analysisMasterRows, null);
  const timingByRound = buildTimingKpiRows(analysisMasterRows, "round_index");
  const timingByClassification = buildTimingKpiRows(
    analysisMasterRows,
    "classification",
  );
  const cohortComparisons = buildCohortComparisons(
    analysisMasterRows,
    cohortField,
    { bootstrapB, seed },
  );

  const metadata = {
    dataset_root: datasetRoot,
    feature_version: RESEARCH_FEATURE_VERSION,
    cohort_col: cohortField,
    bootstrap_b: bootstrapB,
    seed,
    data_health: dataHealth,
    input_counts: {
      participants: mergedParticipants.length,
      scenarios: Array.isArray(scenarioBundle?.scenarios)
        ? scenarioBundle.scenarios.length
        : 0,
      orders: Array.isArray(scenarioBundle?.orders)
        ? scenarioBundle.orders.length
        : 0,
      optimal: Array.isArray(scenarioBundle?.optimal)
        ? scenarioBundle.optimal.length
        : 0,
      decisions: decisionFacts.length,
      analysis_master_rows: analysisMasterRows.length,
      policy_training_rows: policyTrainingRows.length,
      recommendation_workbench_rows:
        recommendationWorkbench.workbenchRows.length,
      qa_issues: qaIssues.length,
    },
    metadata_join: metadataMerge.metadataSummary || {
      rowsLoaded: 0,
      matchedParticipants: 0,
      unmatchedParticipants: 0,
      fallbackMatches: 0,
    },
    models: {
      adoption_training_rows:
        recommendationWorkbench.adoptionModel?.trainingRows || 0,
      outcome_training_rows:
        recommendationWorkbench.outcomeModel?.trainingRows || 0,
      behavior_policy_training_rows:
        policyEvaluation.behaviorModel?.trainingRows || 0,
      reward_policy_training_rows:
        policyEvaluation.rewardModel?.trainingRows || 0,
    },
    generated_at: new Date().toISOString(),
  };
  const datasetSnapshot = buildDatasetSnapshot({
    analysis: {
      analysisMasterRows,
      policyTrainingRows,
      qaIssues,
      metadata,
    },
    datasetRoot,
    scenarioBundle,
  });
  metadata.snapshot_id = datasetSnapshot.snapshot_id;
  metadata.paper_ready = datasetSnapshot.qa_report.paper_ready;

  return {
    decisionFacts,
    analysisMasterRows,
    policyTrainingRows,
    recommendationWorkbenchRows: recommendationWorkbench.workbenchRows,
    recommendationSummary: recommendationWorkbench.recommendationSummary,
    behaviorByPhase,
    behaviorByRecommendationQuality,
    behaviorByTrajectorySegment,
    participantTrajectories,
    trajectorySegments,
    transferSummary,
    policyStateRows: policyEvaluation.policyStateRows,
    policyComparisons: policyEvaluation.policyComparisons,
    opeSummary: policyEvaluation.opeSummary,
    sandboxSummary: policyEvaluation.sandboxSummary,
    datasetSnapshot,
    kpiOverall: overall,
    kpiByClassification: byClassification,
    kpiByRound: byRound,
    kpiByParticipant: byParticipant,
    kpiByCohort: byCohort,
    kpiTimingOverall: timingOverall,
    kpiTimingByRound: timingByRound,
    kpiTimingByClassification: timingByClassification,
    cohortComparisons,
    qaIssues,
    dataHealth,
    metadataFields: metadataMerge.metadataFields,
    metadata,
  };
}
