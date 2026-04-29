from __future__ import annotations

import argparse
from pathlib import Path

from .utils import read_json, write_csv_rows, write_json


MODEL_REGISTRY_COLUMNS = [
    "model_id",
    "algorithm",
    "policy_name",
    "policy_version",
    "model_type",
    "implementation_status",
    "dataset_snapshot_id",
    "training_mode",
    "training_rows",
    "checkpoint_uri",
    "recommendation_map_uri",
    "ope_summary_uri",
    "simulator_only",
]


def export_registry_row(artifact_dir: str | Path, out_dir: str | Path) -> dict:
    artifact_path = Path(artifact_dir)
    output_path = Path(out_dir)
    checkpoint = read_json(artifact_path / "checkpoint.json")
    summary = read_json(artifact_path / "evaluation_summary.json")
    schema_validation = read_json(artifact_path / "schema_validation.json")
    policy_name = checkpoint.get("policy_name", "")
    policy_version = checkpoint.get("policy_version", "")
    algorithm = checkpoint.get("algorithm", "")
    dataset_snapshot_id = _dataset_snapshot_id(artifact_path)

    row = {
        "model_id": f"{algorithm}_{policy_version}_{dataset_snapshot_id or 'snapshot'}",
        "algorithm": algorithm.upper(),
        "policy_name": policy_name,
        "policy_version": policy_version,
        "model_type": "offline_rl",
        "implementation_status": "trained",
        "dataset_snapshot_id": dataset_snapshot_id,
        "training_mode": checkpoint.get("provenance", {}).get("training_mode", "masked_discrete_offline_rl_baseline"),
        "training_rows": schema_validation.get("row_count", summary.get("train_state_count", "")),
        "checkpoint_uri": str((artifact_path / "checkpoint.json").resolve()),
        "recommendation_map_uri": str((artifact_path / "scenario_recommendation_map.json").resolve()),
        "ope_summary_uri": str((artifact_path / "ope_summary.csv").resolve()),
        "simulator_only": "false",
    }
    output_path.mkdir(parents=True, exist_ok=True)
    write_csv_rows(output_path / "research_model_registry_row.csv", [row], MODEL_REGISTRY_COLUMNS)
    write_json(output_path / "research_model_registry_row.json", row)
    return row


def _dataset_snapshot_id(artifact_path: Path) -> str:
    summary = read_json(artifact_path / "evaluation_summary.json")
    for rows_key in ["policy_comparison", "ope_summary"]:
        for row in summary.get(rows_key, []):
            value = row.get("dataset_snapshot_id")
            if value:
                return str(value)
    scenario_map = read_json(artifact_path / "scenario_recommendation_map.json")
    for entry in scenario_map.values():
        value = entry.get("dataset_snapshot_id")
        if value:
            return str(value)
    return ""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Export model registry artifacts for BundleGame offline RL")
    parser.add_argument("--artifact-dir", required=True, help="Directory produced by offline_rl.train")
    parser.add_argument("--out-dir", required=True, help="Output directory for registry import rows")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    row = export_registry_row(args.artifact_dir, args.out_dir)
    print(row)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
