from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .utils import read_csv_rows, read_json, to_float, to_int, truthy


REQUIRED_POLICY_TRAINING_COLUMNS = [
    "state_id",
    "round_index",
    "phase",
    "scenario_id",
    "state_dataset_snapshot_id",
    "state_legal_action_mask_version",
    "action_id",
    "action_bundle_ids",
    "action_legal",
    "action_score_ratio_to_best",
    "action_percent_regret",
    "action_is_optimal",
    "observed_chosen_action",
    "reward_target",
    "observed_reward",
    "next_state_id",
    "done",
]

PARTICIPANT_ID_COLUMNS = ["participant_id", "publication_participant_id"]


@dataclass(frozen=True)
class SchemaValidationResult:
    ok: bool
    errors: list[str]
    warnings: list[str]
    row_count: int
    state_count: int
    participant_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "errors": self.errors,
            "warnings": self.warnings,
            "row_count": self.row_count,
            "state_count": self.state_count,
            "participant_count": self.participant_count,
        }


def validate_policy_training_schema(
    policy_training_rows: list[dict[str, Any]],
    dataset_snapshot: dict[str, Any] | None = None,
) -> SchemaValidationResult:
    errors: list[str] = []
    warnings: list[str] = []
    if not policy_training_rows:
        return SchemaValidationResult(False, ["policy_training.csv has no rows"], [], 0, 0, 0)

    header = set(policy_training_rows[0].keys())
    if not any(column in header for column in PARTICIPANT_ID_COLUMNS):
        errors.append("policy_training.csv missing participant_id or publication_participant_id")
    for column in REQUIRED_POLICY_TRAINING_COLUMNS:
        if column not in header:
            errors.append(f"policy_training.csv missing required column: {column}")

    grouped: dict[str, list[dict[str, Any]]] = {}
    participants: set[str] = set()
    for index, row in enumerate(policy_training_rows, start=2):
        participant_id = str(row.get("participant_id") or row.get("publication_participant_id") or "").strip()
        state_id = str(row.get("state_id", "")).strip()
        action_id = str(row.get("action_id", "")).strip()
        participants.add(participant_id)
        grouped.setdefault(state_id, []).append(row)

        if not participant_id:
            errors.append(f"row {index} missing participant_id")
        if not state_id:
            errors.append(f"row {index} missing state_id")
        if not action_id:
            errors.append(f"row {index} missing action_id")
        if not str(row.get("state_legal_action_mask_version", "")).strip():
            errors.append(f"row {index} missing state_legal_action_mask_version")
        if to_float(row.get("reward_target")) is None:
            errors.append(f"row {index} missing numeric reward_target")
        if truthy(row.get("observed_chosen_action")) and to_float(row.get("observed_reward")) is None:
            errors.append(f"row {index} missing numeric observed_reward for chosen action")
        if to_float(row.get("action_score_ratio_to_best")) is None:
            errors.append(f"row {index} missing numeric action_score_ratio_to_best")
        if str(row.get("action_bundle_ids", "")).strip() == "":
            errors.append(f"row {index} missing action_bundle_ids")
        if truthy(row.get("observed_chosen_action")) and not truthy(row.get("action_legal")):
            errors.append(f"row {index} observed chosen action is not legal")
        if not truthy(row.get("done")) and not str(row.get("next_state_id", "")).strip():
            errors.append(f"row {index} missing next_state_id for non-terminal tuple")

    for state_id, rows in grouped.items():
        if not state_id:
            continue
        legal_count = sum(1 for row in rows if truthy(row.get("action_legal")))
        chosen_count = sum(1 for row in rows if truthy(row.get("observed_chosen_action")))
        if legal_count == 0:
            errors.append(f"state {state_id} has no legal actions")
        if chosen_count != 1:
            errors.append(f"state {state_id} expected exactly one observed action, got {chosen_count}")
        if len({str(row.get("state_legal_action_mask_version", "")).strip() for row in rows}) > 1:
            errors.append(f"state {state_id} has mixed legal-action-mask versions")
        if len({to_int(row.get("done")) for row in rows}) > 1:
            errors.append(f"state {state_id} has inconsistent done values")

    snapshot = dataset_snapshot or {}
    if snapshot:
        split_manifest = snapshot.get("split_manifest") or {}
        if split_manifest.get("method") != "stable_hash_participant_id":
            warnings.append("dataset_snapshot split_manifest is not stable_hash_participant_id")
        expected_rows = snapshot.get("analysis_outputs", {}).get("policy_training_rows")
        if expected_rows is not None and int(expected_rows) != len(policy_training_rows):
            warnings.append(f"dataset_snapshot policy_training_rows={expected_rows}, file rows={len(policy_training_rows)}")

    return SchemaValidationResult(
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        row_count=len(policy_training_rows),
        state_count=len([key for key in grouped if key]),
        participant_count=len([pid for pid in participants if pid]),
    )


def validate_files(policy_training_csv: str | Path, dataset_snapshot_json: str | Path | None = None) -> SchemaValidationResult:
    rows = read_csv_rows(policy_training_csv)
    snapshot = read_json(dataset_snapshot_json) if dataset_snapshot_json else {}
    return validate_policy_training_schema(rows, snapshot)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate BundleGame deep offline-RL input schema")
    parser.add_argument("--policy-training", required=True)
    parser.add_argument("--dataset-snapshot", default="")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    result = validate_files(args.policy_training, args.dataset_snapshot or None)
    print(result.to_dict())
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
