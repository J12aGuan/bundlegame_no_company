from __future__ import annotations

from collections import Counter
from typing import Any

from .algorithms import TrainedPolicy
from .data import DecisionState
from .utils import mean, write_csv_rows, write_json


POLICY_COMPARISON_COLUMNS = [
    "policy_name",
    "policy_version",
    "algorithm",
    "split",
    "n_states",
    "mean_reward",
    "mean_regret",
    "optimal_rate",
    "near_optimal_rate",
    "match_logged_action_rate",
    "mean_bundle_size",
]

OPE_COLUMNS = [
    "policy_name",
    "policy_version",
    "algorithm",
    "split",
    "n_states",
    "ips",
    "snips",
    "direct_method",
    "doubly_robust",
    "fqe_one_step",
    "match_rate",
    "mean_logging_propensity",
]


def evaluate_policy(policy: TrainedPolicy, states: list[DecisionState]) -> dict[str, Any]:
    policy_rows = []
    ope_rows = []
    for split in ["train", "validation", "test"]:
        split_states = [state for state in states if state.split == split]
        policy_rows.append(_policy_summary(policy, split_states, split))
        ope_rows.append(_ope_summary(policy, split_states, split))

    return {
        "policy_comparison_rows": policy_rows,
        "ope_summary_rows": ope_rows,
        "recommendation_rows": build_recommendation_rows(policy, states),
        "scenario_recommendation_map": build_scenario_recommendation_map(policy, states),
    }


def write_evaluation_artifacts(out_dir, policy: TrainedPolicy, evaluation: dict[str, Any]) -> None:
    write_csv_rows(
        out_dir / "policy_comparison.csv",
        evaluation["policy_comparison_rows"],
        POLICY_COMPARISON_COLUMNS,
    )
    write_csv_rows(out_dir / "ope_summary.csv", evaluation["ope_summary_rows"], OPE_COLUMNS)
    write_json(out_dir / "recommendation_map.json", {"rows": evaluation["recommendation_rows"]})
    write_json(out_dir / "scenario_recommendation_map.json", evaluation["scenario_recommendation_map"])


def build_recommendation_rows(policy: TrainedPolicy, states: list[DecisionState]) -> list[dict[str, Any]]:
    rows = []
    for state in states:
        selected = policy.select_action(state)
        if selected is None:
            continue
        ranked = sorted(
            state.legal_actions,
            key=lambda action: (policy.score_action(state, action.action_id), action.score_ratio, action.action_id),
            reverse=True,
        )
        rows.append(
            {
                "state_id": state.state_id,
                "split": state.split,
                "round_index": state.round_index,
                "phase": state.phase,
                "scenario_id": state.scenario_id,
                "policy_name": policy.policy_name,
                "policy_version": policy.policy_version,
                "algorithm": policy.algorithm,
                "dataset_snapshot_id": state.dataset_snapshot_id,
                "legal_action_mask_version": state.legal_action_mask_version,
                "selected_action_id": selected.action_id,
                "shown_bundle_ids": selected.bundle_ids,
                "shown_ranked_bundles": [action.bundle_ids for action in ranked[:5]],
                "expected_reward": selected.reward,
                "score_ratio_to_best": selected.score_ratio,
                "percent_regret": selected.regret,
                "is_optimal": selected.is_optimal,
            }
        )
    return rows


def build_scenario_recommendation_map(policy: TrainedPolicy, states: list[DecisionState]) -> dict[str, Any]:
    by_scenario: dict[str, list[dict[str, Any]]] = {}
    for row in build_recommendation_rows(policy, states):
        by_scenario.setdefault(row["scenario_id"], []).append(row)

    recommendation_map = {}
    for scenario_id, rows in sorted(by_scenario.items()):
        bundle_counter = Counter(tuple(row["shown_bundle_ids"]) for row in rows)
        selected_bundle, count = bundle_counter.most_common(1)[0]
        best_row = max(
            [row for row in rows if tuple(row["shown_bundle_ids"]) == selected_bundle],
            key=lambda row: (row["expected_reward"], -row["percent_regret"]),
        )
        recommendation_map[scenario_id] = {
            "shown_bundle_ids": list(selected_bundle),
            "ranked_bundles": best_row["shown_ranked_bundles"],
            "policy_name": policy.policy_name,
            "policy_version": policy.policy_version,
            "algorithm": policy.algorithm,
            "supporting_states": count,
            "dataset_snapshot_id": best_row["dataset_snapshot_id"],
            "action_mask_version": best_row["legal_action_mask_version"],
        }
    return recommendation_map


def _policy_summary(policy: TrainedPolicy, states: list[DecisionState], split: str) -> dict[str, Any]:
    selected = [policy.select_action(state) for state in states]
    selected = [action for action in selected if action is not None]
    return {
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "algorithm": policy.algorithm,
        "split": split,
        "n_states": len(states),
        "mean_reward": mean([action.reward for action in selected]),
        "mean_regret": mean([action.regret for action in selected]),
        "optimal_rate": mean([1.0 if action.is_optimal else 0.0 for action in selected]),
        "near_optimal_rate": mean([1.0 if action.is_near_optimal else 0.0 for action in selected]),
        "match_logged_action_rate": mean([
            1.0 if state.logged_action and policy.select_action(state).action_id == state.logged_action.action_id else 0.0
            for state in states
            if policy.select_action(state) is not None
        ]),
        "mean_bundle_size": mean([float(len(action.bundle_ids)) for action in selected]),
    }


def _ope_summary(policy: TrainedPolicy, states: list[DecisionState], split: str) -> dict[str, Any]:
    direct_values = []
    fqe_values = []
    weighted_rewards = []
    weights = []
    dr_values = []
    matches = []
    propensities = []
    for state in states:
        selected = policy.select_action(state)
        logged = state.logged_action
        if selected is None or logged is None:
            continue
        legal_count = max(1, len(state.legal_actions))
        logging_propensity = 1.0 / legal_count
        match = selected.action_id == logged.action_id
        observed_reward = logged.logged_reward if logged.logged_reward is not None else logged.reward
        direct = selected.reward
        q_value = policy.score_action(state, selected.action_id)
        direct_values.append(direct)
        fqe_values.append(q_value)
        matches.append(1.0 if match else 0.0)
        propensities.append(logging_propensity)
        if match:
            weighted_rewards.append(observed_reward / logging_propensity)
            weights.append(1.0 / logging_propensity)
        else:
            weighted_rewards.append(0.0)
            weights.append(0.0)
        logged_direct = logged.reward
        dr_values.append(direct + ((observed_reward - logged_direct) / logging_propensity if match else 0.0))

    ips = mean(weighted_rewards)
    snips = sum(weighted_rewards) / sum(weights) if sum(weights) > 0 else None
    return {
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "algorithm": policy.algorithm,
        "split": split,
        "n_states": len(states),
        "ips": ips,
        "snips": snips,
        "direct_method": mean(direct_values),
        "doubly_robust": mean(dr_values),
        "fqe_one_step": mean(fqe_values),
        "match_rate": mean(matches),
        "mean_logging_propensity": mean(propensities),
    }
