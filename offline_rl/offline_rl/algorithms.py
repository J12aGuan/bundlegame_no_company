from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .data import DecisionState
from .utils import mean, softmax


@dataclass
class TrainedPolicy:
    algorithm: str
    policy_name: str
    policy_version: str
    seed: int
    q_values: dict[str, dict[str, float]]
    values: dict[str, float]
    config: dict[str, Any]

    def score_action(self, state: DecisionState, action_id: str) -> float:
        return self.q_values.get(state.state_id, {}).get(action_id, 0.0)

    def select_action(self, state: DecisionState):
        legal_actions = state.legal_actions
        if not legal_actions:
            return None
        return max(
            legal_actions,
            key=lambda action: (
                self.score_action(state, action.action_id),
                action.score_ratio,
                -len(action.bundle_ids),
                action.action_id,
            ),
        )


def train_policy(states: list[DecisionState], config: dict[str, Any]) -> TrainedPolicy:
    algorithm = str(config.get("algorithm", "cql")).lower()
    if algorithm == "cql":
        return train_cql(states, config)
    if algorithm == "iql":
        return train_iql(states, config)
    raise ValueError(f"Unsupported offline-RL algorithm: {algorithm}")


def train_cql(states: list[DecisionState], config: dict[str, Any]) -> TrainedPolicy:
    gamma = float(config.get("gamma", 0.0))
    alpha = float(config.get("cql_alpha", 0.15))
    learning_rate = float(config.get("learning_rate", 0.35))
    epochs = int(config.get("epochs", 25))
    temperature = float(config.get("temperature", 1.0))
    q_values = _initial_q(states)

    for _ in range(max(1, epochs)):
        previous = _copy_q(q_values)
        for state in states:
            next_value = _next_state_value(previous, state.next_state_id, state.done)
            legal_scores = [previous.get(state.state_id, {}).get(action.action_id, 0.0) for action in state.legal_actions]
            policy_probs = softmax(legal_scores, temperature)
            for index, action in enumerate(state.legal_actions):
                logged_bonus = 1.0 if action.observed else 0.0
                conservative_penalty = alpha * (policy_probs[index] - logged_bonus)
                target = action.reward + gamma * next_value - conservative_penalty
                old = previous[state.state_id][action.action_id]
                q_values[state.state_id][action.action_id] = old + learning_rate * (target - old)

    return TrainedPolicy(
        algorithm="cql",
        policy_name=str(config.get("policy_name", "cql_masked_discrete")),
        policy_version=str(config.get("policy_version", "v1")),
        seed=int(config.get("seed", 42)),
        q_values=q_values,
        values={state.state_id: max(q_values.get(state.state_id, {}).values() or [0.0]) for state in states},
        config=config,
    )


def train_iql(states: list[DecisionState], config: dict[str, Any]) -> TrainedPolicy:
    gamma = float(config.get("gamma", 0.0))
    expectile = max(0.01, min(0.99, float(config.get("expectile", 0.7))))
    learning_rate = float(config.get("learning_rate", 0.35))
    epochs = int(config.get("epochs", 25))
    q_values = _initial_q(states)
    values = {state.state_id: _expectile([action.reward for action in state.legal_actions], expectile) for state in states}

    for _ in range(max(1, epochs)):
        previous_q = _copy_q(q_values)
        previous_v = dict(values)
        for state in states:
            current_scores = list(previous_q.get(state.state_id, {}).values())
            values[state.state_id] = _expectile(current_scores, expectile)
            next_value = 0.0 if state.done else previous_v.get(state.next_state_id, 0.0)
            for action in state.legal_actions:
                target = action.reward + gamma * next_value
                old = previous_q[state.state_id][action.action_id]
                advantage = target - previous_v.get(state.state_id, 0.0)
                weight = expectile if advantage >= 0 else 1.0 - expectile
                q_values[state.state_id][action.action_id] = old + learning_rate * weight * (target - old)

    return TrainedPolicy(
        algorithm="iql",
        policy_name=str(config.get("policy_name", "iql_masked_discrete")),
        policy_version=str(config.get("policy_version", "v1")),
        seed=int(config.get("seed", 42)),
        q_values=q_values,
        values=values,
        config=config,
    )


def _initial_q(states: list[DecisionState]) -> dict[str, dict[str, float]]:
    return {
        state.state_id: {action.action_id: action.reward for action in state.legal_actions}
        for state in states
    }


def _copy_q(q_values: dict[str, dict[str, float]]) -> dict[str, dict[str, float]]:
    return {state_id: dict(action_values) for state_id, action_values in q_values.items()}


def _next_state_value(q_values: dict[str, dict[str, float]], next_state_id: str, done: bool) -> float:
    if done or not next_state_id:
        return 0.0
    return max(q_values.get(next_state_id, {}).values() or [0.0])


def _expectile(values: list[float], expectile: float) -> float:
    if not values:
        return 0.0
    estimate = mean(values) or 0.0
    for _ in range(25):
        above = [value for value in values if value >= estimate]
        below = [value for value in values if value < estimate]
        numerator = expectile * sum(above) + (1.0 - expectile) * sum(below)
        denominator = expectile * len(above) + (1.0 - expectile) * len(below)
        if denominator <= 0:
            break
        next_estimate = numerator / denominator
        if abs(next_estimate - estimate) < 1e-9:
            return next_estimate
        estimate = next_estimate
    return estimate
