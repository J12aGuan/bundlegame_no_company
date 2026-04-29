import csv
import json
from pathlib import Path

import pytest

from offline_rl.export_artifacts import export_registry_row
from offline_rl.schema import validate_files
from offline_rl.train import run_training
from offline_rl.utils import participant_split


def test_schema_validation_and_repeatable_cql_training(tmp_path: Path):
    policy_csv, snapshot_json = _write_fixture_snapshot(tmp_path)
    validation = validate_files(policy_csv, snapshot_json)
    assert validation.ok
    assert validation.state_count == 6

    config = tmp_path / "cql.json"
    config.write_text(
        json.dumps(
            {
                "algorithm": "cql",
                "policy_name": "cql_masked_discrete",
                "policy_version": "test",
                "seed": 7,
                "gamma": 0.0,
                "epochs": 12,
                "learning_rate": 0.3,
                "cql_alpha": 0.1,
            }
        ),
        encoding="utf-8",
    )
    first = run_training(config, policy_csv, snapshot_json, tmp_path / "first")
    second = run_training(config, policy_csv, snapshot_json, tmp_path / "second")

    assert first["policy_comparison"] == second["policy_comparison"]
    assert first["ope_summary"] == second["ope_summary"]
    assert (tmp_path / "first" / "checkpoint.json").read_text(encoding="utf-8") == (
        tmp_path / "second" / "checkpoint.json"
    ).read_text(encoding="utf-8")
    assert (tmp_path / "first" / "policy_comparison.csv").exists()
    assert (tmp_path / "first" / "ope_summary.csv").exists()
    assert (tmp_path / "first" / "scenario_recommendation_map.json").exists()
    assert first["split_counts"]["train"] > 0
    assert first["split_counts"]["validation"] > 0
    assert first["split_counts"]["test"] > 0


def test_iql_training_and_registry_export(tmp_path: Path):
    policy_csv, snapshot_json = _write_fixture_snapshot(tmp_path)
    config = tmp_path / "iql.json"
    config.write_text(
        json.dumps(
            {
                "algorithm": "iql",
                "policy_name": "iql_masked_discrete",
                "policy_version": "test",
                "seed": 9,
                "gamma": 0.0,
                "epochs": 10,
                "learning_rate": 0.25,
                "expectile": 0.7,
            }
        ),
        encoding="utf-8",
    )
    summary = run_training(config, policy_csv, snapshot_json, tmp_path / "iql")
    assert summary["algorithm"] == "iql"

    row = export_registry_row(tmp_path / "iql", tmp_path / "registry")
    assert row["model_type"] == "offline_rl"
    assert row["implementation_status"] == "trained"
    assert row["simulator_only"] == "false"
    assert (tmp_path / "registry" / "research_model_registry_row.csv").exists()


def test_schema_validation_rejects_missing_mask_column(tmp_path: Path):
    policy_csv, snapshot_json = _write_fixture_snapshot(tmp_path)
    rows = list(csv.DictReader(policy_csv.open("r", encoding="utf-8", newline="")))
    bad_csv = tmp_path / "bad_policy_training.csv"
    fieldnames = [field for field in rows[0].keys() if field != "action_legal"]
    with bad_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row[field] for field in fieldnames})

    validation = validate_files(bad_csv, snapshot_json)
    assert not validation.ok
    assert any("action_legal" in error for error in validation.errors)


def _write_fixture_snapshot(tmp_path: Path):
    participants = {
        split: _participant_for_split(split)
        for split in ["train", "validation", "test"]
    }
    rows = []
    for split, participant_id in participants.items():
        for round_index in [1, 2]:
            state_id = f"state_{split}_{round_index}"
            next_state_id = f"state_{split}_{round_index + 1}" if round_index == 1 else ""
            for action_number, reward in [(1, 0.4), (2, 0.9)]:
                rows.append(
                    {
                        "dataset_root": "fixture",
                        "participant_id": participant_id,
                        "state_id": state_id,
                        "round_index": round_index,
                        "phase": "A" if round_index == 1 else "B",
                        "scenario_id": f"scenario_{round_index}",
                        "state_dataset_snapshot_id": "fixture_snapshot",
                        "state_legal_action_mask_version": "legal_bundle_mask_v1",
                        "state_phase_progress_index": "0.1",
                        "state_prior_decisions_count": str(round_index - 1),
                        "state_prior_optimal_rate": "0.5",
                        "state_prior_failure_rate": "0",
                        "state_prior_recommendation_compliance": "0",
                        "state_prior_mean_bundle_size": "1",
                        "state_prior_mean_regret": "0.1",
                        "state_prior_mean_score_ratio": "0.6",
                        "state_prior_phase_score_ratio": "0.6",
                        "action_id": f"action_{round_index}_{action_number}",
                        "action_bundle_ids": json.dumps([f"order_{round_index}_{action_number}"]),
                        "action_delivery_sequence_ids": json.dumps([f"order_{round_index}_{action_number}"]),
                        "action_legal": "1",
                        "action_bundle_size": "1",
                        "action_score_ratio_to_best": str(reward),
                        "action_percent_regret": str(1 - reward),
                        "action_score": str(reward * 10),
                        "action_modeled_time": "100",
                        "action_travel_time": "80",
                        "action_pick_time": "20",
                        "action_earnings": "10",
                        "action_is_optimal": "1" if action_number == 2 else "0",
                        "action_is_near_optimal": "1" if action_number == 2 else "0",
                        "action_matches_shown_recommendation": "0",
                        "observed_chosen_action": "1" if action_number == 1 else "0",
                        "reward_target": str(reward),
                        "observed_reward": str(reward) if action_number == 1 else "",
                        "next_round_index": "2" if round_index == 1 else "",
                        "next_state_id": next_state_id,
                        "done": "0" if round_index == 1 else "1",
                    }
                )

    policy_csv = tmp_path / "policy_training.csv"
    fieldnames = list(rows[0].keys())
    with policy_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    snapshot_json = tmp_path / "dataset_snapshot.json"
    snapshot_json.write_text(
        json.dumps(
            {
                "snapshot_id": "fixture_snapshot",
                "split_manifest": {"method": "stable_hash_participant_id"},
                "analysis_outputs": {"policy_training_rows": len(rows)},
            }
        ),
        encoding="utf-8",
    )
    return policy_csv, snapshot_json


def _participant_for_split(split: str) -> str:
    for index in range(10_000):
        candidate = f"participant_{split}_{index}"
        if participant_split(candidate) == split:
            return candidate
    raise AssertionError(f"unable to find participant for split {split}")
