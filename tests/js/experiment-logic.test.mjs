import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BUNDLEGAME_STUDY_PROTOCOL_VERSION,
  BUNDLEGAME_STUDY_TOTAL_ROUNDS,
  RESEARCH_MODEL_STATUSES,
  RESEARCH_MODEL_TYPES,
  getCanonicalResearchStudyProtocol,
  resolveProtocolPhaseForRound,
  resolveRecommendationSlate,
  validateResearchProtocolDefinition,
  validateResearchProtocolSnapshot,
} from "../../src/lib/researchStudy.js";

function buildScenario(round) {
  const phase = round <= 15 ? "A" : round <= 35 ? "B" : "C";
  return {
    round,
    phase,
    scenario_id: `${phase}${String(round).padStart(2, "0")}`,
    order_ids: [`R${round}_A`, `R${round}_B`, `R${round}_C`, `R${round}_D`],
    orders: [],
  };
}

test("canonical protocol assigns rounds to the expected A/B/C phases", () => {
  const protocol = getCanonicalResearchStudyProtocol({ enabled: true });

  assert.equal(protocol.protocol_version, BUNDLEGAME_STUDY_PROTOCOL_VERSION);
  assert.equal(protocol.expected_total_rounds, BUNDLEGAME_STUDY_TOTAL_ROUNDS);

  for (const [round, expectedPhase] of [
    [1, "A"],
    [15, "A"],
    [16, "B"],
    [35, "B"],
    [36, "C"],
    [50, "C"],
  ]) {
    assert.equal(resolveProtocolPhaseForRound(round, protocol)?.id, expectedPhase);
  }
});

test("protocol validation rejects phase-length drift before analysis", () => {
  const protocol = getCanonicalResearchStudyProtocol({ enabled: true });
  const validDefinition = validateResearchProtocolDefinition(protocol);
  assert.equal(validDefinition.ok, true);

  const invalidDefinition = validateResearchProtocolDefinition({
    ...protocol,
    expected_total_rounds: 24,
    phase_plan: [
      { id: "A", rounds: 6, recommendations_enabled: false },
      { id: "B", rounds: 12, recommendations_enabled: true },
      { id: "C", rounds: 6, recommendations_enabled: false },
    ],
  });
  assert.equal(invalidDefinition.ok, false);
  assert.match(invalidDefinition.errors.join("; "), /50|Phase|phase_plan/);

  const validScenarioBundle = {
    scenarios: Array.from({ length: BUNDLEGAME_STUDY_TOTAL_ROUNDS }, (_, index) =>
      buildScenario(index + 1),
    ),
    metadata: {
      protocol_version: BUNDLEGAME_STUDY_PROTOCOL_VERSION,
      expected_total_rounds: BUNDLEGAME_STUDY_TOTAL_ROUNDS,
    },
  };
  const mismatchedScenarioBundle = {
    ...validScenarioBundle,
    scenarios: validScenarioBundle.scenarios.map((scenario) => ({ ...scenario })),
  };
  mismatchedScenarioBundle.scenarios[15].phase = "A";

  const snapshotValidation = validateResearchProtocolSnapshot({
    scenarioBundle: mismatchedScenarioBundle,
    studyProtocol: protocol,
    datasetRoot: "mainGame",
  });
  assert.equal(snapshotValidation.ok, false);
  assert.match(snapshotValidation.errors.join("; "), /round 16 phase must be B/);
});

test("recommendation slate resolution uses active model maps only in treatment phases", () => {
  const protocol = getCanonicalResearchStudyProtocol({
    enabled: true,
    dataset_root: "mainGame",
    dataset_snapshot_id: "snapshot_protocol",
  });
  const scenario = {
    scenario_id: "B16",
    round: 16,
    phase: "B",
  };
  const model = {
    model_id: "cb_fixture_v1",
    policy_name: "contextual_bandit_linear",
    policy_version: "v2",
    model_type: RESEARCH_MODEL_TYPES.CONTEXTUAL_BANDIT,
    implementation_status: RESEARCH_MODEL_STATUSES.ANALYSIS_BASELINE,
    is_active: true,
    dataset_root: "mainGame",
    dataset_snapshot_id: "snapshot_model",
    action_mask_version: "mask_fixture_v1",
    recommendation_map: {
      B16: {
        ranked_bundles: [
          ["O2", "O3"],
          ["O1"],
        ],
        dataset_snapshot_id: "snapshot_model",
        action_mask_version: "mask_fixture_v1",
        policy_version: "v2",
      },
    },
  };

  const slate = resolveRecommendationSlate({
    scenario,
    optimal: { best_bundle_ids: ["O1", "O4"] },
    studyProtocol: protocol,
    studyState: {
      assigned_arm: "contextual_bandit",
      policy_name: "contextual_bandit_linear",
      protocol_id: protocol.protocol_id,
    },
    researchModels: [model],
  });

  assert.equal(slate.recommendation_source, "model_registry");
  assert.equal(slate.policy_arm, "contextual_bandit");
  assert.equal(slate.policy_name, "contextual_bandit_linear");
  assert.deepEqual(slate.shown_bundle_ids, ["O2", "O3"]);
  assert.deepEqual(slate.shown_ranked_bundles, [
    ["O2", "O3"],
    ["O1"],
  ]);
  assert.equal(slate.dataset_snapshot_id, "snapshot_model");
  assert.equal(slate.legal_action_mask_version, "mask_fixture_v1");

  const controlSlate = resolveRecommendationSlate({
    scenario: { ...scenario, phase: "A", round: 1 },
    optimal: { best_bundle_ids: ["O1", "O4"] },
    studyProtocol: protocol,
    studyState: {
      assigned_arm: "control",
      policy_name: "control",
      protocol_id: protocol.protocol_id,
    },
    researchModels: [model],
  });
  assert.equal(controlSlate.recommendation_source, "none");
  assert.deepEqual(controlSlate.shown_bundle_ids, []);
});
