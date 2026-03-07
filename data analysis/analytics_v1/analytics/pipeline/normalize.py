"""Normalization utilities for participant and scenario payloads."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from typing import Any

from analytics.types import QAIssue


def _timestamp_to_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0
    if isinstance(value, dict):
        seconds = value.get("seconds")
        nanoseconds = value.get("nanoseconds", 0)
        if isinstance(seconds, (int, float)):
            return float(seconds) + float(nanoseconds or 0) / 1_000_000_000.0
    return 0.0


def get_latest_round_summaries(
    participants: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Return normalized decision rows and duplicate-summary QA issues.
    """
    decisions: list[dict[str, Any]] = []
    qa_issues: list[dict[str, Any]] = []

    for participant in participants:
        participant_id = str(participant.get("id", ""))
        actions = participant.get("actions", [])
        if not isinstance(actions, list):
            actions = []

        summaries = []
        for action in actions:
            if not isinstance(action, dict):
                continue
            if action.get("type") != "round_summary":
                continue
            round_index = action.get("round_index")
            try:
                round_index = int(round_index)
            except Exception:
                continue

            stamp = _timestamp_to_float(action.get("updatedAt"))
            if stamp <= 0:
                stamp = _timestamp_to_float(action.get("createdAt"))

            summaries.append(
                {
                    "participant_id": participant_id,
                    "round_index": round_index,
                    "action": action,
                    "stamp": stamp,
                }
            )

        grouped: dict[int, list[dict[str, Any]]] = {}
        for row in summaries:
            grouped.setdefault(row["round_index"], []).append(row)

        for round_index, rows in grouped.items():
            rows_sorted = sorted(rows, key=lambda r: r["stamp"])
            winner = rows_sorted[-1]
            action = winner["action"]

            if len(rows) > 1:
                issue = QAIssue(
                    severity="warning",
                    issue_type="duplicate_round_summary",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id="",
                    message=f"Found {len(rows)} round_summary actions; latest kept.",
                )
                qa_issues.append(asdict(issue))

            chosen_orders = action.get("chosen_orders", [])
            if not isinstance(chosen_orders, list):
                chosen_orders = []

            decisions.append(
                {
                    "participant_id": participant_id,
                    "round_index": round_index,
                    "chosen_orders": [str(x) for x in chosen_orders],
                    "success": bool(action.get("success", False)),
                    "duration": float(action.get("duration", 0) or 0),
                    "participant_earnings": float(action.get("earnings", 0) or 0),
                    "final_location": str(action.get("final_location", "") or ""),
                    "phase": action.get("phase", ""),
                }
            )

    decisions.sort(key=lambda r: (r["participant_id"], r["round_index"]))
    return decisions, qa_issues


def build_indexes(scenario_bundle: dict[str, Any]) -> dict[str, Any]:
    scenarios = scenario_bundle.get("scenarios", []) if isinstance(scenario_bundle, dict) else []
    orders = scenario_bundle.get("orders", []) if isinstance(scenario_bundle, dict) else []
    optimal = scenario_bundle.get("optimal", []) if isinstance(scenario_bundle, dict) else []

    scenario_by_round: dict[int, dict[str, Any]] = {}
    for scenario in scenarios:
        if not isinstance(scenario, dict):
            continue
        try:
            round_index = int(scenario.get("round", 0))
        except Exception:
            continue
        scenario_by_round[round_index] = scenario

    order_by_id = {
        str(order.get("id", "")): order
        for order in orders
        if isinstance(order, dict) and str(order.get("id", ""))
    }

    optimal_by_scenario = {
        str(entry.get("scenario_id", "")): entry
        for entry in optimal
        if isinstance(entry, dict) and str(entry.get("scenario_id", ""))
    }

    return {
        "scenario_by_round": scenario_by_round,
        "order_by_id": order_by_id,
        "optimal_by_scenario": optimal_by_scenario,
    }
