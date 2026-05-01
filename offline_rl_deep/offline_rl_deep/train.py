from __future__ import annotations

import argparse
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import torch
import torch.nn.functional as F

from .data import ACTION_FEATURE_COLUMNS, STATE_FEATURE_COLUMNS, DecisionState, load_dataset, make_batch, participant_overlap_report, states_by_split
from .models import BehaviorPolicyNet, QNetwork, ValueNetwork, masked_logits
from .utils import append_jsonl, mean, read_json, seed_everything, write_csv_rows, write_json


POLICY_COMPARISON_COLUMNS = [
    "policy_name",
    "policy_version",
    "algorithm",
    "seed",
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
    "seed",
    "split",
    "n_states",
    "ips",
    "snips",
    "direct_method",
    "doubly_robust",
    "fqe_one_step",
    "match_rate",
    "mean_logging_propensity",
    "propensity_source",
    "effective_sample_size",
]

SEED_SUMMARY_COLUMNS = [
    "seed",
    "algorithm",
    "policy_name",
    "policy_version",
    "best_epoch",
    "validation_mean_reward",
    "validation_mean_regret",
    "test_mean_reward",
    "test_mean_regret",
    "artifact_dir",
]


@dataclass
class DeepPolicy:
    algorithm: str
    policy_name: str
    policy_version: str
    seed: int
    config: dict[str, Any]
    q_net: QNetwork
    behavior_net: BehaviorPolicyNet
    value_net: ValueNetwork | None
    device: torch.device
    best_epoch: int
    training_log: list[dict[str, Any]]


def run_training(
    config_path: str | Path,
    policy_training_csv: str | Path,
    dataset_snapshot_json: str | Path,
    out_dir: str | Path,
) -> dict[str, Any]:
    config = read_json(config_path)
    states, metadata = load_dataset(str(policy_training_csv), str(dataset_snapshot_json))
    overlaps = participant_overlap_report(states)
    if overlaps:
        raise ValueError(f"participant split overlap detected: {overlaps}")
    if not states_by_split(states)["train"]:
        raise ValueError("No train states available after participant-level split")

    output_dir = Path(out_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    seeds = _resolve_seeds(config)
    seed_results = []
    for seed in seeds:
        seed_dir = output_dir / "seeds" / f"seed_{seed}"
        seed_config = {**config, "seed": seed, "seeds": seeds}
        result = _train_one_seed(seed_config, states, metadata, seed_dir)
        seed_results.append(result)

    best = max(
        seed_results,
        key=lambda result: (
            _split_metric(result["evaluation"]["policy_comparison_rows"], "validation", "mean_reward"),
            -(_split_metric(result["evaluation"]["policy_comparison_rows"], "validation", "mean_regret") or 0.0),
            -result["seed"],
        ),
    )
    _write_artifacts(output_dir, best, states, metadata)
    _write_multi_seed_artifacts(output_dir, seed_results, best)
    return _summary_payload(best, states, metadata, seed_results)


def _train_one_seed(
    config: dict[str, Any],
    states: list[DecisionState],
    metadata: dict[str, Any],
    out_dir: Path,
) -> dict[str, Any]:
    seed = int(config.get("seed", 42))
    seed_everything(seed)
    device = torch.device(str(config.get("device", "cpu")))
    state_dim = len(STATE_FEATURE_COLUMNS)
    action_dim = len(ACTION_FEATURE_COLUMNS)
    hidden_dim = int(config.get("hidden_dim", 64))
    algorithm = str(config.get("algorithm", "cql")).lower()

    q_net = QNetwork(state_dim, action_dim, hidden_dim).to(device)
    target_q_net = QNetwork(state_dim, action_dim, hidden_dim).to(device)
    target_q_net.load_state_dict(q_net.state_dict())
    behavior_net = BehaviorPolicyNet(state_dim, action_dim, hidden_dim).to(device)
    value_net = ValueNetwork(state_dim, hidden_dim).to(device) if algorithm == "iql" else None

    state_lookup = {state.state_id: state for state in states}
    train_states = states_by_split(states)["train"]
    validation_states = states_by_split(states)["validation"] or train_states
    log: list[dict[str, Any]] = []

    _train_behavior_policy(behavior_net, train_states, state_lookup, config, device, log, stage="behavior_pretrain")
    if algorithm == "cql":
        best_epoch = _train_cql(q_net, target_q_net, train_states, validation_states, state_lookup, config, device, log)
    elif algorithm == "iql":
        if value_net is None:
            raise ValueError("IQL requires a value network")
        best_epoch = _train_iql(q_net, target_q_net, value_net, behavior_net, train_states, validation_states, state_lookup, config, device, log)
    else:
        raise ValueError(f"Unsupported deep offline-RL algorithm: {algorithm}")

    policy = DeepPolicy(
        algorithm=algorithm,
        policy_name=str(config.get("policy_name", f"deep_{algorithm}_masked")),
        policy_version=str(config.get("policy_version", "v1")),
        seed=seed,
        config=config,
        q_net=q_net,
        behavior_net=behavior_net,
        value_net=value_net,
        device=device,
        best_epoch=best_epoch,
        training_log=log,
    )
    evaluation = evaluate_policy(policy, states)
    result = {"seed": seed, "policy": policy, "evaluation": evaluation, "metadata": metadata, "out_dir": str(out_dir)}
    _write_artifacts(out_dir, result, states, metadata)
    return result


def _train_behavior_policy(
    behavior_net: BehaviorPolicyNet,
    train_states: list[DecisionState],
    state_lookup: dict[str, DecisionState],
    config: dict[str, Any],
    device: torch.device,
    log: list[dict[str, Any]],
    stage: str,
) -> None:
    optimizer = torch.optim.Adam(behavior_net.parameters(), lr=float(config.get("learning_rate", 1e-3)))
    for epoch in range(max(1, int(config.get("bc_epochs", 10)))):
        losses = []
        for batch_states in _iter_batches(train_states, int(config.get("batch_size", 32))):
            batch = make_batch(batch_states, state_lookup, device)
            logits = masked_logits(behavior_net(batch["state_features"], batch["action_features"]), batch["legal_mask"])
            loss = F.cross_entropy(logits, batch["observed_indices"])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach().cpu()))
        log.append({"stage": stage, "epoch": epoch + 1, "loss": mean(losses)})


def _train_cql(
    q_net: QNetwork,
    target_q_net: QNetwork,
    train_states: list[DecisionState],
    validation_states: list[DecisionState],
    state_lookup: dict[str, DecisionState],
    config: dict[str, Any],
    device: torch.device,
    log: list[dict[str, Any]],
) -> int:
    optimizer = torch.optim.Adam(q_net.parameters(), lr=float(config.get("learning_rate", 1e-3)))
    gamma = float(config.get("gamma", 0.0))
    alpha = float(config.get("cql_alpha", 0.2))
    tau = float(config.get("target_tau", 0.05))
    best_score = -math.inf
    best_state = None
    best_epoch = 0
    stale = 0
    for epoch in range(max(1, int(config.get("epochs", 50)))):
        losses = []
        for batch_states in _iter_batches(train_states, int(config.get("batch_size", 32))):
            batch = make_batch(batch_states, state_lookup, device)
            q_values = q_net(batch["state_features"], batch["action_features"])
            observed_q = q_values.gather(1, batch["observed_indices"].unsqueeze(1)).squeeze(1)
            with torch.no_grad():
                next_q = target_q_net(batch["next_state_features"], batch["next_action_features"])
                masked_next_q = masked_logits(next_q, batch["next_legal_mask"])
                next_max = torch.where(batch["next_legal_mask"].any(dim=1), masked_next_q.max(dim=1).values, torch.zeros_like(batch["done"]))
                target = batch["observed_rewards"] + gamma * next_max * (1.0 - batch["done"])
            bellman_loss = F.mse_loss(observed_q, target)
            conservative = torch.logsumexp(masked_logits(q_values, batch["legal_mask"]), dim=1).mean() - observed_q.mean()
            loss = bellman_loss + alpha * conservative
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            _soft_update(target_q_net, q_net, tau)
            losses.append(float(loss.detach().cpu()))
        validation = _policy_summary(_policy_from(q_net, None, config), validation_states, "validation", device)
        score = float(validation.get("mean_reward") or 0.0)
        log.append({"stage": "cql", "epoch": epoch + 1, "loss": mean(losses), "validation_mean_reward": score})
        if score > best_score:
            best_score = score
            best_state = {key: value.detach().cpu().clone() for key, value in q_net.state_dict().items()}
            best_epoch = epoch + 1
            stale = 0
        else:
            stale += 1
        if stale >= int(config.get("patience", 10)):
            break
    if best_state is not None:
        q_net.load_state_dict(best_state)
    return best_epoch


def _train_iql(
    q_net: QNetwork,
    target_q_net: QNetwork,
    value_net: ValueNetwork,
    behavior_net: BehaviorPolicyNet,
    train_states: list[DecisionState],
    validation_states: list[DecisionState],
    state_lookup: dict[str, DecisionState],
    config: dict[str, Any],
    device: torch.device,
    log: list[dict[str, Any]],
) -> int:
    optimizer = torch.optim.Adam(
        list(q_net.parameters()) + list(value_net.parameters()) + list(behavior_net.parameters()),
        lr=float(config.get("learning_rate", 1e-3)),
    )
    gamma = float(config.get("gamma", 0.0))
    expectile = min(0.99, max(0.01, float(config.get("expectile", 0.7))))
    awr_temperature = max(1e-6, float(config.get("awr_temperature", 1.0)))
    tau = float(config.get("target_tau", 0.05))
    best_score = -math.inf
    best_q_state = None
    best_v_state = None
    best_b_state = None
    best_epoch = 0
    stale = 0
    for epoch in range(max(1, int(config.get("epochs", 50)))):
        losses = []
        for batch_states in _iter_batches(train_states, int(config.get("batch_size", 32))):
            batch = make_batch(batch_states, state_lookup, device)
            q_values = q_net(batch["state_features"], batch["action_features"])
            observed_q = q_values.gather(1, batch["observed_indices"].unsqueeze(1)).squeeze(1)
            values = value_net(batch["state_features"])
            with torch.no_grad():
                next_values = value_net(batch["next_state_features"])
                target = batch["observed_rewards"] + gamma * next_values * (1.0 - batch["done"])
                advantage = observed_q.detach() - values.detach()
                awr_weights = torch.exp(torch.clamp(advantage / awr_temperature, max=20.0))
            q_loss = F.mse_loss(observed_q, target)
            value_loss = _expectile_loss(observed_q.detach() - values, expectile).mean()
            behavior_logits = masked_logits(behavior_net(batch["state_features"], batch["action_features"]), batch["legal_mask"])
            policy_loss = (F.cross_entropy(behavior_logits, batch["observed_indices"], reduction="none") * awr_weights).mean()
            loss = q_loss + value_loss + 0.2 * policy_loss
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            _soft_update(target_q_net, q_net, tau)
            losses.append(float(loss.detach().cpu()))
        validation = _policy_summary(_policy_from(q_net, value_net, config), validation_states, "validation", device)
        score = float(validation.get("mean_reward") or 0.0)
        log.append({"stage": "iql", "epoch": epoch + 1, "loss": mean(losses), "validation_mean_reward": score})
        if score > best_score:
            best_score = score
            best_q_state = {key: value.detach().cpu().clone() for key, value in q_net.state_dict().items()}
            best_v_state = {key: value.detach().cpu().clone() for key, value in value_net.state_dict().items()}
            best_b_state = {key: value.detach().cpu().clone() for key, value in behavior_net.state_dict().items()}
            best_epoch = epoch + 1
            stale = 0
        else:
            stale += 1
        if stale >= int(config.get("patience", 10)):
            break
    if best_q_state is not None:
        q_net.load_state_dict(best_q_state)
    if best_v_state is not None:
        value_net.load_state_dict(best_v_state)
    if best_b_state is not None:
        behavior_net.load_state_dict(best_b_state)
    return best_epoch


def evaluate_policy(policy: DeepPolicy, states: list[DecisionState]) -> dict[str, Any]:
    policy_rows = []
    ope_rows = []
    for split in ["train", "validation", "test"]:
        split_states = [state for state in states if state.split == split]
        policy_rows.append(_policy_summary(policy, split_states, split, policy.device))
        ope_rows.append(_ope_summary(policy, split_states, split, policy.device))
    return {
        "policy_comparison_rows": policy_rows,
        "ope_summary_rows": ope_rows,
        "recommendation_rows": _recommendation_rows(policy, states),
        "scenario_recommendation_map": _scenario_recommendation_map(policy, states),
    }


def _policy_summary(policy: DeepPolicy, states: list[DecisionState], split: str, device: torch.device) -> dict[str, Any]:
    selected_pairs = [(state, _select_action(policy, state, device)) for state in states]
    selected_pairs = [(state, action) for state, action in selected_pairs if action is not None]
    return {
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "algorithm": policy.algorithm,
        "seed": policy.seed,
        "split": split,
        "n_states": len(states),
        "mean_reward": mean([action.reward for _, action in selected_pairs]),
        "mean_regret": mean([action.regret for _, action in selected_pairs]),
        "optimal_rate": mean([1.0 if action.is_optimal else 0.0 for _, action in selected_pairs]),
        "near_optimal_rate": mean([1.0 if action.is_near_optimal else 0.0 for _, action in selected_pairs]),
        "match_logged_action_rate": mean([
            1.0 if state.logged_action and action.action_id == state.logged_action.action_id else 0.0
            for state, action in selected_pairs
        ]),
        "mean_bundle_size": mean([float(len(action.bundle_ids)) for _, action in selected_pairs]),
    }


def _ope_summary(policy: DeepPolicy, states: list[DecisionState], split: str, device: torch.device) -> dict[str, Any]:
    weighted_rewards = []
    weights = []
    direct_values = []
    dr_values = []
    fqe_values = []
    matches = []
    propensities = []
    sources = []
    for state in states:
        selected = _select_action(policy, state, device)
        logged = state.logged_action
        if selected is None or logged is None:
            continue
        propensity, source = _logged_propensity(policy, state, device)
        propensity = max(1e-6, float(propensity))
        match = selected.action_id == logged.action_id
        observed_reward = logged.logged_reward if logged.logged_reward is not None else logged.reward
        direct = selected.reward
        q_value = _score_action(policy, state, selected.action_id, device)
        direct_values.append(direct)
        fqe_values.append(q_value)
        matches.append(1.0 if match else 0.0)
        propensities.append(propensity)
        sources.append(source)
        if match:
            weighted_rewards.append(observed_reward / propensity)
            weights.append(1.0 / propensity)
        else:
            weighted_rewards.append(0.0)
            weights.append(0.0)
        dr_values.append(direct + ((observed_reward - logged.reward) / propensity if match else 0.0))
    weight_sum = sum(weights)
    weight_sq_sum = sum(weight * weight for weight in weights)
    source = "none"
    if sources and all(item == "logged_propensity" for item in sources):
        source = "logged_propensity"
    elif sources and all(item == "estimated_behavior_model" for item in sources):
        source = "estimated_behavior_model"
    elif sources:
        source = "mixed_logged_and_estimated"
    return {
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "algorithm": policy.algorithm,
        "seed": policy.seed,
        "split": split,
        "n_states": len(states),
        "ips": mean(weighted_rewards),
        "snips": sum(weighted_rewards) / weight_sum if weight_sum > 0 else None,
        "direct_method": mean(direct_values),
        "doubly_robust": mean(dr_values),
        "fqe_one_step": mean(fqe_values),
        "match_rate": mean(matches),
        "mean_logging_propensity": mean(propensities),
        "propensity_source": source,
        "effective_sample_size": (weight_sum * weight_sum / weight_sq_sum) if weight_sq_sum > 0 else None,
    }


def _recommendation_rows(policy: DeepPolicy, states: list[DecisionState]) -> list[dict[str, Any]]:
    rows = []
    for state in states:
        selected = _select_action(policy, state, policy.device)
        if selected is None:
            continue
        ranked = _rank_actions(policy, state, policy.device)[:5]
        rows.append({
            "state_id": state.state_id,
            "split": state.split,
            "round_index": state.round_index,
            "phase": state.phase,
            "scenario_id": state.scenario_id,
            "policy_name": policy.policy_name,
            "policy_version": policy.policy_version,
            "algorithm": policy.algorithm,
            "seed": policy.seed,
            "dataset_snapshot_id": state.dataset_snapshot_id,
            "legal_action_mask_version": state.legal_action_mask_version,
            "selected_action_id": selected.action_id,
            "shown_bundle_ids": selected.bundle_ids,
            "shown_ranked_bundles": [action.bundle_ids for action in ranked],
            "expected_reward": selected.reward,
            "score_ratio_to_best": selected.score_ratio,
            "percent_regret": selected.regret,
            "is_optimal": selected.is_optimal,
            "action_legal": selected.legal,
        })
    return rows


def _scenario_recommendation_map(policy: DeepPolicy, states: list[DecisionState]) -> dict[str, Any]:
    by_scenario: dict[str, list[dict[str, Any]]] = {}
    for row in _recommendation_rows(policy, states):
        by_scenario.setdefault(row["scenario_id"], []).append(row)
    output = {}
    for scenario_id, rows in sorted(by_scenario.items()):
        best = max(rows, key=lambda row: (row["expected_reward"], -row["percent_regret"], row["selected_action_id"]))
        output[scenario_id] = {
            "shown_bundle_ids": best["shown_bundle_ids"],
            "ranked_bundles": best["shown_ranked_bundles"],
            "policy_name": policy.policy_name,
            "policy_version": policy.policy_version,
            "algorithm": policy.algorithm,
            "seed": policy.seed,
            "supporting_states": len(rows),
            "dataset_snapshot_id": best["dataset_snapshot_id"],
            "action_mask_version": best["legal_action_mask_version"],
        }
    return output


def _write_artifacts(out_dir: Path, result: dict[str, Any], states: list[DecisionState], metadata: dict[str, Any]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    policy: DeepPolicy = result["policy"]
    evaluation = result["evaluation"]
    config = policy.config
    write_json(out_dir / "config.json", config)
    write_json(out_dir / "schema_validation.json", metadata["schema_validation"])
    for event in policy.training_log:
        append_jsonl(out_dir / "training_log.jsonl", {"seed": policy.seed, **event})
    torch.save(_checkpoint_payload(policy, metadata), out_dir / "checkpoint.pt")
    write_csv_rows(out_dir / "policy_comparison.csv", evaluation["policy_comparison_rows"], POLICY_COMPARISON_COLUMNS)
    write_csv_rows(out_dir / "ope_summary.csv", evaluation["ope_summary_rows"], OPE_COLUMNS)
    write_json(out_dir / "recommendation_map.json", {"rows": evaluation["recommendation_rows"]})
    write_json(out_dir / "scenario_recommendation_map.json", evaluation["scenario_recommendation_map"])
    write_json(out_dir / "evaluation_summary.json", _summary_payload(result, states, metadata, [result]))


def _write_multi_seed_artifacts(out_dir: Path, seed_results: list[dict[str, Any]], best: dict[str, Any]) -> None:
    seed_rows = [_seed_summary_row(result) for result in seed_results]
    write_csv_rows(out_dir / "seed_summary.csv", seed_rows, SEED_SUMMARY_COLUMNS)
    write_json(out_dir / "multi_seed_summary.json", {
        "best_seed": best["seed"],
        "seed_count": len(seed_results),
        "seeds": seed_rows,
    })


def _checkpoint_payload(policy: DeepPolicy, metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": "bundlegame_deep_offline_rl_checkpoint_v1",
        "algorithm": policy.algorithm,
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "seed": policy.seed,
        "config": policy.config,
        "feature_schema": {
            "state_columns": STATE_FEATURE_COLUMNS,
            "action_columns": ACTION_FEATURE_COLUMNS,
        },
        "q_network_state_dict": policy.q_net.state_dict(),
        "behavior_network_state_dict": policy.behavior_net.state_dict(),
        "value_network_state_dict": policy.value_net.state_dict() if policy.value_net is not None else None,
        "schema_validation": metadata["schema_validation"],
        "provenance": {
            "training_mode": "deep_masked_discrete_offline_rl_baseline",
            "simulator_only": False,
            "human_evidence_table": False,
            "propensity_policy": "logged if present, otherwise estimated_behavior_model",
        },
    }


def _summary_payload(
    result: dict[str, Any],
    states: list[DecisionState],
    metadata: dict[str, Any],
    seed_results: list[dict[str, Any]],
) -> dict[str, Any]:
    policy: DeepPolicy = result["policy"]
    evaluation = result["evaluation"]
    return {
        "algorithm": policy.algorithm,
        "policy_name": policy.policy_name,
        "policy_version": policy.policy_version,
        "seed": policy.seed,
        "best_seed": result["seed"],
        "seed_count": len(seed_results),
        "state_count": len(states),
        "split_counts": {split: len(rows) for split, rows in states_by_split(states).items()},
        "best_epoch": policy.best_epoch,
        "schema_validation": metadata["schema_validation"],
        "policy_comparison": evaluation["policy_comparison_rows"],
        "ope_summary": evaluation["ope_summary_rows"],
        "artifacts": [
            "checkpoint.pt",
            "config.json",
            "training_log.jsonl",
            "schema_validation.json",
            "evaluation_summary.json",
            "policy_comparison.csv",
            "ope_summary.csv",
            "recommendation_map.json",
            "scenario_recommendation_map.json",
            "seed_summary.csv",
            "multi_seed_summary.json",
        ],
    }


def _seed_summary_row(result: dict[str, Any]) -> dict[str, Any]:
    rows = result["evaluation"]["policy_comparison_rows"]
    return {
        "seed": result["seed"],
        "algorithm": result["policy"].algorithm,
        "policy_name": result["policy"].policy_name,
        "policy_version": result["policy"].policy_version,
        "best_epoch": result["policy"].best_epoch,
        "validation_mean_reward": _split_metric(rows, "validation", "mean_reward"),
        "validation_mean_regret": _split_metric(rows, "validation", "mean_regret"),
        "test_mean_reward": _split_metric(rows, "test", "mean_reward"),
        "test_mean_regret": _split_metric(rows, "test", "mean_regret"),
        "artifact_dir": result["out_dir"],
    }


def _select_action(policy: DeepPolicy, state: DecisionState, device: torch.device):
    ranked = _rank_actions(policy, state, device)
    return ranked[0] if ranked else None


def _rank_actions(policy: DeepPolicy, state: DecisionState, device: torch.device):
    batch = make_batch([state], {state.state_id: state}, device)
    with torch.no_grad():
        scores = policy.q_net(batch["state_features"], batch["action_features"])[0]
        legal_mask = batch["legal_mask"][0]
    legal = [(action, float(scores[index].detach().cpu())) for index, action in enumerate(state.actions) if bool(legal_mask[index])]
    return [action for action, _score in sorted(legal, key=lambda pair: (pair[1], pair[0].score_ratio, pair[0].action_id), reverse=True)]


def _score_action(policy: DeepPolicy, state: DecisionState, action_id: str, device: torch.device) -> float:
    batch = make_batch([state], {state.state_id: state}, device)
    with torch.no_grad():
        scores = policy.q_net(batch["state_features"], batch["action_features"])[0]
    for index, action in enumerate(state.actions):
        if action.action_id == action_id:
            return float(scores[index].detach().cpu())
    return 0.0


def _logged_propensity(policy: DeepPolicy, state: DecisionState, device: torch.device) -> tuple[float, str]:
    logged = state.logged_action
    if logged and logged.logged_propensity is not None and logged.logged_propensity > 0:
        return logged.logged_propensity, "logged_propensity"
    batch = make_batch([state], {state.state_id: state}, device)
    with torch.no_grad():
        logits = masked_logits(policy.behavior_net(batch["state_features"], batch["action_features"]), batch["legal_mask"])
        probs = torch.softmax(logits, dim=1)[0]
    index = state.logged_action_index
    return float(probs[index].detach().cpu()), "estimated_behavior_model"


def _policy_from(q_net: QNetwork, value_net: ValueNetwork | None, config: dict[str, Any]) -> DeepPolicy:
    return DeepPolicy(
        algorithm=str(config.get("algorithm", "cql")).lower(),
        policy_name=str(config.get("policy_name", "deep_policy")),
        policy_version=str(config.get("policy_version", "v1")),
        seed=int(config.get("seed", 42)),
        config=config,
        q_net=q_net,
        behavior_net=BehaviorPolicyNet(len(STATE_FEATURE_COLUMNS), len(ACTION_FEATURE_COLUMNS), int(config.get("hidden_dim", 64))),
        value_net=value_net,
        device=torch.device(str(config.get("device", "cpu"))),
        best_epoch=0,
        training_log=[],
    )


def _iter_batches(states: list[DecisionState], batch_size: int):
    shuffled = list(states)
    random.shuffle(shuffled)
    for start in range(0, len(shuffled), max(1, batch_size)):
        yield shuffled[start:start + max(1, batch_size)]


def _soft_update(target: torch.nn.Module, source: torch.nn.Module, tau: float) -> None:
    with torch.no_grad():
        for target_param, source_param in zip(target.parameters(), source.parameters()):
            target_param.data.mul_(1.0 - tau).add_(source_param.data, alpha=tau)


def _expectile_loss(diff: torch.Tensor, expectile: float) -> torch.Tensor:
    weight = torch.where(diff >= 0, expectile, 1.0 - expectile)
    return weight * diff.pow(2)


def _split_metric(rows: list[dict[str, Any]], split: str, metric: str) -> float | None:
    for row in rows:
        if row.get("split") == split:
            value = row.get(metric)
            return float(value) if value is not None else None
    return None


def _resolve_seeds(config: dict[str, Any]) -> list[int]:
    raw = config.get("seeds")
    if isinstance(raw, list) and raw:
        return [int(seed) for seed in raw]
    return [int(config.get("seed", 42))]


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train BundleGame deep masked offline-RL baselines")
    parser.add_argument("--config", required=True)
    parser.add_argument("--policy-training", required=True)
    parser.add_argument("--dataset-snapshot", required=True)
    parser.add_argument("--out-dir", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    summary = run_training(args.config, args.policy_training, args.dataset_snapshot, args.out_dir)
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
