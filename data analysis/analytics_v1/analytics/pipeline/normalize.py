"""Normalization utilities for participant and scenario payloads."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
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


def _timestamp_to_iso(value: Any) -> str:
    stamp = _timestamp_to_float(value)
    if stamp <= 0:
        return ""
    return datetime.fromtimestamp(stamp, timezone.utc).isoformat().replace("+00:00", "Z")


def _normalize_id_array(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(entry).strip() for entry in value if str(entry).strip()]
    return []


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
            timestamp = _timestamp_to_iso(action.get("updatedAt")) or _timestamp_to_iso(action.get("createdAt"))

            decisions.append(
                {
                    "participant_id": participant_id,
                    "round_index": round_index,
                    "decision_source": "round_summary",
                    "source_scenario_set_version_id": str(action.get("scenarioSetVersionId", "") or "").strip(),
                    "decision_timestamp": timestamp or None,
                    "timestamp_available": int(bool(timestamp)),
                    "round_coverage_status": "timestamped_round_summary" if timestamp else "round_summary_missing_timestamp",
                    "chosen_orders": [str(x) for x in chosen_orders],
                    "success": bool(action.get("success", False)),
                    "duration": float(action.get("duration", 0) or 0),
                    "participant_earnings": float(action.get("earnings", 0) or 0),
                    "current_city": str(
                        action.get("current_city")
                        or action.get("starting_city")
                        or ((action.get("state_snapshot") or {}).get("current_city") if isinstance(action.get("state_snapshot"), dict) else "")
                        or ""
                    ),
                    "final_location": str(action.get("final_location", "") or ""),
                    "scenario_id": str(action.get("scenario_id", "") or ""),
                    "classification": str(action.get("classification", "") or ""),
                    "phase": action.get("phase", ""),
                    "shown_recommendation_bundle_ids": _normalize_id_array(
                        action.get("shown_recommendation_bundle_ids")
                        or action.get("recommended_bundle_ids")
                        or ((action.get("state_snapshot") or {}).get("shown_recommendation_bundle_ids") if isinstance(action.get("state_snapshot"), dict) else [])
                    ),
                    "recommendation_quality": str(
                        action.get("recommendation_quality")
                        or ((action.get("state_snapshot") or {}).get("recommendation_quality") if isinstance(action.get("state_snapshot"), dict) else "")
                        or ""
                    ),
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

    scenario_by_id = {
        str(scenario.get("scenario_id", "")): scenario
        for scenario in scenarios
        if isinstance(scenario, dict) and str(scenario.get("scenario_id", ""))
    }

    return {
        "scenario_by_round": scenario_by_round,
        "scenario_by_id": scenario_by_id,
        "order_by_id": order_by_id,
        "optimal_by_scenario": optimal_by_scenario,
    }


def get_action_summary_reconstructed_decisions(
    participants: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
    scenario_set_version_id: str,
    starting_location: str = "",
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    idx = build_indexes(scenario_bundle)
    scenario_by_id = idx["scenario_by_id"]
    order_by_id = idx["order_by_id"]
    decisions: list[dict[str, Any]] = []
    qa_issues: list[dict[str, Any]] = []

    for participant in participants:
        participant_id = str(participant.get("id", ""))
        summary_map = (
            (participant.get("summaryDoc") or participant.get("progressSummary") or {}).get("summaryByScenarioSetVersionId", {})
            if isinstance(participant, dict)
            else {}
        )
        progress_map = (
            (participant.get("scenarioSetProgressDoc") or {}).get("progressByScenarioSetVersionId", {})
            if isinstance(participant, dict)
            else {}
        )
        actions_map = (
            (participant.get("scenarioActionsDoc") or {}).get("actionsByScenarioSetVersionId", {})
            if isinstance(participant, dict)
            else {}
        )
        summary_entry = summary_map.get(scenario_set_version_id, {}) if scenario_set_version_id else {}
        progress_entry = progress_map.get(scenario_set_version_id, {}) if scenario_set_version_id else {}
        actions_entry = actions_map.get(scenario_set_version_id, {}) if scenario_set_version_id else {}
        actions_by_scenario = actions_entry.get("actionsByScenarioId", {}) if isinstance(actions_entry, dict) else {}
        completed = {
            str(entry).strip()
            for entry in (progress_entry.get("completedScenarios", []) if isinstance(progress_entry, dict) else [])
            if str(entry).strip()
        }
        rounds_completed = int(summary_entry.get("roundsCompleted", 0) or progress_entry.get("roundsCompleted", 0) or 0)
        current_city = str(starting_location or "")

        scenario_rows = []
        for scenario_id, entry in actions_by_scenario.items():
            scenario = scenario_by_id.get(str(scenario_id))
            round_index = int(scenario.get("round", 0) or 0) if isinstance(scenario, dict) else 0
            if not scenario or not round_index:
                continue
            order_summary = entry.get("orderSummary") if isinstance(entry, dict) else None
            if not isinstance(order_summary, list) or not order_summary:
                continue
            scenario_rows.append((round_index, str(scenario_id), scenario, entry))

        for round_index, scenario_id, scenario, entry in sorted(scenario_rows, key=lambda item: item[0]):
            chosen_orders = [str(order_id).strip() for order_id in entry.get("orderSummary", []) if str(order_id).strip()]
            confirmed_success = scenario_id in completed or rounds_completed >= round_index
            if not confirmed_success:
                qa_issues.append(
                    asdict(
                        QAIssue(
                            severity="warning",
                            issue_type="reconstructed_round_excluded_unconfirmed_success",
                            participant_id=participant_id,
                            round_index=round_index,
                            scenario_id=scenario_id,
                            message="Skipped action-summary reconstruction row because success could not be confirmed.",
                        )
                    )
                )
                continue

            time_summary = entry.get("timeSummary") if isinstance(entry, dict) else None
            duration = float(entry.get("totalTimeSeconds", 0) or 0) if isinstance(entry, dict) else 0.0
            if duration <= 0 and isinstance(time_summary, dict):
                duration = sum(float(time_summary.get(key, 0) or 0) for key in time_summary.keys())
            participant_earnings = sum(float((order_by_id.get(order_id) or {}).get("earnings", 0) or 0) for order_id in chosen_orders)
            final_location = str((order_by_id.get(chosen_orders[-1]) or {}).get("city", current_city) or current_city) if chosen_orders else current_city

            decisions.append(
                {
                    "participant_id": participant_id,
                    "round_index": round_index,
                    "decision_source": "action_summary_reconstructed",
                    "decision_timestamp": None,
                    "timestamp_available": 0,
                    "round_coverage_status": "reconstructed_action_summary",
                    "chosen_orders": chosen_orders,
                    "success": True,
                    "duration": duration,
                    "participant_earnings": participant_earnings,
                    "current_city": current_city,
                    "final_location": final_location,
                    "scenario_id": scenario_id,
                    "classification": str(scenario.get("classification", "") or ""),
                    "phase": str(scenario.get("phase", "") or ""),
                    "shown_recommendation_bundle_ids": [],
                    "recommendation_quality": "none",
                }
            )
            current_city = final_location

    decisions.sort(key=lambda row: (row["participant_id"], row["round_index"]))
    return decisions, qa_issues


def merge_decision_sources(
    round_summary_decisions: list[dict[str, Any]],
    reconstructed_decisions: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    merged: dict[tuple[str, int], dict[str, Any]] = {}
    qa_issues: list[dict[str, Any]] = []

    for decision in reconstructed_decisions:
        merged[(str(decision.get("participant_id", "")), int(decision.get("round_index", 0) or 0))] = decision

    for decision in round_summary_decisions:
        key = (str(decision.get("participant_id", "")), int(decision.get("round_index", 0) or 0))
        existing = merged.get(key)
        if existing:
            existing_bundle = sorted([str(entry) for entry in existing.get("chosen_orders", [])])
            next_bundle = sorted([str(entry) for entry in decision.get("chosen_orders", [])])
            if existing_bundle != next_bundle or bool(existing.get("success")) != bool(decision.get("success")):
                qa_issues.append(
                    asdict(
                        QAIssue(
                            severity="warning",
                            issue_type="decision_source_conflict",
                            participant_id=str(decision.get("participant_id", "")),
                            round_index=int(decision.get("round_index", 0) or 0),
                            scenario_id=str(decision.get("scenario_id", "") or existing.get("scenario_id", "")),
                            message="round_summary and reconstructed action summary disagreed; timestamped row kept.",
                        )
                    )
                )
        merged[key] = {
            **(existing or {}),
            **decision,
            "current_city": str(decision.get("current_city") or (existing or {}).get("current_city", "")),
            "final_location": str(decision.get("final_location") or (existing or {}).get("final_location", "")),
            "scenario_id": str(decision.get("scenario_id") or (existing or {}).get("scenario_id", "")),
            "classification": str(decision.get("classification") or (existing or {}).get("classification", "")),
            "phase": str(decision.get("phase") or (existing or {}).get("phase", "")),
            "shown_recommendation_bundle_ids": decision.get("shown_recommendation_bundle_ids")
            or (existing or {}).get("shown_recommendation_bundle_ids", []),
            "recommendation_quality": str(decision.get("recommendation_quality") or (existing or {}).get("recommendation_quality", "")),
        }

    decisions = sorted(merged.values(), key=lambda row: (str(row.get("participant_id", "")), int(row.get("round_index", 0) or 0)))
    return decisions, qa_issues
