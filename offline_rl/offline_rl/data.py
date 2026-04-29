from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .schema import validate_policy_training_schema
from .utils import parse_json_list, participant_split, read_csv_rows, read_json, to_float, to_int, truthy


@dataclass
class BundleAction:
    action_id: str
    bundle_ids: list[str]
    delivery_sequence_ids: list[str]
    legal: bool
    reward: float
    logged_reward: float | None
    score_ratio: float
    regret: float
    is_optimal: bool
    is_near_optimal: bool
    observed: bool
    features: dict[str, float]


@dataclass
class DecisionState:
    state_id: str
    participant_id: str
    split: str
    round_index: int
    phase: str
    scenario_id: str
    dataset_snapshot_id: str
    legal_action_mask_version: str
    next_state_id: str
    done: bool
    actions: list[BundleAction]

    @property
    def logged_action(self) -> BundleAction | None:
        return next((action for action in self.actions if action.observed), None)

    @property
    def legal_actions(self) -> list[BundleAction]:
        return [action for action in self.actions if action.legal]


STATE_FEATURE_COLUMNS = [
    "state_phase_progress_index",
    "state_prior_decisions_count",
    "state_prior_optimal_rate",
    "state_prior_failure_rate",
    "state_prior_recommendation_compliance",
    "state_prior_mean_bundle_size",
    "state_prior_mean_regret",
    "state_prior_mean_score_ratio",
    "state_prior_phase_score_ratio",
]

ACTION_FEATURE_COLUMNS = [
    "action_bundle_size",
    "action_score_ratio_to_best",
    "action_percent_regret",
    "action_score",
    "action_modeled_time",
    "action_travel_time",
    "action_pick_time",
    "action_earnings",
    "action_is_optimal",
    "action_is_near_optimal",
    "action_matches_shown_recommendation",
]


def load_dataset(policy_training_csv: str, dataset_snapshot_json: str | None = None) -> tuple[list[DecisionState], dict[str, Any]]:
    rows = read_csv_rows(policy_training_csv)
    snapshot = read_json(dataset_snapshot_json) if dataset_snapshot_json else {}
    validation = validate_policy_training_schema(rows, snapshot)
    if not validation.ok:
        raise ValueError(f"offline-RL schema validation failed: {validation.errors}")

    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(str(row.get("state_id", "")).strip(), []).append(row)

    states: list[DecisionState] = []
    for state_id, bucket in grouped.items():
        first = bucket[0]
        participant_id = str(first.get("participant_id") or first.get("publication_participant_id") or "").strip()
        actions = [_row_to_action(row) for row in bucket]
        actions.sort(key=lambda action: action.action_id)
        states.append(
            DecisionState(
                state_id=state_id,
                participant_id=participant_id,
                split=participant_split(participant_id),
                round_index=to_int(first.get("round_index"), 0),
                phase=str(first.get("phase", "")).strip(),
                scenario_id=str(first.get("scenario_id", "")).strip(),
                dataset_snapshot_id=str(first.get("state_dataset_snapshot_id", "")).strip(),
                legal_action_mask_version=str(first.get("state_legal_action_mask_version", "")).strip(),
                next_state_id=str(first.get("next_state_id", "")).strip(),
                done=truthy(first.get("done")),
                actions=actions,
            )
        )

    states.sort(key=lambda state: (state.participant_id, state.round_index, state.state_id))
    return states, {"schema_validation": validation.to_dict(), "dataset_snapshot": snapshot}


def states_by_split(states: list[DecisionState]) -> dict[str, list[DecisionState]]:
    return {
        split: [state for state in states if state.split == split]
        for split in ["train", "validation", "test"]
    }


def _row_to_action(row: dict[str, str]) -> BundleAction:
    bundle_ids = [str(value) for value in parse_json_list(row.get("action_bundle_ids"))]
    delivery_sequence_ids = [
        str(value) for value in parse_json_list(row.get("action_delivery_sequence_ids"))
    ] or bundle_ids
    reward = to_float(row.get("reward_target"))
    score_ratio = to_float(row.get("action_score_ratio_to_best"))
    regret = to_float(row.get("action_percent_regret"), 0.0) or 0.0
    features = {
        column: to_float(row.get(column), 0.0) or 0.0
        for column in [*STATE_FEATURE_COLUMNS, *ACTION_FEATURE_COLUMNS]
    }
    return BundleAction(
        action_id=str(row.get("action_id", "")).strip(),
        bundle_ids=bundle_ids,
        delivery_sequence_ids=delivery_sequence_ids,
        legal=truthy(row.get("action_legal")),
        reward=reward if reward is not None else 0.0,
        logged_reward=to_float(row.get("observed_reward")),
        score_ratio=score_ratio if score_ratio is not None else 0.0,
        regret=regret,
        is_optimal=truthy(row.get("action_is_optimal")),
        is_near_optimal=truthy(row.get("action_is_near_optimal")),
        observed=truthy(row.get("observed_chosen_action")),
        features=features,
    )
