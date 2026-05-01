import csv
import json
from pathlib import Path

import torch

from offline_rl_deep.data import load_dataset, participant_overlap_report
from offline_rl_deep.schema import validate_files
from offline_rl_deep.train import run_training
from offline_rl_deep.utils import participant_split, read_json


REQUIRED_ARTIFACTS = [
    "checkpoint.pt",
    "config.json",
    "training_log.jsonl",
    "evaluation_summary.json",
    "policy_comparison.csv",
    "ope_summary.csv",
    "recommendation_map.json",
    "scenario_recommendation_map.json",
    "seed_summary.csv",
    "multi_seed_summary.json",
    "schema_validation.json",
]


def test_cql_is_deterministic_masks_illegal_actions_and_writes_artifacts(tmp_path: Path):
    policy_csv, snapshot_json = _write_fixture_snapshot(tmp_path)
    config = _write_config(tmp_path, "cql")

    first = run_training(config, policy_csv, snapshot_json, tmp_path / "first")
    second = run_training(config, policy_csv, snapshot_json, tmp_path / "second")

    first_map = read_json(tmp_path / "first" / "recommendation_map.json")
    second_map = read_json(tmp_path / "second" / "recommendation_map.json")
    assert first_map == second_map
    assert first["seed_count"] == 5
    _assert_required_artifacts(tmp_path / "first")
    _assert_no_illegal_recommendations(tmp_path / "first")

    checkpoint = torch.load(tmp_path / "first" / "checkpoint.pt", map_location="cpu", weights_only=False)
    assert checkpoint["schema_version"] == "bundlegame_deep_offline_rl_checkpoint_v1"
    assert checkpoint["feature_schema"]["state_columns"]
    assert checkpoint["feature_schema"]["action_columns"]


def test_iql_writes_five_seed_artifacts_and_estimated_propensity(tmp_path: Path):
    policy_csv, snapshot_json = _write_fixture_snapshot(tmp_path)
    config = _write_config(tmp_path, "iql")

    summary = run_training(config, policy_csv, snapshot_json, tmp_path / "iql")

    assert summary["algorithm"] == "iql"
    assert summary["seed_count"] == 5
    _assert_required_artifacts(tmp_path / "iql")
    _assert_no_illegal_recommendations(tmp_path / "iql")

    ope_rows = list(csv.DictReader((tmp_path / "iql" / "ope_summary.csv").open("r", encoding="utf-8", newline="")))
    assert ope_rows
    assert {row["propensity_source"] for row in ope_rows if int(row["n_states"]) > 0} == {"estimated_behavior_model"}


def test_schema_and_participant_split_integrity(tmp_path: Path):
    policy_csv, snapshot_json = _write_fixture_snapshot(tmp_path)
    validation = validate_files(policy_csv, snapshot_json)
    assert validation.ok

    states, _metadata = load_dataset(str(policy_csv), str(snapshot_json))
    assert participant_overlap_report(states) == {}
    split_counts = {split: len([state for state in states if state.split == split]) for split in ["train", "validation", "test"]}
    assert all(count > 0 for count in split_counts.values())


def _write_config(tmp_path: Path, algorithm: str) -> Path:
    config = {
        "algorithm": algorithm,
        "policy_name": f"deep_{algorithm}_masked_test",
        "policy_version": "fixture",
        "seeds": [1, 2, 3, 4, 5],
        "hidden_dim": 16,
        "learning_rate": 0.01,
        "batch_size": 2,
        "epochs": 2,
        "bc_epochs": 1,
        "patience": 2,
        "gamma": 0.0,
        "cql_alpha": 0.1,
        "expectile": 0.7,
        "awr_temperature": 1.0,
        "target_tau": 0.1,
    }
    path = tmp_path / f"{algorithm}.json"
    path.write_text(json.dumps(config), encoding="utf-8")
    return path


def _assert_required_artifacts(out_dir: Path) -> None:
    for artifact in REQUIRED_ARTIFACTS:
        assert (out_dir / artifact).exists(), artifact
    for seed in [1, 2, 3, 4, 5]:
        assert (out_dir / "seeds" / f"seed_{seed}" / "checkpoint.pt").exists()


def _assert_no_illegal_recommendations(out_dir: Path) -> None:
    payload = read_json(out_dir / "recommendation_map.json")
    rows = payload.get("rows", [])
    assert rows
    assert all(row["action_legal"] is True for row in rows)
    assert all(not row["selected_action_id"].startswith("illegal_high_reward") for row in rows)


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
            actions = [
                ("observed_low", 0.35, True, True),
                ("legal_high", 0.9, True, False),
                ("illegal_high_reward", 9.0, False, False),
            ]
            for action_id, reward, legal, observed in actions:
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
                        "state_phase_progress_index": str(round_index / 50),
                        "state_prior_decisions_count": str(round_index - 1),
                        "state_prior_optimal_rate": "0.5",
                        "state_prior_failure_rate": "0",
                        "state_prior_recommendation_compliance": "0",
                        "state_prior_mean_bundle_size": "1",
                        "state_prior_mean_regret": "0.1",
                        "state_prior_mean_score_ratio": "0.6",
                        "state_prior_phase_score_ratio": "0.6",
                        "action_id": f"{action_id}_{round_index}",
                        "action_bundle_ids": json.dumps([f"order_{round_index}_{action_id}"]),
                        "action_delivery_sequence_ids": json.dumps([f"order_{round_index}_{action_id}"]),
                        "action_legal": "1" if legal else "0",
                        "action_bundle_size": "1",
                        "action_score_ratio_to_best": str(min(1.0, reward)),
                        "action_percent_regret": str(max(0.0, 1.0 - min(1.0, reward))),
                        "action_score": str(reward * 10),
                        "action_modeled_time": "100",
                        "action_travel_time": "80",
                        "action_pick_time": "20",
                        "action_earnings": "10",
                        "action_is_optimal": "1" if action_id == "legal_high" else "0",
                        "action_is_near_optimal": "1" if action_id == "legal_high" else "0",
                        "action_matches_shown_recommendation": "0",
                        "observed_chosen_action": "1" if observed else "0",
                        "reward_target": str(reward),
                        "observed_reward": str(reward) if observed else "",
                        "next_round_index": "2" if round_index == 1 else "",
                        "next_state_id": next_state_id,
                        "done": "0" if round_index == 1 else "1",
                    }
                )

    policy_csv = tmp_path / "policy_training.csv"
    with policy_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    snapshot_json = tmp_path / "dataset_snapshot.json"
    snapshot_json.write_text(
        json.dumps({
            "snapshot_id": "fixture_snapshot",
            "split_manifest": {"method": "stable_hash_participant_id"},
            "analysis_outputs": {"policy_training_rows": len(rows)},
        }),
        encoding="utf-8",
    )
    return policy_csv, snapshot_json


def _participant_for_split(split: str) -> str:
    for index in range(10_000):
        candidate = f"participant_{split}_{index}"
        if participant_split(candidate) == split:
            return candidate
    raise AssertionError(f"unable to find participant for split {split}")
