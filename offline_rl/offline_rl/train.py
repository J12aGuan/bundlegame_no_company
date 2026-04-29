from __future__ import annotations

import argparse
import random
from pathlib import Path
from typing import Any

from .algorithms import TrainedPolicy, train_policy
from .data import load_dataset, states_by_split
from .evaluate import evaluate_policy, write_evaluation_artifacts
from .utils import read_json, write_json


def run_training(
    config_path: str | Path,
    policy_training_csv: str | Path,
    dataset_snapshot_json: str | Path,
    out_dir: str | Path,
) -> dict[str, Any]:
    config = read_json(config_path)
    seed = int(config.get("seed", 42))
    random.seed(seed)

    states, metadata = load_dataset(str(policy_training_csv), str(dataset_snapshot_json))
    train_states = states_by_split(states)["train"]
    if not train_states:
        raise ValueError("No train states available after participant-level split")

    policy = train_policy(train_states, config)
    evaluation = evaluate_policy(policy, states)

    output_dir = Path(out_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "config.json", config)
    write_json(output_dir / "schema_validation.json", metadata["schema_validation"])
    write_json(output_dir / "checkpoint.json", _checkpoint_payload(policy))
    write_evaluation_artifacts(output_dir, policy, evaluation)

    summary = {
        "algorithm": policy.algorithm,
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "seed": policy.seed,
        "state_count": len(states),
        "train_state_count": len(train_states),
        "split_counts": {split: len(rows) for split, rows in states_by_split(states).items()},
        "schema_validation": metadata["schema_validation"],
        "policy_comparison": evaluation["policy_comparison_rows"],
        "ope_summary": evaluation["ope_summary_rows"],
        "artifacts": [
            "config.json",
            "schema_validation.json",
            "checkpoint.json",
            "policy_comparison.csv",
            "ope_summary.csv",
            "recommendation_map.json",
            "scenario_recommendation_map.json",
            "evaluation_summary.json",
        ],
    }
    write_json(output_dir / "evaluation_summary.json", summary)
    return summary


def _checkpoint_payload(policy: TrainedPolicy) -> dict[str, Any]:
    return {
        "schema_version": "bundlegame_offline_rl_checkpoint_v1",
        "algorithm": policy.algorithm,
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "seed": policy.seed,
        "config": policy.config,
        "q_values": policy.q_values,
        "values": policy.values,
        "provenance": {
            "training_mode": "masked_discrete_offline_rl_baseline",
            "simulator_only": False,
            "human_evidence_table": False,
        },
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train BundleGame masked discrete offline-RL baselines")
    parser.add_argument("--config", required=True, help="CQL/IQL JSON config")
    parser.add_argument("--policy-training", required=True, help="Frozen policy_training.csv")
    parser.add_argument("--dataset-snapshot", required=True, help="Frozen dataset_snapshot.json")
    parser.add_argument("--out-dir", required=True, help="Output artifact directory")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    summary = run_training(args.config, args.policy_training, args.dataset_snapshot, args.out_dir)
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
