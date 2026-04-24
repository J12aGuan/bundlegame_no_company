import csv
import json
from pathlib import Path

from analytics.cli import build_parser, run_pipeline


FIXTURES = Path(__file__).parent / "fixtures"


def test_cli_json_pipeline_outputs(tmp_path: Path):
    parser = build_parser()
    args = parser.parse_args(
        [
            "run",
            "--source",
            "json",
            "--dataset-root",
            "experiment",
            "--data-json",
            str(FIXTURES / "participants_fixture.json"),
            "--scenario-bundle-json",
            str(FIXTURES / "scenario_bundle_fixture.json"),
            "--stores-json",
            str(FIXTURES / "stores_fixture.json"),
            "--cities-json",
            str(FIXTURES / "cities_fixture.json"),
            "--metadata-file",
            str(FIXTURES / "metadata_fixture.csv"),
            "--out-dir",
            str(tmp_path),
            "--bootstrap-b",
            "200",
            "--seed",
            "1",
            "--cohort-col",
            "condition",
        ]
    )

    metadata = run_pipeline(args)
    assert metadata["input_counts"]["participants"] == 2

    required = [
        "decision_fact.csv",
        "analysis_master.csv",
        "analysis_master.json",
        "policy_training.csv",
        "recommendation_workbench.csv",
        "recommendation_summary.csv",
        "policy_comparison.csv",
        "ope_summary.csv",
        "sandbox_summary.csv",
        "dataset_snapshot.json",
        "kpi_overall.csv",
        "kpi_by_round.csv",
        "kpi_by_participant.csv",
        "kpi_by_classification.csv",
        "kpi_by_scenario.csv",
        "kpi_timing_overall.csv",
        "kpi_timing_by_round.csv",
        "kpi_timing_by_classification.csv",
        "behavior_by_phase.csv",
        "behavior_by_recommendation_quality.csv",
        "behavior_by_trajectory_segment.csv",
        "participant_trajectories.csv",
        "trajectory_segments.csv",
        "qa_issues.csv",
        "cohort_comparisons.csv",
        "run_metadata.json",
    ]
    for name in required:
        assert (tmp_path / name).exists()

    decision_header = (tmp_path / "decision_fact.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in [
        "decision_source",
        "decision_timestamp",
        "timestamp_available",
        "round_coverage_status",
        "classification",
        "phase",
        "score_ratio_to_best",
        "percent_regret",
        "scenario_set_version_id",
        "local_delivery_time",
        "city_travel_time",
        "runtime_modeled_delta",
    ]:
        assert field in decision_header

    master_header = (tmp_path / "analysis_master.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in [
        "decision_source",
        "decision_timestamp",
        "timestamp_available",
        "round_coverage_status",
        "qa_completed_game_mismatch",
        "qa_missing_recommendation_labels",
        "shown_recommendation_status",
        "recommendation_quality",
        "prior_optimal_rate",
        "prior_failure_rate",
        "prior_recommendation_compliance",
        "prior_mean_bundle_size",
        "phase_progress_index",
        "condition",
    ]:
        assert field in master_header

    policy_header = (tmp_path / "policy_training.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in [
        "state_decision_source",
        "state_decision_timestamp",
        "state_timestamp_available",
        "state_round_coverage_status",
        "state_qa_completed_game_mismatch",
        "state_qa_missing_recommendation_labels",
        "state_prior_optimal_rate",
        "action_bundle_ids",
        "reward_target",
        "observed_reward",
        "done",
        "condition",
    ]:
        assert field in policy_header

    rec_header = (tmp_path / "recommendation_workbench.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in [
        "predicted_adoption_probability",
        "predicted_outcome_score_ratio",
        "predicted_expected_score_ratio",
        "why_ranked_high",
    ]:
        assert field in rec_header

    policy_header = (tmp_path / "policy_comparison.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in ["policy_name", "mean_reward", "mean_lift_vs_historical"]:
        assert field in policy_header

    ope_header = (tmp_path / "ope_summary.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in ["ips", "snips", "doubly_robust", "fqe_one_step"]:
        assert field in ope_header

    sandbox_header = (tmp_path / "sandbox_summary.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in ["simulation_label", "mean_simulated_reward", "mean_gap_vs_historical"]:
        assert field in sandbox_header

    assert metadata["metadata_join"]["matchedParticipants"] == 2
    assert metadata["input_counts"]["analysis_master_rows"] == 3
    assert metadata["input_counts"]["policy_training_rows"] > metadata["input_counts"]["analysis_master_rows"]
    assert metadata["feature_version"] == "research_v2"
    assert "snapshot_id" in metadata
    assert metadata["paper_ready"] is False
    assert metadata["models"]["behavior_policy_training_rows"] > 0
    assert metadata["models"]["reward_policy_training_rows"] > 0

    dataset_snapshot = json.loads((tmp_path / "dataset_snapshot.json").read_text(encoding="utf-8"))
    assert dataset_snapshot["feature_version"] == "research_v2"
    assert dataset_snapshot["qa_report"]["paper_ready"] is False
    assert "missing_recommendation_labels" in dataset_snapshot["qa_report"]["blockers"]
    assert dataset_snapshot["analysis_outputs"]["analysis_master_rows"] == 3
    assert dataset_snapshot["analysis_outputs"]["timestamped_rows"] == 3


def test_cli_recovers_reconstructed_action_summary_rows(tmp_path: Path):
    parser = build_parser()
    args = parser.parse_args(
        [
            "run",
            "--source",
            "json",
            "--dataset-root",
            "mainGame",
            "--data-json",
            str(FIXTURES / "participants_reconstructed_fixture.json"),
            "--scenario-bundle-json",
            str(FIXTURES / "scenario_bundle_fixture.json"),
            "--stores-json",
            str(FIXTURES / "stores_fixture.json"),
            "--cities-json",
            str(FIXTURES / "cities_fixture.json"),
            "--out-dir",
            str(tmp_path),
            "--bootstrap-b",
            "50",
            "--seed",
            "7",
        ]
    )

    metadata = run_pipeline(args)
    assert metadata["input_counts"]["analysis_master_rows"] == 1
    assert metadata["data_health"]["reconstructedDecisionRows"] == 1
    assert metadata["data_health"]["timestampedDecisionRows"] == 0

    with (tmp_path / "decision_fact.csv").open("r", encoding="utf-8", newline="") as handle:
        decision_rows = list(csv.DictReader(handle))
    assert len(decision_rows) == 1
    row = decision_rows[0]
    assert row["decision_source"] == "action_summary_reconstructed"
    assert row["timestamp_available"] == "0"
    assert row["round_coverage_status"] == "reconstructed_action_summary"

    dataset_snapshot = json.loads((tmp_path / "dataset_snapshot.json").read_text(encoding="utf-8"))
    assert "missing_timestamps" in dataset_snapshot["qa_report"]["blockers"]
    assert dataset_snapshot["analysis_outputs"]["reconstructed_rows"] == 1
