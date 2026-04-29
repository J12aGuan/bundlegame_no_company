import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getPolicyTrainingExportColumns,
  buildDatasetSnapshot,
} from "../../src/lib/analysis/engine.js";
import {
  FIXED_SCORE_ROUND_COUNT,
  ROUND_SCORE_STATUSES,
  buildAdminScoreSheet,
  getAdminScoreExportRows,
} from "../../src/lib/adminScores.js";
import {
  BUNDLEGAME_STUDY_TOTAL_ROUNDS,
  getCanonicalResearchStudyProtocol,
} from "../../src/lib/researchStudy.js";

function makeSummary({
  versionId = "mainGame",
  resultAccessKey = "result_key",
  roundsCompleted = 0,
  totalRounds = BUNDLEGAME_STUDY_TOTAL_ROUNDS,
  earnings = 0,
  optimalChoices = 0,
} = {}) {
  return {
    id: "summary",
    summaryByScenarioSetVersionId: {
      [versionId]: {
        scenarioSetName: "Main Game",
        totalRounds,
        roundsCompleted,
        optimalChoices,
        totalGameTime: roundsCompleted * 30,
        completedGame: true,
        earnings,
        resultAccessKey,
        completionMeta: { finalSaveConfirmedAt: "2026-04-27T10:25:00.000Z" },
      },
    },
  };
}

function makeAction(roundIndex, scoreRatio, extra = {}) {
  const hasScore = scoreRatio !== undefined;
  return {
    id: `mainGame__round_${roundIndex}`,
    type: "round_summary",
    scenarioSetVersionId: "mainGame",
    round_index: roundIndex,
    scenario_id: `scenario_${roundIndex}`,
    success: true,
    ...(hasScore
      ? {
          outcome_snapshot: {
            score_ratio_to_best: scoreRatio,
            participant_score: scoreRatio * 100,
            best_score: 100,
          },
        }
      : {}),
    ...extra,
  };
}

function makeUser(id, summaryOptions, actions = []) {
  return {
    id,
    displayName: `${id} Name`,
    summaryDoc: makeSummary({
      ...summaryOptions,
      resultAccessKey: `${id}_result_key`,
    }),
    actions,
  };
}

function makeQualtrics(userId) {
  return {
    id: `response_${userId}`,
    response_id: `response_${userId}`,
    user_id: userId,
    result_access_key: `${userId}_result_key`,
    match_key: `${userId}::${userId}_result_key`,
    finished: true,
    recorded_at: "2026-04-27T10:30:00.000Z",
  };
}

function getRow(exportRows, participantId) {
  const row = exportRows.find((entry) => entry.participant_id === participantId);
  assert.ok(row, `Expected export row for ${participantId}`);
  return row;
}

function assertFixedRoundColumns(row) {
  const scoreColumns = Object.keys(row).filter((key) =>
    /^round_\d+_score_ratio$/.test(key),
  );
  const statusColumns = Object.keys(row).filter((key) =>
    /^round_\d+_score_ratio_status$/.test(key),
  );
  assert.equal(scoreColumns.length, FIXED_SCORE_ROUND_COUNT);
  assert.equal(statusColumns.length, FIXED_SCORE_ROUND_COUNT);
  assert.ok(Object.hasOwn(row, "round_1_score_ratio"));
  assert.ok(Object.hasOwn(row, "round_50_score_ratio"));
  assert.equal(Object.hasOwn(row, "round_51_score_ratio"), false);
}

test("admin score export has deterministic 50-round score columns and statuses", () => {
  const fullUser = makeUser(
    "full_user",
    { roundsCompleted: 50, totalRounds: 50, earnings: 1000, optimalChoices: 45 },
    Array.from({ length: 50 }, (_, index) =>
      makeAction(index + 1, (index + 1) / 50),
    ),
  );
  const partialUser = makeUser(
    "partial_user",
    { roundsCompleted: 3, totalRounds: 50, earnings: 100, optimalChoices: 1 },
    [makeAction(1, 0.5), makeAction(2, undefined)],
  );
  const malformedUser = makeUser(
    "malformed_user",
    { roundsCompleted: 2, totalRounds: 50, earnings: 50, optimalChoices: 0 },
    [{ id: "not_a_round_summary", type: "bad_payload" }],
  );

  const scoreSheet = buildAdminScoreSheet(
    [fullUser, partialUser, malformedUser],
    [
      makeQualtrics("full_user"),
      makeQualtrics("partial_user"),
      makeQualtrics("malformed_user"),
    ],
  );
  const rows = getAdminScoreExportRows(scoreSheet.rows, scoreSheet.maxRound);

  const fullRow = getRow(rows, "full_user");
  assertFixedRoundColumns(fullRow);
  assert.equal(fullRow.valid_score_ratio_round_count, 50);
  assert.equal(fullRow.round_1_score_ratio, 0.02);
  assert.equal(fullRow.round_50_score_ratio, 1);
  assert.equal(fullRow.round_50_score_ratio_status, ROUND_SCORE_STATUSES.VALID);
  assert.equal(Number(fullRow.average_score_ratio.toFixed(4)), 0.51);

  const partialRow = getRow(rows, "partial_user");
  assertFixedRoundColumns(partialRow);
  assert.equal(partialRow.round_1_score_ratio, 0.5);
  assert.equal(partialRow.round_2_score_ratio, null);
  assert.equal(partialRow.round_2_score_ratio_status, ROUND_SCORE_STATUSES.PLAYED_INVALID);
  assert.equal(partialRow.round_3_score_ratio_status, ROUND_SCORE_STATUSES.EXPORT_MISSING);
  assert.equal(partialRow.round_4_score_ratio_status, ROUND_SCORE_STATUSES.NOT_PLAYED);
  assert.equal(partialRow.average_score_ratio, 0.5);

  const malformedRow = getRow(rows, "malformed_user");
  assertFixedRoundColumns(malformedRow);
  assert.equal(malformedRow.average_score_ratio, null);
  assert.equal(malformedRow.average_score_ratio_status, "no_valid_round_scores");
  assert.equal(malformedRow.round_1_score_ratio_status, ROUND_SCORE_STATUSES.EXPORT_MISSING);
  assert.equal(malformedRow.round_3_score_ratio_status, ROUND_SCORE_STATUSES.NOT_PLAYED);
});

test("policy training exports expose full masked state-action tuple columns", () => {
  const columns = getPolicyTrainingExportColumns(["condition"]);
  for (const field of [
    "state_id",
    "state_dataset_snapshot_id",
    "state_legal_action_mask_version",
    "action_id",
    "action_legal",
    "action_bundle_ids",
    "observed_chosen_action",
    "reward_target",
    "observed_reward",
    "next_state_id",
    "done",
    "condition",
  ]) {
    assert.ok(columns.includes(field), `Expected ${field} in policy training export`);
  }
});

test("admin research snapshot smoke test reports QA gates and export counts", () => {
  const studyProtocol = getCanonicalResearchStudyProtocol({
    enabled: true,
    dataset_root: "mainGame",
  });
  const analysis = {
    analysisMasterRows: [
      {
        participant_id: "participant_a",
        round_index: 16,
        phase: "B",
        timestamp_available: 1,
        qa_missing_recommendation_labels: 0,
        qa_completed_game_mismatch: 0,
      },
      {
        participant_id: "participant_b",
        round_index: 17,
        phase: "B",
        timestamp_available: 1,
        qa_missing_recommendation_labels: 1,
        qa_completed_game_mismatch: 0,
      },
    ],
    policyTrainingRows: [
      {
        state_id: "participant_a::16",
        action_id: "scenario_16::O1+O2",
        action_legal: 1,
        observed_chosen_action: 1,
      },
    ],
    studyRandomizationRows: [{ participant_id: "participant_a" }],
    participantSurveyRows: [{ participant_id: "participant_a" }],
    humanPolicyEvalRows: [{ participant_id: "participant_a" }],
    qaIssues: [{ issue_type: "missing_recommendation_labels", severity: "error" }],
    metadata: {
      data_health: {
        rowSourceCounts: { round_summary: 2 },
        timestampedDecisionRows: 2,
        reconstructedDecisionRows: 0,
      },
    },
  };

  const snapshot = buildDatasetSnapshot({
    analysis,
    datasetRoot: "mainGame",
    scenarioBundle: {
      metadata: { scenarioSetVersionId: "mainGame_fixed" },
    },
    studyProtocol,
  });

  assert.equal(snapshot.dataset_root, "mainGame");
  assert.equal(snapshot.dataset_version, "mainGame_fixed");
  assert.equal(snapshot.analysis_outputs.analysis_master_rows, 2);
  assert.equal(snapshot.analysis_outputs.policy_training_rows, 1);
  assert.equal(snapshot.analysis_outputs.study_randomization_rows, 1);
  assert.equal(snapshot.analysis_outputs.participant_survey_rows, 1);
  assert.equal(snapshot.analysis_outputs.timestamped_rows, 2);
  assert.equal(snapshot.qa_report.paper_ready, false);
  assert.deepEqual(snapshot.qa_report.blockers, ["missing_recommendation_labels"]);
  assert.equal(snapshot.split_manifest.method, "stable_hash_participant_id");
  assert.equal(snapshot.study_protocol.enabled, true);
});
