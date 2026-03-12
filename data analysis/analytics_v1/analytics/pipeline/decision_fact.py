"""Build decision-level fact table and aggregates."""

from __future__ import annotations

import json
from dataclasses import asdict
from statistics import mean
from typing import Any

from analytics.config import NEAR_OPTIMAL_THRESHOLD
from analytics.model.scorer import score_bundle
from analytics.pipeline.normalize import build_indexes, get_latest_round_summaries
from analytics.qa.checks import check_multi_store_bundle
from analytics.types import QAIssue


def _safe_float(value: Any) -> float | None:
    try:
        f = float(value)
    except Exception:
        return None
    return f


def _normalize_classification(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"easy", "medium", "hard"}:
        return normalized
    return "unclassified"


def build_decision_fact(
    participants: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
    dataset_root: str,
    cities_dataset: dict[str, Any] | None = None,
    store_dataset: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cities_dataset = cities_dataset or {}
    store_dataset = store_dataset or {}

    decisions, qa_issues = get_latest_round_summaries(participants)
    idx = build_indexes(scenario_bundle)

    scenario_by_round = idx["scenario_by_round"]
    order_by_id = idx["order_by_id"]
    optimal_by_scenario = idx["optimal_by_scenario"]

    participant_city: dict[str, str] = {}
    starting_location = str(
        (cities_dataset or {}).get("startinglocation")
        or (scenario_bundle.get("metadata", {}) if isinstance(scenario_bundle, dict) else {}).get("startinglocation")
        or ""
    )

    fact_rows: list[dict[str, Any]] = []
    missing_classification_scenarios: set[str] = set()

    for decision in decisions:
        participant_id = decision["participant_id"]
        round_index = int(decision["round_index"])
        chosen_orders = list(decision["chosen_orders"])
        success = bool(decision["success"])

        current_city = participant_city.get(participant_id, starting_location)
        if not current_city and chosen_orders:
            fallback = order_by_id.get(chosen_orders[0], {})
            current_city = str(fallback.get("city", ""))

        scenario = scenario_by_round.get(round_index)
        if not scenario:
            qa_issues.append(
                asdict(
                    QAIssue(
                        severity="error",
                        issue_type="missing_scenario_for_round",
                        participant_id=participant_id,
                        round_index=round_index,
                        scenario_id="",
                        message="No scenario entry found for round.",
                    )
                )
            )
            continue

        scenario_id = str(scenario.get("scenario_id", ""))
        optimal = optimal_by_scenario.get(scenario_id)
        if not optimal:
            qa_issues.append(
                asdict(
                    QAIssue(
                        severity="error",
                        issue_type="missing_optimal_for_scenario",
                        participant_id=participant_id,
                        round_index=round_index,
                        scenario_id=scenario_id,
                        message="No optimal entry found for scenario_id.",
                    )
                )
            )
            continue

        classification = _normalize_classification(scenario.get("classification"))
        if classification == "unclassified" and scenario_id not in missing_classification_scenarios:
            missing_classification_scenarios.add(scenario_id)
            qa_issues.append(
                asdict(
                    QAIssue(
                        severity="warning",
                        issue_type="missing_classification",
                        participant_id="",
                        round_index=round_index,
                        scenario_id=scenario_id,
                        message='Scenario missing classification; assigned to "unclassified".',
                    )
                )
            )

        allowed_ids = {str(x) for x in scenario.get("order_ids", []) if str(x)}
        unknown = [order_id for order_id in chosen_orders if order_id not in allowed_ids]
        if unknown:
            qa_issues.append(
                asdict(
                    QAIssue(
                        severity="warning",
                        issue_type="unknown_chosen_order_ids",
                        participant_id=participant_id,
                        round_index=round_index,
                        scenario_id=scenario_id,
                        message=f"Chosen orders not in scenario order_ids: {unknown}",
                    )
                )
            )

        qa_issues.extend(
            check_multi_store_bundle(
                participant_id=participant_id,
                round_index=round_index,
                scenario_id=scenario_id,
                chosen_orders=chosen_orders,
                orders_by_id=order_by_id,
            )
        )

        participant_earnings = _safe_float(decision.get("participant_earnings"))
        if participant_earnings is None:
            participant_earnings = sum(
                float(order_by_id.get(order_id, {}).get("earnings", 0) or 0)
                for order_id in chosen_orders
            )

        participant_eval = score_bundle(
            bundle_ids=chosen_orders,
            orders_by_id=order_by_id,
            current_city=current_city,
            cities_dataset=cities_dataset,
            store_dataset=store_dataset,
            earnings_override=participant_earnings,
        )

        best_ids = [str(x) for x in optimal.get("best_bundle_ids", [])]
        second_ids = [str(x) for x in optimal.get("second_best_bundle_ids", [])]

        best_eval = score_bundle(
            bundle_ids=best_ids,
            orders_by_id=order_by_id,
            current_city=current_city,
            cities_dataset=cities_dataset,
            store_dataset=store_dataset,
            earnings_override=None,
        )
        second_eval = score_bundle(
            bundle_ids=second_ids,
            orders_by_id=order_by_id,
            current_city=current_city,
            cities_dataset=cities_dataset,
            store_dataset=store_dataset,
            earnings_override=None,
        )

        if participant_eval["score"] is None:
            qa_issues.append(
                asdict(
                    QAIssue(
                        severity="warning",
                        issue_type="non_computable_participant_score",
                        participant_id=participant_id,
                        round_index=round_index,
                        scenario_id=scenario_id,
                        message="Participant score not computable (missing orders or non-positive modeled time).",
                    )
                )
            )

        participant_score = participant_eval.get("score")
        best_score = best_eval.get("score")
        second_score = second_eval.get("score")

        score_ratio_to_best = None
        percent_regret = None
        efficiency_regret = None

        if participant_score is not None and best_score is not None and best_score > 0:
            score_ratio_to_best = participant_score / best_score
            percent_regret = 1 - score_ratio_to_best
            efficiency_regret = best_score - participant_score

        # Failed rounds are analyzed in the failure bucket and excluded from
        # exact/near quality labels and continuous quality metrics.
        is_exact_optimal = int(chosen_orders == best_ids)
        is_near_optimal = int(
            score_ratio_to_best is not None and score_ratio_to_best >= NEAR_OPTIMAL_THRESHOLD
        )
        if not success:
            participant_score = None
            score_ratio_to_best = None
            percent_regret = None
            efficiency_regret = None
            is_exact_optimal = 0
            is_near_optimal = 0

        row = {
            "dataset_root": dataset_root,
            "participant_id": participant_id,
            "round_index": round_index,
            "scenario_id": scenario_id,
            "classification": classification,
            "phase": decision.get("phase", "") or scenario.get("phase", ""),
            "current_city": current_city,
            "chosen_orders": json.dumps(chosen_orders),
            "best_bundle_ids": json.dumps(best_ids),
            "second_best_bundle_ids": json.dumps(second_ids),
            "bundle_size": len(chosen_orders),
            "success": int(success),
            "is_failure": int(not success),
            "duration": float(decision.get("duration", 0) or 0),
            "participant_earnings": participant_eval.get("earnings"),
            "participant_modeled_time": participant_eval.get("modeled_time"),
            "participant_score": participant_score,
            "best_score": best_score,
            "second_score": second_score,
            "score_ratio_to_best": score_ratio_to_best,
            "percent_regret": percent_regret,
            "efficiency_regret": efficiency_regret,
            "is_exact_optimal": is_exact_optimal,
            "is_near_optimal": is_near_optimal,
            "participant_missing_order_ids": json.dumps(participant_eval.get("missing_order_ids", [])),
            "best_missing_order_ids": json.dumps(best_eval.get("missing_order_ids", [])),
            "second_missing_order_ids": json.dumps(second_eval.get("missing_order_ids", [])),
        }
        fact_rows.append(row)

        final_location = str(decision.get("final_location", "") or "")
        if success and final_location:
            participant_city[participant_id] = final_location

    return fact_rows, qa_issues


def _collect_metric_values(rows: list[dict[str, Any]], key: str) -> list[float]:
    values = []
    for row in rows:
        value = row.get(key)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def build_simple_rollups(rows: list[dict[str, Any]]) -> dict[str, float]:
    if not rows:
        return {}

    return {
        "n_decisions": float(len(rows)),
        "exact_optimal_rate": mean([float(r.get("is_exact_optimal", 0)) for r in rows]),
        "near_optimal_rate": mean([float(r.get("is_near_optimal", 0)) for r in rows]),
        "failure_rate": mean([float(r.get("is_failure", 0)) for r in rows]),
    }
