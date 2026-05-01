from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import torch

from .schema import validate_policy_training_schema
from .utils import parse_json_list, participant_split, read_csv_rows, read_json, to_float, to_int, truthy


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

PROPENSITY_COLUMNS = [
    "logged_action_propensity",
    "behavior_policy_propensity",
    "observed_action_probability",
    "logging_propensity",
]


@dataclass(frozen=True)
class FeatureSpec:
    state_columns: list[str]
    action_columns: list[str]


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
    logged_propensity: float | None
    features: list[float]


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
    state_features: list[float]
    actions: list[BundleAction]

    @property
    def logged_action(self) -> BundleAction | None:
        return next((action for action in self.actions if action.observed), None)

    @property
    def legal_actions(self) -> list[BundleAction]:
        return [action for action in self.actions if action.legal]

    @property
    def logged_action_index(self) -> int:
        for index, action in enumerate(self.actions):
            if action.observed:
                return index
        return 0


def load_dataset(policy_training_csv: str, dataset_snapshot_json: str | None = None) -> tuple[list[DecisionState], dict[str, Any]]:
    rows = read_csv_rows(policy_training_csv)
    snapshot = read_json(dataset_snapshot_json) if dataset_snapshot_json else {}
    validation = validate_policy_training_schema(rows, snapshot)
    if not validation.ok:
        raise ValueError(f"deep offline-RL schema validation failed: {validation.errors}")

    grouped: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(str(row.get("state_id", "")).strip(), []).append(row)

    states: list[DecisionState] = []
    participant_splits: dict[str, str] = {}
    for state_id, bucket in grouped.items():
        first = bucket[0]
        participant_id = str(first.get("participant_id") or first.get("publication_participant_id") or "").strip()
        split = participant_split(participant_id)
        if participant_id in participant_splits and participant_splits[participant_id] != split:
            raise ValueError(f"participant {participant_id} appears in multiple splits")
        participant_splits[participant_id] = split

        actions = [_row_to_action(row) for row in bucket]
        actions.sort(key=lambda action: action.action_id)
        states.append(
            DecisionState(
                state_id=state_id,
                participant_id=participant_id,
                split=split,
                round_index=to_int(first.get("round_index"), 0),
                phase=str(first.get("phase", "")).strip(),
                scenario_id=str(first.get("scenario_id", "")).strip(),
                dataset_snapshot_id=str(first.get("state_dataset_snapshot_id", "")).strip(),
                legal_action_mask_version=str(first.get("state_legal_action_mask_version", "")).strip(),
                next_state_id=str(first.get("next_state_id", "")).strip(),
                done=truthy(first.get("done")),
                state_features=[to_float(first.get(column), 0.0) or 0.0 for column in STATE_FEATURE_COLUMNS],
                actions=actions,
            )
        )

    states.sort(key=lambda state: (state.participant_id, state.round_index, state.state_id))
    return states, {
        "schema_validation": validation.to_dict(),
        "dataset_snapshot": snapshot,
        "feature_spec": FeatureSpec(STATE_FEATURE_COLUMNS, ACTION_FEATURE_COLUMNS),
    }


def states_by_split(states: list[DecisionState]) -> dict[str, list[DecisionState]]:
    return {split: [state for state in states if state.split == split] for split in ["train", "validation", "test"]}


def participant_overlap_report(states: list[DecisionState]) -> dict[str, list[str]]:
    by_split = {
        split: {state.participant_id for state in rows}
        for split, rows in states_by_split(states).items()
    }
    overlaps: dict[str, list[str]] = {}
    for left in by_split:
        for right in by_split:
            if left >= right:
                continue
            shared = sorted(by_split[left] & by_split[right])
            if shared:
                overlaps[f"{left}_{right}"] = shared
    return overlaps


def make_batch(
    states: list[DecisionState],
    state_lookup: dict[str, DecisionState],
    device: torch.device,
) -> dict[str, Any]:
    batch_size = len(states)
    max_actions = max(max(1, len(state.actions)) for state in states)
    state_dim = len(STATE_FEATURE_COLUMNS)
    action_dim = len(ACTION_FEATURE_COLUMNS)

    state_features = torch.zeros((batch_size, state_dim), dtype=torch.float32, device=device)
    action_features = torch.zeros((batch_size, max_actions, action_dim), dtype=torch.float32, device=device)
    legal_mask = torch.zeros((batch_size, max_actions), dtype=torch.bool, device=device)
    observed_indices = torch.zeros((batch_size,), dtype=torch.long, device=device)
    rewards = torch.zeros((batch_size, max_actions), dtype=torch.float32, device=device)
    observed_rewards = torch.zeros((batch_size,), dtype=torch.float32, device=device)
    done = torch.zeros((batch_size,), dtype=torch.float32, device=device)
    next_state_features = torch.zeros((batch_size, state_dim), dtype=torch.float32, device=device)
    next_action_features = torch.zeros((batch_size, max_actions, action_dim), dtype=torch.float32, device=device)
    next_legal_mask = torch.zeros((batch_size, max_actions), dtype=torch.bool, device=device)

    for row_index, state in enumerate(states):
        state_features[row_index] = torch.tensor(state.state_features, dtype=torch.float32, device=device)
        observed_indices[row_index] = state.logged_action_index
        done[row_index] = 1.0 if state.done else 0.0
        logged = state.logged_action
        observed_rewards[row_index] = float(logged.logged_reward if logged and logged.logged_reward is not None else (logged.reward if logged else 0.0))
        for action_index, action in enumerate(state.actions):
            action_features[row_index, action_index] = torch.tensor(action.features, dtype=torch.float32, device=device)
            legal_mask[row_index, action_index] = action.legal
            rewards[row_index, action_index] = action.reward

        next_state = state_lookup.get(state.next_state_id)
        if next_state is not None:
            next_state_features[row_index] = torch.tensor(next_state.state_features, dtype=torch.float32, device=device)
            for action_index, action in enumerate(next_state.actions[:max_actions]):
                next_action_features[row_index, action_index] = torch.tensor(action.features, dtype=torch.float32, device=device)
                next_legal_mask[row_index, action_index] = action.legal

    return {
        "states": states,
        "state_features": state_features,
        "action_features": action_features,
        "legal_mask": legal_mask,
        "observed_indices": observed_indices,
        "rewards": rewards,
        "observed_rewards": observed_rewards,
        "done": done,
        "next_state_features": next_state_features,
        "next_action_features": next_action_features,
        "next_legal_mask": next_legal_mask,
    }


def _row_to_action(row: dict[str, str]) -> BundleAction:
    bundle_ids = [str(value) for value in parse_json_list(row.get("action_bundle_ids"))]
    delivery_sequence_ids = [str(value) for value in parse_json_list(row.get("action_delivery_sequence_ids"))] or bundle_ids
    reward = to_float(row.get("reward_target"), 0.0) or 0.0
    score_ratio = to_float(row.get("action_score_ratio_to_best"), 0.0) or 0.0
    regret = to_float(row.get("action_percent_regret"), 0.0) or 0.0
    propensity = next((to_float(row.get(column)) for column in PROPENSITY_COLUMNS if to_float(row.get(column)) is not None), None)
    return BundleAction(
        action_id=str(row.get("action_id", "")).strip(),
        bundle_ids=bundle_ids,
        delivery_sequence_ids=delivery_sequence_ids,
        legal=truthy(row.get("action_legal")),
        reward=reward,
        logged_reward=to_float(row.get("observed_reward")),
        score_ratio=score_ratio,
        regret=regret,
        is_optimal=truthy(row.get("action_is_optimal")),
        is_near_optimal=truthy(row.get("action_is_near_optimal")),
        observed=truthy(row.get("observed_chosen_action")),
        logged_propensity=propensity,
        features=[to_float(row.get(column), 0.0) or 0.0 for column in ACTION_FEATURE_COLUMNS],
    )
