"""Build decision-level fact table and aggregates."""

from __future__ import annotations

import json
from dataclasses import asdict
from itertools import combinations
from typing import Any

from analytics.config import NEAR_OPTIMAL_THRESHOLD
from analytics.model.scorer import score_bundle
from analytics.pipeline.normalize import (
    build_indexes,
    get_action_summary_reconstructed_decisions,
    get_latest_round_summaries,
    merge_decision_sources,
)
from analytics.qa.checks import check_multi_store_bundle
from analytics.types import QAIssue


TIME_SUMMARY_KEYS = [
    "thinkingTime",
    "startPickingConfirmationTime",
    "aisleTravelTime",
    "itemAddToCartTime",
    "localDeliveryTime",
    "cityTravelTime",
    "penaltyTime",
    "idleOrOtherTime",
]

DECISION_FACT_EXPORT_COLUMNS = [
    "dataset_root",
    "participant_id",
    "decision_source",
    "decision_timestamp",
    "timestamp_available",
    "round_coverage_status",
    "round_index",
    "scenario_id",
    "classification",
    "phase",
    "current_city",
    "chosen_orders",
    "best_bundle_ids",
    "second_best_bundle_ids",
    "bundle_size",
    "success",
    "is_failure",
    "duration",
    "participant_earnings",
    "participant_modeled_time",
    "participant_score",
    "best_score",
    "score_ratio_to_best",
    "percent_regret",
    "is_exact_optimal",
    "is_near_optimal",
    "scenario_set_version_id",
    "summary_total_rounds",
    "summary_rounds_completed",
    "summary_optimal_choices",
    "summary_total_game_time",
    "summary_completed_game",
    "progress_completed_scenarios_count",
    "progress_current_round",
    "progress_current_location",
    "progress_in_progress_scenario",
    "scenario_total_time_seconds",
    "thinking_time",
    "start_picking_confirmation_time",
    "aisle_travel_time",
    "item_add_to_cart_time",
    "local_delivery_time",
    "city_travel_time",
    "penalty_time",
    "idle_or_other_time",
    "delivery_runtime_time",
    "non_delivery_runtime_time",
    "runtime_modeled_delta",
    "qa_completed_game_mismatch",
    "qa_missing_recommendation_labels",
]


def get_decision_fact_export_columns(cohort_col: str | None = None) -> list[str]:
    columns = list(DECISION_FACT_EXPORT_COLUMNS)
    normalized = str(cohort_col or "").strip()
    if normalized and normalized not in columns:
        columns.append(normalized)
    return columns


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


def _make_issue(
    *,
    severity: str = "warning",
    issue_type: str,
    participant_id: str = "",
    round_index: int | None = None,
    scenario_id: str = "",
    message: str,
) -> dict[str, Any]:
    return asdict(
        QAIssue(
            severity=severity,
            issue_type=issue_type,
            participant_id=participant_id,
            round_index=round_index,
            scenario_id=scenario_id,
            message=message,
        )
    )


def _normalize_scenario_id_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return sorted({str(entry or "").strip() for entry in value if str(entry or "").strip()})


def _normalize_id_array(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(entry).strip() for entry in value if str(entry).strip()]


def _normalize_time_summary(summary: Any) -> dict[str, float] | None:
    if not isinstance(summary, dict):
        return None
    return {key: max(0.0, float(summary.get(key, 0) or 0)) for key in TIME_SUMMARY_KEYS}


def _sum_time_summary(summary: dict[str, float] | None) -> float | None:
    if not isinstance(summary, dict):
        return None
    return float(sum(summary.values()))


def _get_version_entry(doc: Any, map_key: str, version_id: str) -> dict[str, Any] | None:
    if not isinstance(doc, dict) or not version_id:
        return None
    version_map = doc.get(map_key)
    if not isinstance(version_map, dict):
        return None
    entry = version_map.get(version_id)
    return entry if isinstance(entry, dict) else None


def _get_participant_version_state(participant: dict[str, Any], scenario_set_version_id: str) -> dict[str, Any]:
    return {
        "summary_entry": _get_version_entry(
            participant.get("summaryDoc") or participant.get("progressSummary"),
            "summaryByScenarioSetVersionId",
            scenario_set_version_id,
        ),
        "progress_entry": _get_version_entry(
            participant.get("scenarioSetProgressDoc"),
            "progressByScenarioSetVersionId",
            scenario_set_version_id,
        ),
        "actions_entry": _get_version_entry(
            participant.get("scenarioActionsDoc"),
            "actionsByScenarioSetVersionId",
            scenario_set_version_id,
        ),
    }


def _bundle_signature(bundle_ids: Any) -> str:
    return "|".join(sorted(_normalize_id_array(bundle_ids)))


def _generate_bundle_combinations(order_ids: list[str], max_bundle: int) -> list[list[str]]:
    output: list[list[str]] = []
    for size in range(1, min(len(order_ids), max(1, int(max_bundle or len(order_ids) or 1))) + 1):
        output.extend([list(bundle) for bundle in combinations(order_ids, size)])
    return output


def _is_multi_store_bundle(bundle_ids: list[str], order_by_id: dict[str, Any]) -> bool:
    stores = {
        str((order_by_id.get(bundle_id) or {}).get("store", ""))
        for bundle_id in bundle_ids
        if str((order_by_id.get(bundle_id) or {}).get("store", ""))
    }
    return len(stores) > 1


def _evaluate_dynamic_candidates(
    scenario: dict[str, Any],
    optimal: dict[str, Any],
    order_by_id: dict[str, Any],
    current_city: str,
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
) -> list[dict[str, Any]]:
    scenario_order_ids = _normalize_id_array(scenario.get("order_ids"))
    max_bundle = min(
        len(scenario_order_ids),
        max(1, int(scenario.get("max_bundle", 0) or len(scenario_order_ids) or 1)),
    )
    stored_best_signature = _bundle_signature(optimal.get("best_bundle_ids"))
    raw_candidates: list[dict[str, Any]] = []

    for bundle_ids in _generate_bundle_combinations(scenario_order_ids, max_bundle):
        if _is_multi_store_bundle(bundle_ids, order_by_id):
            continue
        evaluation = score_bundle(
            bundle_ids=bundle_ids,
            orders_by_id=order_by_id,
            current_city=current_city,
            cities_dataset=cities_dataset,
            store_dataset=store_dataset,
        )
        signature = _bundle_signature(bundle_ids)
        raw_candidates.append(
            {
                "bundleIds": bundle_ids,
                "bundleSignature": signature,
                "bundleSize": len(bundle_ids),
                "earnings": evaluation.get("earnings"),
                "modeledTime": evaluation.get("modeled_time"),
                "score": evaluation.get("score"),
                "isStoredOptimal": int(signature == stored_best_signature),
            }
        )

    raw_candidates.sort(
        key=lambda row: (
            float("-inf") if row.get("score") is None else float(row.get("score")),
            -int(row.get("bundleSize") or 0),
        ),
        reverse=True,
    )

    best_candidate = raw_candidates[0] if raw_candidates else None
    second_best_candidate = raw_candidates[1] if len(raw_candidates) > 1 else None
    best_signature = _bundle_signature(best_candidate.get("bundleIds")) if best_candidate else ""
    best_score = best_candidate.get("score") if best_candidate else None

    candidates: list[dict[str, Any]] = []
    for row in raw_candidates:
        score_ratio = (
            row.get("score") / best_score
            if row.get("score") is not None and best_score not in (None, 0)
            else None
        )
        candidates.append(
            {
                **row,
                "scoreRatioToBest": score_ratio,
                "percentRegret": (1 - score_ratio) if score_ratio is not None else None,
                "isOptimal": int(row.get("bundleSignature") == best_signature),
                "isNearOptimal": int(score_ratio is not None and score_ratio >= NEAR_OPTIMAL_THRESHOLD),
                "dynamicBestBundleIds": best_candidate.get("bundleIds", []) if best_candidate else [],
                "dynamicSecondBestBundleIds": second_best_candidate.get("bundleIds", []) if second_best_candidate else [],
            }
        )
    return candidates


def build_decision_fact(
    participants: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
    dataset_root: str,
    cities_dataset: dict[str, Any] | None = None,
    store_dataset: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    cities_dataset = cities_dataset or {}
    store_dataset = store_dataset or {}

    round_summary_decisions, qa_issues = get_latest_round_summaries(participants)
    idx = build_indexes(scenario_bundle)

    scenario_by_round = idx["scenario_by_round"]
    scenario_by_id = idx.get("scenario_by_id", {})
    order_by_id = idx["order_by_id"]
    optimal_by_scenario = idx["optimal_by_scenario"]

    participant_city: dict[str, str] = {}
    participant_map = {
        str(participant.get("id", "")): participant
        for participant in participants
        if isinstance(participant, dict) and str(participant.get("id", ""))
    }
    starting_location = str(
        (cities_dataset or {}).get("startinglocation")
        or (scenario_bundle.get("metadata", {}) if isinstance(scenario_bundle, dict) else {}).get("startinglocation")
        or ""
    )
    scenario_set_version_id = str(
        (scenario_bundle.get("metadata", {}) if isinstance(scenario_bundle, dict) else {}).get("scenarioSetVersionId")
        or ""
    ).strip()
    legacy_mode = not scenario_set_version_id
    compatible_round_summary_decisions = []
    for decision in round_summary_decisions:
        source_version = str(decision.get("source_scenario_set_version_id", "") or "").strip()
        if legacy_mode or not source_version or source_version == scenario_set_version_id:
            compatible_round_summary_decisions.append(decision)
            continue
        qa_issues.append(
            _make_issue(
                issue_type="round_summary_dataset_mismatch",
                participant_id=str(decision.get("participant_id", "")),
                round_index=int(decision.get("round_index", 0) or 0),
                scenario_id=str(decision.get("scenario_id", "") or ""),
                message=(
                    f'Skipped round_summary tagged with scenarioSetVersionId "{source_version}" '
                    f'while analyzing "{scenario_set_version_id}".'
                ),
            )
        )
    dataset_has_recommendation_labels = any(
        bool(_normalize_id_array((scenario or {}).get("recommended_bundle_ids")))
        or bool(_normalize_id_array((scenario or {}).get("recommendedOrderIds")))
        or bool(_normalize_id_array((scenario or {}).get("recommended_order_ids")))
        for scenario in scenario_by_round.values()
    )

    participant_states = {
        participant_id: _get_participant_version_state(participant, scenario_set_version_id)
        for participant_id, participant in participant_map.items()
    }

    reconstructed_decisions, reconstructed_issues = get_action_summary_reconstructed_decisions(
        participants,
        scenario_bundle,
        scenario_set_version_id,
        starting_location,
    )
    qa_issues.extend(reconstructed_issues)
    decisions, merge_issues = merge_decision_sources(compatible_round_summary_decisions, reconstructed_decisions)
    qa_issues.extend(merge_issues)

    fact_rows: list[dict[str, Any]] = []
    missing_classification_scenarios: set[str] = set()
    issue_keys: set[str] = set()

    if legacy_mode:
        qa_issues.append(
            _make_issue(
                issue_type="missing_dataset_scenario_set_version_id",
                message="Selected dataset metadata has no scenarioSetVersionId; timing/progress enrichment is disabled.",
            )
        )
    if not dataset_has_recommendation_labels:
        qa_issues.append(
            _make_issue(
                issue_type="dataset_missing_recommendation_labels",
                message="Dataset scenarios do not include recommendation-treatment labels; treat this dataset as benchmark-only.",
            )
        )

    def push_issue_once(key: str, issue: dict[str, Any]) -> None:
        if key in issue_keys:
            return
        issue_keys.add(key)
        qa_issues.append(issue)

    for decision in decisions:
        participant_id = decision["participant_id"]
        round_index = int(decision["round_index"])
        chosen_orders = list(decision["chosen_orders"])
        success = bool(decision["success"])
        participant = participant_map.get(participant_id, {})
        version_state = participant_states.get(
            participant_id,
            {"summary_entry": None, "progress_entry": None, "actions_entry": None},
        )

        if not legacy_mode:
            if not version_state["summary_entry"]:
                push_issue_once(
                    f"missing_summary:{participant_id}",
                    _make_issue(
                        issue_type="missing_version_matched_summary_entry",
                        participant_id=participant_id,
                        message=f'No summary entry matched scenarioSetVersionId "{scenario_set_version_id}".',
                    ),
                )
            if not version_state["progress_entry"]:
                push_issue_once(
                    f"missing_progress:{participant_id}",
                    _make_issue(
                        issue_type="missing_version_matched_progress_entry",
                        participant_id=participant_id,
                        message=f'No progress entry matched scenarioSetVersionId "{scenario_set_version_id}".',
                    ),
                )
            if not version_state["actions_entry"]:
                push_issue_once(
                    f"missing_actions:{participant_id}",
                    _make_issue(
                        issue_type="missing_version_matched_action_summary_entry",
                        participant_id=participant_id,
                        message=f'No action summary entry matched scenarioSetVersionId "{scenario_set_version_id}".',
                    ),
                )

        current_city = str(decision.get("current_city") or participant_city.get(participant_id, starting_location) or "")
        if not current_city and chosen_orders:
            fallback = order_by_id.get(chosen_orders[0], {})
            current_city = str(fallback.get("city", ""))

        scenario = scenario_by_id.get(str(decision.get("scenario_id", ""))) or scenario_by_round.get(round_index)
        if not scenario:
            qa_issues.append(
                _make_issue(
                    severity="error",
                    issue_type="missing_scenario_for_round",
                    participant_id=participant_id,
                    round_index=round_index,
                    message="No scenario entry found for round.",
                )
            )
            continue

        scenario_id = str(decision.get("scenario_id") or scenario.get("scenario_id", ""))
        optimal = optimal_by_scenario.get(scenario_id)
        if not optimal:
            qa_issues.append(
                _make_issue(
                    severity="error",
                    issue_type="missing_optimal_for_scenario",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message="No optimal entry found for scenario_id.",
                )
            )
            continue

        classification = _normalize_classification(scenario.get("classification"))
        if classification == "unclassified" and scenario_id not in missing_classification_scenarios:
            missing_classification_scenarios.add(scenario_id)
            qa_issues.append(
                _make_issue(
                    issue_type="missing_classification",
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message='Scenario missing classification; assigned to "unclassified".',
                )
            )

        allowed_ids = {str(x) for x in scenario.get("order_ids", []) if str(x)}
        unknown = [order_id for order_id in chosen_orders if order_id not in allowed_ids]
        if unknown:
            qa_issues.append(
                _make_issue(
                    issue_type="unknown_chosen_order_ids",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message=f"Chosen orders not in scenario order_ids: {unknown}",
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

        canonical_participant_earnings = sum(
            float(order_by_id.get(order_id, {}).get("earnings", 0) or 0)
            for order_id in chosen_orders
        )
        logged_participant_earnings = _safe_float(decision.get("participant_earnings"))
        participant_earnings = canonical_participant_earnings
        if (
            logged_participant_earnings is not None
            and abs(logged_participant_earnings - canonical_participant_earnings) > 0.01
        ):
            qa_issues.append(
                _make_issue(
                    issue_type="round_summary_earnings_mismatch",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message="Logged round_summary earnings differed from canonical order earnings; analytics used canonical order earnings for scoring.",
                )
            )

        candidates = _evaluate_dynamic_candidates(
            scenario,
            optimal,
            order_by_id,
            current_city,
            cities_dataset,
            store_dataset,
        )
        dynamic_best_candidate = candidates[0] if candidates else None
        dynamic_second_best_candidate = candidates[1] if len(candidates) > 1 else None
        stored_best_signature = _bundle_signature(optimal.get("best_bundle_ids"))
        dynamic_best_signature = _bundle_signature(dynamic_best_candidate.get("bundleIds")) if dynamic_best_candidate else ""
        if dynamic_best_candidate and stored_best_signature and dynamic_best_signature and stored_best_signature != dynamic_best_signature:
            qa_issues.append(
                _make_issue(
                    issue_type="stored_optimal_mismatch",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message="Stored optimal bundle does not match the dynamically recomputed oracle under the current scoring model.",
                )
            )

        participant_eval = score_bundle(
            bundle_ids=chosen_orders,
            orders_by_id=order_by_id,
            current_city=current_city,
            cities_dataset=cities_dataset,
            store_dataset=store_dataset,
            earnings_override=participant_earnings,
        )
        reported_participant_earnings = (
            canonical_participant_earnings
            if success
            else (logged_participant_earnings if logged_participant_earnings is not None else 0.0)
        )

        best_ids = [str(x) for x in (dynamic_best_candidate.get("bundleIds", []) if dynamic_best_candidate else [])]
        second_ids = [str(x) for x in (dynamic_second_best_candidate.get("bundleIds", []) if dynamic_second_best_candidate else [])]

        if participant_eval["score"] is None:
            qa_issues.append(
                _make_issue(
                    issue_type="non_computable_participant_score",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message="Participant score not computable (missing orders or non-positive modeled time).",
                )
            )

        participant_score = participant_eval.get("score")
        best_score = dynamic_best_candidate.get("score") if dynamic_best_candidate else None

        score_ratio_to_best = None
        percent_regret = None

        if participant_score is not None and best_score is not None and best_score > 0:
            score_ratio_to_best = participant_score / best_score
            percent_regret = 1 - score_ratio_to_best

        is_exact_optimal = int(chosen_orders == best_ids)
        is_near_optimal = int(
            score_ratio_to_best is not None and score_ratio_to_best >= NEAR_OPTIMAL_THRESHOLD
        )
        participant_modeled_time = participant_eval.get("modeled_time")
        if not success:
            participant_score = None
            score_ratio_to_best = None
            percent_regret = None
            is_exact_optimal = 0
            is_near_optimal = 0
            participant_modeled_time = None

        summary_entry = version_state["summary_entry"]
        progress_entry = version_state["progress_entry"]
        qa_completed_game_mismatch = int(
            isinstance(summary_entry, dict)
            and bool(summary_entry.get("completedGame"))
            and _safe_float(summary_entry.get("totalRounds")) not in (None, 0)
            and _safe_float(summary_entry.get("roundsCompleted")) is not None
            and float(summary_entry.get("roundsCompleted") or 0) < float(summary_entry.get("totalRounds") or 0)
        )
        if qa_completed_game_mismatch:
            push_issue_once(
                f"completed_mismatch:{participant_id}",
                _make_issue(
                    issue_type="qa_completed_game_mismatch",
                    participant_id=participant_id,
                    message="Summary marked completedGame=true even though roundsCompleted is below totalRounds.",
                ),
            )
        actions_entry = version_state["actions_entry"]
        actions_by_scenario = actions_entry.get("actionsByScenarioId", {}) if isinstance(actions_entry, dict) else {}
        raw_timing_entry = actions_by_scenario.get(scenario_id) if isinstance(actions_by_scenario, dict) else None
        if not legacy_mode and actions_entry and not isinstance(raw_timing_entry, dict):
            qa_issues.append(
                _make_issue(
                    issue_type="missing_per_scenario_timing_entry",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message=(
                        f'No action timing entry matched scenario "{scenario_id}" '
                        f'for scenarioSetVersionId "{scenario_set_version_id}".'
                    ),
                )
            )

        normalized_time_summary = _normalize_time_summary(
            raw_timing_entry.get("timeSummary") if isinstance(raw_timing_entry, dict) else None
        )
        explicit_total = _safe_float(raw_timing_entry.get("totalTimeSeconds")) if isinstance(raw_timing_entry, dict) else None
        computed_total = _sum_time_summary(normalized_time_summary)
        scenario_total_time_seconds = explicit_total if explicit_total is not None else computed_total
        if (
            explicit_total is not None
            and computed_total is not None
            and abs(explicit_total - computed_total) > 0.25
        ):
            qa_issues.append(
                _make_issue(
                    issue_type="timing_total_mismatch",
                    participant_id=participant_id,
                    round_index=round_index,
                    scenario_id=scenario_id,
                    message=(
                        f"Stored totalTimeSeconds ({explicit_total}) differs from timeSummary sum ({computed_total})."
                    ),
                )
            )

        thinking_time = normalized_time_summary.get("thinkingTime") if normalized_time_summary else None
        start_picking_confirmation_time = (
            normalized_time_summary.get("startPickingConfirmationTime") if normalized_time_summary else None
        )
        aisle_travel_time = normalized_time_summary.get("aisleTravelTime") if normalized_time_summary else None
        item_add_to_cart_time = normalized_time_summary.get("itemAddToCartTime") if normalized_time_summary else None
        local_delivery_time = normalized_time_summary.get("localDeliveryTime") if normalized_time_summary else None
        city_travel_time = normalized_time_summary.get("cityTravelTime") if normalized_time_summary else None
        penalty_time = normalized_time_summary.get("penaltyTime") if normalized_time_summary else None
        idle_or_other_time = normalized_time_summary.get("idleOrOtherTime") if normalized_time_summary else None
        delivery_runtime_time = (
            (local_delivery_time or 0.0) + (city_travel_time or 0.0)
            if normalized_time_summary
            else None
        )
        non_delivery_runtime_time = (
            (thinking_time or 0.0)
            + (start_picking_confirmation_time or 0.0)
            + (aisle_travel_time or 0.0)
            + (item_add_to_cart_time or 0.0)
            + (penalty_time or 0.0)
            + (idle_or_other_time or 0.0)
            if normalized_time_summary
            else None
        )
        runtime_modeled_delta = (
            scenario_total_time_seconds - participant_modeled_time
            if scenario_total_time_seconds is not None and participant_modeled_time is not None
            else None
        )

        row = {
            "dataset_root": dataset_root,
            "participant_id": participant_id,
            "decision_source": str(decision.get("decision_source", "round_summary")),
            "decision_timestamp": decision.get("decision_timestamp"),
            "timestamp_available": int(decision.get("timestamp_available", 0) or 0),
            "round_coverage_status": str(
                decision.get("round_coverage_status")
                or ("reconstructed_action_summary" if decision.get("decision_source") == "action_summary_reconstructed" else "timestamped_round_summary")
            ),
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
            "participant_earnings": reported_participant_earnings,
            "participant_modeled_time": participant_modeled_time,
            "participant_score": participant_score,
            "best_score": best_score,
            "score_ratio_to_best": score_ratio_to_best,
            "percent_regret": percent_regret,
            "is_exact_optimal": is_exact_optimal,
            "is_near_optimal": is_near_optimal,
            "scenario_set_version_id": scenario_set_version_id or None,
            "summary_total_rounds": _safe_float(summary_entry.get("totalRounds")) if isinstance(summary_entry, dict) else None,
            "summary_rounds_completed": _safe_float(summary_entry.get("roundsCompleted")) if isinstance(summary_entry, dict) else None,
            "summary_optimal_choices": _safe_float(summary_entry.get("optimalChoices")) if isinstance(summary_entry, dict) else None,
            "summary_total_game_time": _safe_float(summary_entry.get("totalGameTime")) if isinstance(summary_entry, dict) else None,
            "summary_completed_game": int(bool(summary_entry.get("completedGame"))) if isinstance(summary_entry, dict) else None,
            "progress_completed_scenarios_count": (
                len(_normalize_scenario_id_list(progress_entry.get("completedScenarios")))
                if isinstance(progress_entry, dict)
                else None
            ),
            "progress_current_round": _safe_float(progress_entry.get("currentRound")) if isinstance(progress_entry, dict) else None,
            "progress_current_location": str(progress_entry.get("currentLocation", "")) if isinstance(progress_entry, dict) else None,
            "progress_in_progress_scenario": str(progress_entry.get("inProgressScenario", "")) if isinstance(progress_entry, dict) else None,
            "scenario_total_time_seconds": scenario_total_time_seconds,
            "thinking_time": thinking_time,
            "start_picking_confirmation_time": start_picking_confirmation_time,
            "aisle_travel_time": aisle_travel_time,
            "item_add_to_cart_time": item_add_to_cart_time,
            "local_delivery_time": local_delivery_time,
            "city_travel_time": city_travel_time,
            "penalty_time": penalty_time,
            "idle_or_other_time": idle_or_other_time,
            "delivery_runtime_time": delivery_runtime_time,
            "non_delivery_runtime_time": non_delivery_runtime_time,
            "runtime_modeled_delta": runtime_modeled_delta,
            "qa_completed_game_mismatch": qa_completed_game_mismatch,
            "qa_missing_recommendation_labels": int(not dataset_has_recommendation_labels),
        }
        fact_rows.append(row)

        if success and decision.get("final_location"):
            participant_city[participant_id] = str(decision.get("final_location", ""))

    return fact_rows, qa_issues
