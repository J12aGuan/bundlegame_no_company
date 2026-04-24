"""CLI entrypoint for analytics v1 pipeline."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import asdict
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path
import math
from typing import Any

from analytics.config import DEFAULT_BOOTSTRAP_B, DEFAULT_RANDOM_SEED
from analytics.io.firestore_adapter import load_from_firestore
from analytics.io.json_adapter import load_from_json
from analytics.pipeline.decision_fact import (
    build_decision_fact,
    get_decision_fact_export_columns,
)
from analytics.pipeline.normalize import build_indexes
from analytics.model.scorer import score_bundle
from analytics.stats.comparisons import bootstrap_diff_median_ci, two_proportion_z_test
from analytics.stats.intervals import bootstrap_ci, wilson_interval
from analytics.stats.point_estimates import summarize_continuous, summarize_rate


RESEARCH_FEATURE_VERSION = "research_v2"
DATASET_SNAPSHOT_SCHEMA_VERSION = 1


def _read_optional_json(path: str | None) -> dict[str, Any]:
    if not path:
        return {}
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")
    with p.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return data


def _write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    ordered = fieldnames or sorted({k for row in rows for k in row.keys()})
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=ordered, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


ANALYSIS_MASTER_EXPORT_COLUMNS = [
    "dataset_root",
    "participant_id",
    "decision_source",
    "decision_timestamp",
    "timestamp_available",
    "round_coverage_status",
    "qa_completed_game_mismatch",
    "qa_missing_recommendation_labels",
    "scenario_set_version_id",
    "round_index",
    "phase",
    "phase_progress_index",
    "classification",
    "scenario_id",
    "current_city",
    "scenario_max_bundle",
    "scenario_order_count",
    "scenario_order_ids",
    "shown_recommendation_status",
    "shown_recommendation_bundle_ids",
    "recommendation_quality",
    "followed_recommendation",
    "shown_recommendation_score",
    "shown_recommendation_score_ratio_to_best",
    "shown_recommendation_percent_regret",
    "recommendation_helpful",
    "recommendation_harmful",
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
    "prior_decisions_count",
    "prior_optimal_rate",
    "prior_failure_rate",
    "prior_mean_bundle_size",
    "prior_recommendation_compliance",
    "prior_mean_regret",
    "prior_mean_score_ratio",
    "prior_phase_score_ratio",
    "prior_phase_failure_rate",
    "metadata_join_status",
]

POLICY_TRAINING_EXPORT_COLUMNS = [
    "dataset_root",
    "participant_id",
    "round_index",
    "state_decision_source",
    "state_decision_timestamp",
    "state_timestamp_available",
    "state_round_coverage_status",
    "state_qa_completed_game_mismatch",
    "state_qa_missing_recommendation_labels",
    "phase",
    "classification",
    "scenario_id",
    "state_current_city",
    "state_phase_progress_index",
    "state_prior_decisions_count",
    "state_prior_optimal_rate",
    "state_prior_failure_rate",
    "state_prior_recommendation_compliance",
    "state_prior_mean_bundle_size",
    "state_prior_mean_regret",
    "state_prior_mean_score_ratio",
    "state_prior_phase_score_ratio",
    "action_bundle_ids",
    "action_bundle_size",
    "action_score_ratio_to_best",
    "action_percent_regret",
    "action_score",
    "action_modeled_time",
    "action_earnings",
    "action_is_optimal",
    "action_is_near_optimal",
    "action_matches_shown_recommendation",
    "action_recommendation_quality",
    "observed_chosen_action",
    "observed_followed_recommendation",
    "reward_target",
    "observed_reward",
    "next_round_index",
    "next_phase",
    "next_current_city",
    "next_prior_optimal_rate",
    "next_prior_failure_rate",
    "next_prior_mean_regret",
    "done",
]

RECOMMENDATION_WORKBENCH_EXPORT_COLUMNS = [
    "dataset_root",
    "participant_id",
    "round_index",
    "phase",
    "classification",
    "scenario_id",
    "baseline_expected_score_ratio",
    "predicted_adoption_probability",
    "predicted_outcome_score_ratio",
    "predicted_expected_score_ratio",
    "predicted_lift_vs_baseline",
    "recommended_bundle_ids",
    "recommended_bundle_size",
    "recommended_bundle_score_ratio_to_best",
    "recommended_bundle_percent_regret",
    "recommended_bundle_is_optimal",
    "historical_chosen_bundle_ids",
    "historical_score_ratio_to_best",
    "oracle_bundle_ids",
    "oracle_score_ratio_to_best",
    "oracle_gap",
    "why_ranked_high",
]

RECOMMENDATION_SUMMARY_EXPORT_COLUMNS = [
    "scope",
    "group_value",
    "n_states",
    "mean_baseline_expected_score_ratio",
    "mean_predicted_adoption_probability",
    "mean_predicted_outcome_score_ratio",
    "mean_predicted_expected_score_ratio",
    "mean_predicted_lift_vs_baseline",
    "recommended_optimal_rate",
    "recommended_mean_regret",
    "historical_mean_score_ratio",
    "oracle_mean_score_ratio",
]

POLICY_COMPARISON_EXPORT_COLUMNS = [
    "policy_name",
    "scope",
    "group_value",
    "n_states",
    "mean_reward",
    "mean_regret",
    "optimal_rate",
    "mean_bundle_size",
    "mean_lift_vs_historical",
]

OPE_SUMMARY_EXPORT_COLUMNS = [
    "policy_name",
    "scope",
    "group_value",
    "n_states",
    "ips",
    "snips",
    "direct_method",
    "doubly_robust",
    "fqe_one_step",
    "match_rate",
    "mean_target_propensity",
]

SANDBOX_SUMMARY_EXPORT_COLUMNS = [
    "policy_name",
    "simulation_label",
    "n_states",
    "iterations",
    "seed",
    "mean_simulated_reward",
    "simulated_reward_ci_low",
    "simulated_reward_ci_high",
    "mean_gap_vs_historical",
]

RESERVED_METADATA_FIELDS = {
    "id",
    "participant_id",
    "liveSessionId",
    "live_session_id",
    "__metadataJoinStatus",
    "__metadataJoinMatchedValue",
    "__metadataJoinMethod",
}


def _append_unique_columns(columns: list[str], extras: list[str] | None = None) -> list[str]:
    out = list(columns)
    for field in extras or []:
        normalized = str(field or "").strip()
        if normalized and normalized not in out:
            out.append(normalized)
    return out


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _clamp(value: float | int | None, lo: float = 0.0, hi: float = 1.0) -> float:
    if value is None:
        return lo
    return min(hi, max(lo, float(value)))


def _normalize_id_array(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(entry).strip() for entry in value if str(entry).strip()]
    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            return []
        try:
            parsed = json.loads(trimmed)
            if isinstance(parsed, list):
                return _normalize_id_array(parsed)
        except Exception:
            pass
        return [part.strip() for part in trimmed.replace("|", ",").split(",") if part.strip()]
    return []


def _bundle_signature(bundle_ids: Any) -> str:
    return "|".join(sorted(_normalize_id_array(bundle_ids)))


def _read_optional_rows(path: str | None) -> list[dict[str, Any]]:
    if not path:
        return []
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if p.suffix.lower() == ".csv":
        with p.open("r", encoding="utf-8", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]

    with p.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)

    if isinstance(raw, list):
        return [row for row in raw if isinstance(row, dict)]
    if isinstance(raw, dict):
        for key in ("rows", "participants", "data"):
            if isinstance(raw.get(key), list):
                return [row for row in raw[key] if isinstance(row, dict)]
    raise ValueError(f"Unsupported metadata payload in {path}")


def _merge_participant_metadata(
    participants: list[dict[str, Any]],
    metadata_rows: list[dict[str, Any]],
    *,
    metadata_join_key: str = "participant_id",
    participant_join_key: str = "id",
    metadata_session_key: str = "",
    participant_session_key: str = "liveSessionId",
) -> tuple[list[dict[str, Any]], list[str], dict[str, Any], list[dict[str, Any]]]:
    if not metadata_rows:
        return (
            [{**participant, "__metadataJoinStatus": "none"} for participant in participants],
            [],
            {
                "rowsLoaded": 0,
                "matchedParticipants": 0,
                "unmatchedParticipants": 0,
                "fallbackMatches": 0,
            },
            [],
        )

    metadata_fields = sorted(
        {
            key
            for row in metadata_rows
            for key in row.keys()
            if key not in RESERVED_METADATA_FIELDS
        }
    )
    primary_lookup: dict[str, dict[str, Any]] = {}
    fallback_lookup: dict[str, dict[str, Any]] = {}
    for row in metadata_rows:
        primary_value = str(row.get(metadata_join_key, "")).strip()
        if primary_value and primary_value not in primary_lookup:
            primary_lookup[primary_value] = row
        fallback_value = str(row.get(metadata_session_key, "")).strip() if metadata_session_key else ""
        if fallback_value and fallback_value not in fallback_lookup:
            fallback_lookup[fallback_value] = row

    matched = 0
    unmatched = 0
    fallback = 0
    merged_participants: list[dict[str, Any]] = []
    for participant in participants:
        participant_key = str(participant.get(participant_join_key, "")).strip()
        participant_session = (
            str(participant.get(participant_session_key, "")).strip()
            if participant_session_key
            else ""
        )
        matched_row = primary_lookup.get(participant_key) if participant_key else None
        method = "none"
        if matched_row:
            method = "participant_id"
        elif metadata_session_key and participant_session:
            matched_row = fallback_lookup.get(participant_session)
            if matched_row:
                method = "session_fallback"

        merged = dict(participant)
        if matched_row:
            matched += 1
            if method == "session_fallback":
                fallback += 1
            for field in metadata_fields:
                if field in matched_row:
                    merged[field] = matched_row[field]
        else:
            unmatched += 1
        merged["__metadataJoinStatus"] = method if matched_row else "unmatched"
        merged_participants.append(merged)

    issues: list[dict[str, Any]] = []
    if unmatched:
        issues.append(
            {
                "severity": "warning",
                "issue_type": "failed_metadata_join",
                "participant_id": "",
                "round_index": None,
                "scenario_id": "",
                "message": (
                    f'{unmatched} participant rows could not be matched to uploaded metadata using "{metadata_join_key}"'
                    + (f' or "{metadata_session_key}"' if metadata_session_key else "")
                    + "."
                ),
            }
        )
    if fallback:
        issues.append(
            {
                "severity": "warning",
                "issue_type": "metadata_session_fallback_used",
                "participant_id": "",
                "round_index": None,
                "scenario_id": "",
                "message": f'{fallback} metadata joins used the explicit session fallback "{metadata_session_key}".',
            }
        )

    return (
        merged_participants,
        metadata_fields,
        {
            "rowsLoaded": len(metadata_rows),
            "matchedParticipants": matched,
            "unmatchedParticipants": unmatched,
            "fallbackMatches": fallback,
        },
        issues,
    )


def _collect_continuous(rows: list[dict[str, Any]], key: str, *, exclude_failures: bool = True) -> list[float]:
    out = []
    for row in rows:
        if exclude_failures and int(row.get("is_failure", 0)) == 1:
            continue
        value = row.get(key)
        if isinstance(value, (int, float)):
            out.append(float(value))
    return out


def _collect_rate(rows: list[dict[str, Any]], key: str) -> list[int]:
    out = []
    for row in rows:
        value = row.get(key)
        if isinstance(value, (int, float)):
            out.append(int(float(value) > 0))
    return out


def _build_kpi_rows(
    rows: list[dict[str, Any]],
    group_key: str | None,
    bootstrap_b: int,
    seed: int,
) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if group_key is None:
        grouped["overall"] = rows
    else:
        for row in rows:
            grouped[str(row.get(group_key, ""))].append(row)

    out: list[dict[str, Any]] = []
    for group_value, group_rows in grouped.items():
        exact_vals = _collect_rate(group_rows, "is_exact_optimal")
        near_vals = _collect_rate(group_rows, "is_near_optimal")
        fail_vals = _collect_rate(group_rows, "is_failure")

        exact = summarize_rate(exact_vals)
        near = summarize_rate(near_vals)
        fail = summarize_rate(fail_vals)

        exact_ci = wilson_interval(int(exact["x"]), int(exact["n"])) if exact["n"] else (None, None)
        near_ci = wilson_interval(int(near["x"]), int(near["n"])) if near["n"] else (None, None)
        fail_ci = wilson_interval(int(fail["x"]), int(fail["n"])) if fail["n"] else (None, None)

        ratio_vals = _collect_continuous(group_rows, "score_ratio_to_best")
        regret_vals = _collect_continuous(group_rows, "percent_regret")

        ratio_sum = summarize_continuous(ratio_vals)
        regret_sum = summarize_continuous(regret_vals)

        ratio_med_ci = bootstrap_ci(ratio_vals, statistic="median", b=bootstrap_b, seed=seed)
        ratio_mean_ci = bootstrap_ci(ratio_vals, statistic="mean", b=bootstrap_b, seed=seed)
        regret_med_ci = bootstrap_ci(regret_vals, statistic="median", b=bootstrap_b, seed=seed)
        regret_mean_ci = bootstrap_ci(regret_vals, statistic="mean", b=bootstrap_b, seed=seed)

        out.append(
            {
                (group_key or "scope"): group_value,
                "n_decisions": len(group_rows),
                "n_non_failure_for_continuous": len(ratio_vals),
                "exact_optimal_rate": exact["rate"],
                "exact_optimal_rate_ci_low": exact_ci[0],
                "exact_optimal_rate_ci_high": exact_ci[1],
                "near_optimal_rate": near["rate"],
                "near_optimal_rate_ci_low": near_ci[0],
                "near_optimal_rate_ci_high": near_ci[1],
                "failure_rate": fail["rate"],
                "failure_rate_ci_low": fail_ci[0],
                "failure_rate_ci_high": fail_ci[1],
                "score_ratio_to_best_mean": ratio_sum["mean"],
                "score_ratio_to_best_mean_ci_low": ratio_mean_ci[0],
                "score_ratio_to_best_mean_ci_high": ratio_mean_ci[1],
                "score_ratio_to_best_median": ratio_sum["median"],
                "score_ratio_to_best_median_ci_low": ratio_med_ci[0],
                "score_ratio_to_best_median_ci_high": ratio_med_ci[1],
                "score_ratio_to_best_q1": ratio_sum["q1"],
                "score_ratio_to_best_q3": ratio_sum["q3"],
                "score_ratio_to_best_iqr": ratio_sum["iqr"],
                "percent_regret_mean": regret_sum["mean"],
                "percent_regret_mean_ci_low": regret_mean_ci[0],
                "percent_regret_mean_ci_high": regret_mean_ci[1],
                "percent_regret_median": regret_sum["median"],
                "percent_regret_median_ci_low": regret_med_ci[0],
                "percent_regret_median_ci_high": regret_med_ci[1],
                "percent_regret_q1": regret_sum["q1"],
                "percent_regret_q3": regret_sum["q3"],
                "percent_regret_iqr": regret_sum["iqr"],
            }
        )

    return out


TIMING_KPI_FIELDS = [
    "scenario_total_time_seconds",
    "participant_modeled_time",
    "runtime_modeled_delta",
    "delivery_runtime_time",
    "non_delivery_runtime_time",
    "thinking_time",
    "start_picking_confirmation_time",
    "aisle_travel_time",
    "item_add_to_cart_time",
    "local_delivery_time",
    "city_travel_time",
    "penalty_time",
    "idle_or_other_time",
]


def _build_timing_kpi_rows(rows: list[dict[str, Any]], group_key: str | None) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if group_key is None:
        grouped["overall"] = rows
    else:
        for row in rows:
            grouped[str(row.get(group_key, ""))].append(row)

    out: list[dict[str, Any]] = []
    for group_value, group_rows in grouped.items():
        entry: dict[str, Any] = {
            (group_key or "scope"): group_value,
            "n_decisions": len(group_rows),
            "n_rows_with_runtime_timing": len(
                _collect_continuous(group_rows, "scenario_total_time_seconds", exclude_failures=False)
            ),
        }
        for field in TIMING_KPI_FIELDS:
            values = _collect_continuous(group_rows, field, exclude_failures=False)
            summary = summarize_continuous(values)
            entry[f"{field}_mean"] = summary["mean"]
            entry[f"{field}_median"] = summary["median"]
            entry[f"{field}_q1"] = summary["q1"]
            entry[f"{field}_q3"] = summary["q3"]
            entry[f"{field}_iqr"] = summary["iqr"]
        out.append(entry)

    if group_key == "round_index":
        out.sort(key=lambda row: float(row.get("round_index", 0) or 0))
    elif group_key is not None:
        out.sort(key=lambda row: str(row.get(group_key, "")))

    return out


def _attach_cohort(rows: list[dict[str, Any]], participants: list[dict[str, Any]], cohort_col: str | None) -> None:
    if not cohort_col:
        return
    pmap = {str(p.get("id", "")): p for p in participants if isinstance(p, dict)}
    for row in rows:
        participant = pmap.get(str(row.get("participant_id", "")), {})
        row[cohort_col] = participant.get(cohort_col)


def _build_cohort_comparisons(
    rows: list[dict[str, Any]],
    cohort_col: str,
    bootstrap_b: int,
    seed: int,
) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        cohort = row.get(cohort_col)
        if cohort is None:
            continue
        grouped[str(cohort)].append(row)

    comparisons = []
    cohorts = sorted(grouped.keys())
    for a, b in combinations(cohorts, 2):
        rows_a = grouped[a]
        rows_b = grouped[b]

        exact_a = _collect_rate(rows_a, "is_exact_optimal")
        exact_b = _collect_rate(rows_b, "is_exact_optimal")
        near_a = _collect_rate(rows_a, "is_near_optimal")
        near_b = _collect_rate(rows_b, "is_near_optimal")
        fail_a = _collect_rate(rows_a, "is_failure")
        fail_b = _collect_rate(rows_b, "is_failure")

        exact_test = two_proportion_z_test(sum(exact_a), len(exact_a), sum(exact_b), len(exact_b))
        near_test = two_proportion_z_test(sum(near_a), len(near_a), sum(near_b), len(near_b))
        fail_test = two_proportion_z_test(sum(fail_a), len(fail_a), sum(fail_b), len(fail_b))

        ratio_a = _collect_continuous(rows_a, "score_ratio_to_best")
        ratio_b = _collect_continuous(rows_b, "score_ratio_to_best")
        regret_a = _collect_continuous(rows_a, "percent_regret")
        regret_b = _collect_continuous(rows_b, "percent_regret")

        ratio_diff = bootstrap_diff_median_ci(ratio_a, ratio_b, b=bootstrap_b, seed=seed)
        regret_diff = bootstrap_diff_median_ci(regret_a, regret_b, b=bootstrap_b, seed=seed)

        comparisons.append(
            {
                "cohort_col": cohort_col,
                "cohort_a": a,
                "cohort_b": b,
                "n_a": len(rows_a),
                "n_b": len(rows_b),
                "exact_rate_diff": exact_test["diff"],
                "exact_rate_z": exact_test["z"],
                "exact_rate_p_value": exact_test["p_value"],
                "near_rate_diff": near_test["diff"],
                "near_rate_z": near_test["z"],
                "near_rate_p_value": near_test["p_value"],
                "failure_rate_diff": fail_test["diff"],
                "failure_rate_z": fail_test["z"],
                "failure_rate_p_value": fail_test["p_value"],
                "ratio_median_diff": ratio_diff[0],
                "ratio_median_diff_ci_low": ratio_diff[1],
                "ratio_median_diff_ci_high": ratio_diff[2],
                "regret_median_diff": regret_diff[0],
                "regret_median_diff_ci_low": regret_diff[1],
                "regret_median_diff_ci_high": regret_diff[2],
            }
        )

    return comparisons


def _build_data_health(
    participants: list[dict[str, Any]],
    rows: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
) -> dict[str, Any]:
    version_id = str((scenario_bundle.get("metadata", {}) or {}).get("scenarioSetVersionId") or "").strip()

    def _has_version_entry(participant: dict[str, Any], doc_key: str, map_key: str) -> bool:
        doc = participant.get(doc_key)
        if not isinstance(doc, dict) or not version_id:
            return False
        version_map = doc.get(map_key)
        if not isinstance(version_map, dict):
            return False
        entry = version_map.get(version_id)
        return isinstance(entry, dict)

    participants_with_summary = 0
    participants_with_progress = 0
    participants_with_actions = 0
    participants_with_any = 0
    participants_with_complete = 0

    for participant in participants:
        summary_ok = _has_version_entry(
            participant,
            "summaryDoc" if isinstance(participant.get("summaryDoc"), dict) else "progressSummary",
            "summaryByScenarioSetVersionId",
        )
        progress_ok = _has_version_entry(
            participant,
            "scenarioSetProgressDoc",
            "progressByScenarioSetVersionId",
        )
        actions_ok = _has_version_entry(
            participant,
            "scenarioActionsDoc",
            "actionsByScenarioSetVersionId",
        )
        participants_with_summary += int(summary_ok)
        participants_with_progress += int(progress_ok)
        participants_with_actions += int(actions_ok)
        participants_with_any += int(summary_ok or progress_ok or actions_ok)
        participants_with_complete += int(summary_ok and progress_ok and actions_ok)

    row_source_counts: dict[str, int] = defaultdict(int)
    timestamped_rows = 0
    reconstructed_rows = 0
    for row in rows:
        source = str(row.get("decision_source", "unknown") or "unknown")
        row_source_counts[source] += 1
        timestamped_rows += int(bool(row.get("timestamp_available")))
        reconstructed_rows += int(source == "action_summary_reconstructed")

    return {
        "datasetScenarioSetVersionId": version_id,
        "legacyMode": not bool(version_id),
        "participantsLoaded": len(participants),
        "participantsWithVersionSummary": participants_with_summary,
        "participantsWithVersionProgress": participants_with_progress,
        "participantsWithVersionActions": participants_with_actions,
        "participantsWithAnyVersionState": participants_with_any,
        "participantsWithCompleteVersionState": participants_with_complete,
        "timestampedDecisionRows": timestamped_rows,
        "reconstructedDecisionRows": reconstructed_rows,
        "rowSourceCounts": dict(row_source_counts),
        "decisionRowsWithTiming": len(
            _collect_continuous(rows, "scenario_total_time_seconds", exclude_failures=False)
        ),
        "decisionRowsMissingTiming": sum(
            1 for row in rows if row.get("scenario_total_time_seconds") is None
        ),
    }


def _get_scenario_lookup(scenario_bundle: dict[str, Any]) -> tuple[dict[str, Any], dict[str, list[int]]]:
    by_id: dict[str, Any] = {}
    by_phase: dict[str, list[int]] = {}
    for scenario in scenario_bundle.get("scenarios", []) if isinstance(scenario_bundle, dict) else []:
        scenario_id = str(scenario.get("scenario_id", "")).strip()
        if scenario_id:
            by_id[scenario_id] = scenario
        phase = str(scenario.get("phase", "")).strip() or "Unknown"
        round_index = int(scenario.get("round", 0) or 0)
        if round_index:
            by_phase.setdefault(phase, []).append(round_index)
    for phase in by_phase:
        by_phase[phase].sort()
    return by_id, by_phase


def _get_recommendation_bundle_ids(
    scenario: dict[str, Any],
    orders_by_id: dict[str, Any],
    optimal: dict[str, Any],
) -> list[str]:
    for key in (
        "recommended_order_ids",
        "recommendedOrderIds",
        "recommended_orders",
        "recommendedOrders",
        "recommended_bundle_ids",
        "recommendedBundleIds",
    ):
        normalized = _normalize_id_array(scenario.get(key))
        if normalized:
            return normalized
    for key in ("recommended_bundle_ids", "recommendedBundleIds"):
        normalized = _normalize_id_array(optimal.get(key))
        if normalized:
            return normalized

    scenario_order_ids = _normalize_id_array(scenario.get("order_ids"))
    return [
        order_id
        for order_id in scenario_order_ids
        if bool((orders_by_id.get(order_id) or {}).get("recommended"))
    ]


def _generate_combinations(values: list[str], max_size: int) -> list[list[str]]:
    out: list[list[str]] = []
    for size in range(1, min(len(values), max_size) + 1):
        out.extend([list(combo) for combo in combinations(values, size)])
    return out


def _evaluate_candidate_bundles(
    scenario: dict[str, Any],
    optimal: dict[str, Any],
    orders_by_id: dict[str, Any],
    current_city: str,
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
) -> list[dict[str, Any]]:
    scenario_order_ids = _normalize_id_array(scenario.get("order_ids"))
    max_bundle = min(
        len(scenario_order_ids),
        max(1, int(scenario.get("max_bundle", 0) or len(scenario_order_ids) or 1)),
    )
    shown_bundle_ids = _get_recommendation_bundle_ids(scenario, orders_by_id, optimal)
    shown_signature = _bundle_signature(shown_bundle_ids)
    stored_best_signature = _bundle_signature(_normalize_id_array(optimal.get("best_bundle_ids")))

    raw_candidates: list[dict[str, Any]] = []
    for bundle_ids in _generate_combinations(scenario_order_ids, max_bundle):
        stores = {
            str((orders_by_id.get(bundle_id) or {}).get("store", ""))
            for bundle_id in bundle_ids
            if str((orders_by_id.get(bundle_id) or {}).get("store", ""))
        }
        if len(stores) > 1:
            continue
        evaluation = score_bundle(
            bundle_ids=bundle_ids,
            orders_by_id=orders_by_id,
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
            float("-inf") if row["score"] is None else row["score"],
            -row["bundleSize"],
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
                "isOptimal": int(row["bundleSignature"] == best_signature),
                "isNearOptimal": int(score_ratio is not None and score_ratio >= 0.95),
                "matchesShownRecommendation": int(bool(shown_signature) and row["bundleSignature"] == shown_signature),
                "recommendationQuality": (
                    "optimal" if score_ratio is not None and score_ratio >= 0.999999 else "suboptimal"
                ),
                "dynamicBestBundleIds": best_candidate.get("bundleIds", []) if best_candidate else [],
                "dynamicSecondBestBundleIds": second_best_candidate.get("bundleIds", []) if second_best_candidate else [],
            }
        )
    return candidates


def _linear_slope(points: list[tuple[float, float]]) -> float:
    if len(points) < 2:
        return 0.0
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    x_mean = _mean(xs) or 0.0
    y_mean = _mean(ys) or 0.0
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in points)
    denominator = sum((x - x_mean) ** 2 for x in xs)
    return numerator / denominator if denominator else 0.0


def _solve_linear_system(matrix: list[list[float]], vector: list[float]) -> list[float] | None:
    size = len(matrix)
    if not size or size != len(vector):
        return None
    augmented = [list(row) + [vector[index]] for index, row in enumerate(matrix)]

    for col in range(size):
        pivot = max(range(col, size), key=lambda row: abs(augmented[row][col]))
        if abs(augmented[pivot][col]) < 1e-10:
            return None
        if pivot != col:
            augmented[col], augmented[pivot] = augmented[pivot], augmented[col]

        pivot_value = augmented[col][col]
        for j in range(col, size + 1):
            augmented[col][j] /= pivot_value

        for row in range(size):
            if row == col:
                continue
            factor = augmented[row][col]
            for j in range(col, size + 1):
                augmented[row][j] -= factor * augmented[col][j]

    return [row[size] for row in augmented]


def _fit_linear_model(
    rows: list[dict[str, Any]],
    feature_keys: list[str],
    target_key: str,
    *,
    clip_range: tuple[float, float] = (0.0, 1.0),
    regularization: float = 0.15,
    min_rows: int = 4,
    default_value: float = 0.5,
) -> dict[str, Any]:
    samples = [
        {**row, target_key: float(row[target_key])}
        for row in rows
        if row.get(target_key) is not None
    ]
    fallback_value = _mean([row[target_key] for row in samples]) or default_value
    if len(samples) < max(min_rows, len(feature_keys) + 1):
        return {
            "type": "fallback",
            "defaultValue": _clamp(fallback_value, *clip_range),
            "featureKeys": feature_keys,
            "clipRange": clip_range,
            "trainingRows": len(samples),
        }

    means = [_mean([float(row.get(key, 0) or 0) for row in samples]) or 0.0 for key in feature_keys]
    scales = []
    for index, key in enumerate(feature_keys):
        values = [float(row.get(key, 0) or 0) for row in samples]
        mu = means[index]
        variance = _mean([(value - mu) ** 2 for value in values]) or 0.0
        scales.append(math.sqrt(max(variance, 1e-12)) or 1.0)

    width = len(feature_keys) + 1
    gram = [[0.0 for _ in range(width)] for _ in range(width)]
    rhs = [0.0 for _ in range(width)]

    for row in samples:
        vector = [1.0] + [
            (float(row.get(key, 0) or 0) - means[index]) / scales[index]
            for index, key in enumerate(feature_keys)
        ]
        for i in range(width):
            rhs[i] += vector[i] * row[target_key]
            for j in range(width):
                gram[i][j] += vector[i] * vector[j]

    for index in range(1, width):
        gram[index][index] += regularization

    coefficients = _solve_linear_system(gram, rhs)
    if coefficients is None:
        return {
            "type": "fallback",
            "defaultValue": _clamp(fallback_value, *clip_range),
            "featureKeys": feature_keys,
            "clipRange": clip_range,
            "trainingRows": len(samples),
        }

    return {
        "type": "linear",
        "coefficients": coefficients,
        "featureKeys": feature_keys,
        "means": means,
        "scales": scales,
        "defaultValue": _clamp(fallback_value, *clip_range),
        "clipRange": clip_range,
        "trainingRows": len(samples),
    }


def _predict_linear_model(model: dict[str, Any], feature_row: dict[str, Any]) -> float:
    if model.get("type") != "linear":
        lo, hi = model.get("clipRange", (0.0, 1.0))
        return _clamp(float(model.get("defaultValue", 0.5)), lo, hi)

    output = float(model["coefficients"][0])
    for index, key in enumerate(model["featureKeys"]):
        raw = float(feature_row.get(key, 0) or 0)
        normalized = (raw - model["means"][index]) / model["scales"][index]
        output += float(model["coefficients"][index + 1]) * normalized
    lo, hi = model.get("clipRange", (0.0, 1.0))
    return _clamp(output, lo, hi)


def _explain_linear_model(model: dict[str, Any], feature_row: dict[str, Any], label_map: dict[str, str]) -> str:
    if model.get("type") != "linear":
        return "baseline_mean"
    contributions = []
    for index, key in enumerate(model["featureKeys"]):
        raw = float(feature_row.get(key, 0) or 0)
        normalized = (raw - model["means"][index]) / model["scales"][index]
        contributions.append(
            (
                label_map.get(key, key),
                float(model["coefficients"][index + 1]) * normalized,
            )
        )
    contributions.sort(key=lambda item: abs(item[1]), reverse=True)
    return " | ".join(
        f"{label}:{'+' if value >= 0 else ''}{value:.3f}"
        for label, value in contributions[:3]
    )


def _make_recommendation_feature_row(master_row: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    scenario_max_bundle = max(1, int(master_row.get("scenario_max_bundle", 0) or 1))
    return {
        "prior_optimal_rate": float(master_row.get("prior_optimal_rate") or 0),
        "prior_failure_rate": float(master_row.get("prior_failure_rate") or 0),
        "prior_recommendation_compliance": float(master_row.get("prior_recommendation_compliance") or 0),
        "prior_mean_bundle_size": float(master_row.get("prior_mean_bundle_size") or 0),
        "prior_mean_regret": float(master_row.get("prior_mean_regret") or 0),
        "prior_mean_score_ratio": float(master_row.get("prior_mean_score_ratio") or 0),
        "prior_phase_score_ratio": float(
            master_row.get("prior_phase_score_ratio")
            or master_row.get("prior_mean_score_ratio")
            or 0
        ),
        "phase_progress_index": float(master_row.get("phase_progress_index") or 0),
        "scenario_max_bundle": float(scenario_max_bundle),
        "candidate_bundle_size": float(candidate.get("bundleSize") or 0),
        "candidate_bundle_size_ratio": float(candidate.get("bundleSize") or 0) / scenario_max_bundle,
        "candidate_score_ratio_to_best": float(candidate.get("scoreRatioToBest") or 0),
        "candidate_percent_regret": float(candidate.get("percentRegret") or 0),
        "candidate_is_optimal": float(candidate.get("isOptimal") or 0),
        "candidate_is_near_optimal": float(candidate.get("isNearOptimal") or 0),
    }


def _get_behavior_summary(rows: list[dict[str, Any]], key: str, value: str) -> dict[str, Any]:
    score_ratios = [float(row["score_ratio_to_best"]) for row in rows if row.get("score_ratio_to_best") is not None]
    regrets = [float(row["percent_regret"]) for row in rows if row.get("percent_regret") is not None]
    durations = [float(row["duration"]) for row in rows if row.get("duration") is not None]
    bundle_sizes = [float(row["bundle_size"]) for row in rows if row.get("bundle_size") is not None]
    follow_rows = [row for row in rows if row.get("followed_recommendation") is not None]
    help_rows = [row for row in rows if row.get("recommendation_helpful") is not None]
    harm_rows = [row for row in rows if row.get("recommendation_harmful") is not None]
    return {
        key or "scope": value,
        "n_decisions": len(rows),
        "exact_optimal_rate": _mean([float(row.get("is_exact_optimal") or 0) for row in rows]),
        "failure_rate": _mean([float(row.get("is_failure") or 0) for row in rows]),
        "mean_score_ratio": _mean(score_ratios),
        "mean_regret": _mean(regrets),
        "mean_bundle_size": _mean(bundle_sizes),
        "mean_duration": _mean(durations),
        "recommendation_follow_rate": _mean([float(row.get("followed_recommendation") or 0) for row in follow_rows]),
        "recommendation_help_rate": _mean([float(row.get("recommendation_helpful") or 0) for row in help_rows]),
        "recommendation_harm_rate": _mean([float(row.get("recommendation_harmful") or 0) for row in harm_rows]),
    }


def _build_behavior_summary_rows(rows: list[dict[str, Any]], group_key: str) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get(group_key, "unknown"))].append(row)
    return [
        _get_behavior_summary(bucket, group_key, group_value)
        for group_value, bucket in sorted(grouped.items(), key=lambda item: item[0])
    ]


def _build_participant_trajectory_rows(master_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in master_rows:
        grouped[str(row.get("participant_id", ""))].append(row)

    output = []
    for participant_id, rows in grouped.items():
        rows = sorted(rows, key=lambda row: int(row.get("round_index", 0) or 0))
        score_points = [
            (float(row["round_index"]), float(row["score_ratio_to_best"]))
            for row in rows
            if row.get("score_ratio_to_best") is not None
        ]
        mean_score = _mean([point[1] for point in score_points]) or 0.0
        slope = _linear_slope(score_points)
        if mean_score >= 0.85 and slope >= -0.01:
            segment = "stable_high"
        elif slope >= 0.03:
            segment = "improving"
        elif slope <= -0.03:
            segment = "declining"
        elif mean_score < 0.65:
            segment = "stable_low"
        else:
            segment = "mixed"
        output.append(
            {
                "participant_id": participant_id,
                "n_decisions": len(rows),
                "mean_score_ratio": mean_score,
                "slope_score_ratio": slope,
                "mean_failure_rate": _mean([float(row.get("is_failure") or 0) for row in rows]),
                "mean_bundle_size": _mean([float(row.get("bundle_size") or 0) for row in rows]),
                "trajectory_segment": segment,
            }
        )
    return output


def _summarize_trajectory_segments(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts: dict[str, int] = defaultdict(int)
    for row in rows:
        counts[str(row.get("trajectory_segment", "mixed"))] += 1
    return [
        {"trajectory_segment": key, "n_participants": value}
        for key, value in sorted(counts.items(), key=lambda item: item[0])
    ]


def _build_transfer_summary(master_rows: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in master_rows:
        grouped[str(row.get("participant_id", ""))].append(row)
    deltas: list[float] = []
    for rows in grouped.values():
        phase_a = _mean([float(row["score_ratio_to_best"]) for row in rows if row.get("phase") == "A" and row.get("score_ratio_to_best") is not None])
        phase_c = _mean([float(row["score_ratio_to_best"]) for row in rows if row.get("phase") == "C" and row.get("score_ratio_to_best") is not None])
        if phase_a is not None and phase_c is not None:
            deltas.append(phase_c - phase_a)
    return {
        "participants_with_transfer_measure": len(deltas),
        "mean_phase_c_minus_a_score_ratio": _mean(deltas),
        "median_phase_c_minus_a_score_ratio": percentile(deltas, 0.5) if deltas else None,
    }


def _build_analysis_master_rows(
    fact_rows: list[dict[str, Any]],
    participants: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
    extra_fields: list[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    idx = build_indexes(scenario_bundle)
    scenario_by_round = idx["scenario_by_round"]
    orders_by_id = idx["order_by_id"]
    optimal_by_scenario = idx["optimal_by_scenario"]
    scenario_by_id, rounds_by_phase = _get_scenario_lookup(scenario_bundle)
    participant_map = {str(participant.get("id", "")): participant for participant in participants}
    issues: list[dict[str, Any]] = []

    master_rows: list[dict[str, Any]] = []
    for row in fact_rows:
        scenario = scenario_by_id.get(str(row.get("scenario_id", ""))) or scenario_by_round.get(int(row.get("round_index", 0) or 0), {})
        optimal = optimal_by_scenario.get(str(row.get("scenario_id", "")), {})
        scenario_order_ids = _normalize_id_array(scenario.get("order_ids"))
        shown_bundle_ids = _get_recommendation_bundle_ids(scenario, orders_by_id, optimal)
        shown_eval = (
            score_bundle(
                bundle_ids=shown_bundle_ids,
                orders_by_id=orders_by_id,
                current_city=str(row.get("current_city", "")),
                cities_dataset=cities_dataset,
                store_dataset=store_dataset,
            )
            if shown_bundle_ids
            else None
        )
        best_score = row.get("best_score")
        shown_ratio = (
            float(shown_eval["score"]) / float(best_score)
            if shown_eval and shown_eval.get("score") is not None and best_score not in (None, 0)
            else None
        )
        phase = str(row.get("phase") or scenario.get("phase") or "")
        phase_rounds = rounds_by_phase.get(phase, [])
        phase_progress_index = phase_rounds.index(int(row.get("round_index", 0) or 0)) + 1 if int(row.get("round_index", 0) or 0) in phase_rounds else 0
        participant = participant_map.get(str(row.get("participant_id", "")), {})

        master_row = dict(row)
        master_row["phase"] = phase
        master_row["phase_progress_index"] = phase_progress_index
        master_row["scenario_max_bundle"] = max(1, int(scenario.get("max_bundle", 0) or len(scenario_order_ids) or 1))
        master_row["scenario_order_count"] = len(scenario_order_ids)
        master_row["scenario_order_ids"] = json.dumps(scenario_order_ids)
        master_row["shown_recommendation_status"] = "shown" if shown_bundle_ids else "none"
        master_row["shown_recommendation_bundle_ids"] = json.dumps(shown_bundle_ids)
        master_row["recommendation_quality"] = (
            "none"
            if not shown_bundle_ids
            else "optimal"
            if shown_ratio is not None and shown_ratio >= 0.999999
            else "suboptimal"
        )
        master_row["followed_recommendation"] = (
            int(_bundle_signature(row.get("chosen_orders")) == _bundle_signature(shown_bundle_ids))
            if shown_bundle_ids
            else None
        )
        master_row["shown_recommendation_score"] = shown_eval.get("score") if shown_eval else None
        master_row["shown_recommendation_score_ratio_to_best"] = shown_ratio
        master_row["shown_recommendation_percent_regret"] = (1 - shown_ratio) if shown_ratio is not None else None
        master_row["recommendation_helpful"] = (
            int(shown_ratio > float(row["score_ratio_to_best"]) + 1e-9)
            if shown_ratio is not None and row.get("score_ratio_to_best") is not None
            else None
        )
        master_row["recommendation_harmful"] = (
            int(shown_ratio < float(row["score_ratio_to_best"]) - 1e-9)
            if shown_ratio is not None and row.get("score_ratio_to_best") is not None
            else None
        )
        master_row["metadata_join_status"] = str(participant.get("__metadataJoinStatus", "none"))
        for field in extra_fields:
            if field and field in participant:
                master_row[field] = participant[field]
        master_rows.append(master_row)

        if shown_bundle_ids and (shown_eval is None or shown_eval.get("score") is None):
            issues.append(
                {
                    "severity": "warning",
                    "issue_type": "missing_recommendation_bundle_score",
                    "participant_id": str(row.get("participant_id", "")),
                    "round_index": int(row.get("round_index", 0) or 0),
                    "scenario_id": str(row.get("scenario_id", "")),
                    "message": "Displayed recommendation bundle could not be scored from the current dataset.",
                }
            )

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in master_rows:
        grouped[str(row.get("participant_id", ""))].append(row)
    for rows in grouped.values():
        rows.sort(key=lambda row: int(row.get("round_index", 0) or 0))
        for index, current in enumerate(rows):
            prior_rows = rows[:index]
            prior_phase_rows = [row for row in prior_rows if row.get("phase") == current.get("phase")]
            prior_recommendation_rows = [row for row in prior_rows if row.get("followed_recommendation") is not None]
            prior_regrets = [float(row["percent_regret"]) for row in prior_rows if row.get("percent_regret") is not None]
            prior_scores = [float(row["score_ratio_to_best"]) for row in prior_rows if row.get("score_ratio_to_best") is not None]
            prior_phase_scores = [float(row["score_ratio_to_best"]) for row in prior_phase_rows if row.get("score_ratio_to_best") is not None]

            current["prior_decisions_count"] = len(prior_rows)
            current["prior_optimal_rate"] = _mean([float(row.get("is_exact_optimal") or 0) for row in prior_rows])
            current["prior_failure_rate"] = _mean([float(row.get("is_failure") or 0) for row in prior_rows])
            current["prior_mean_bundle_size"] = _mean([float(row.get("bundle_size") or 0) for row in prior_rows])
            current["prior_recommendation_compliance"] = _mean(
                [float(row.get("followed_recommendation") or 0) for row in prior_recommendation_rows]
            )
            current["prior_mean_regret"] = _mean(prior_regrets)
            current["prior_mean_score_ratio"] = _mean(prior_scores)
            current["prior_phase_score_ratio"] = _mean(prior_phase_scores) or _mean(prior_scores)
            current["prior_phase_failure_rate"] = _mean([float(row.get("is_failure") or 0) for row in prior_phase_rows]) or _mean(
                [float(row.get("is_failure") or 0) for row in prior_rows]
            )

    return master_rows, issues


def _build_policy_training_rows(
    master_rows: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
    extra_fields: list[str],
) -> list[dict[str, Any]]:
    idx = build_indexes(scenario_bundle)
    scenario_by_round = idx["scenario_by_round"]
    orders_by_id = idx["order_by_id"]
    optimal_by_scenario = idx["optimal_by_scenario"]
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in master_rows:
        grouped[str(row.get("participant_id", ""))].append(row)
    for rows in grouped.values():
        rows.sort(key=lambda row: int(row.get("round_index", 0) or 0))

    output = []
    for row in master_rows:
        scenario = scenario_by_round.get(int(row.get("round_index", 0) or 0), {})
        optimal = optimal_by_scenario.get(str(row.get("scenario_id", "")), {})
        candidates = _evaluate_candidate_bundles(
            scenario,
            optimal,
            orders_by_id,
            str(row.get("current_city", "")),
            cities_dataset,
            store_dataset,
        )
        participant_rows = grouped[str(row.get("participant_id", ""))]
        current_index = participant_rows.index(row)
        next_row = participant_rows[current_index + 1] if current_index + 1 < len(participant_rows) else None
        chosen_signature = _bundle_signature(row.get("chosen_orders"))
        for candidate in candidates:
            policy_row = {
                "dataset_root": row.get("dataset_root"),
                "participant_id": row.get("participant_id"),
                "round_index": row.get("round_index"),
                "state_decision_source": row.get("decision_source"),
                "state_decision_timestamp": row.get("decision_timestamp"),
                "state_timestamp_available": row.get("timestamp_available"),
                "state_round_coverage_status": row.get("round_coverage_status"),
                "state_qa_completed_game_mismatch": row.get("qa_completed_game_mismatch"),
                "state_qa_missing_recommendation_labels": row.get("qa_missing_recommendation_labels"),
                "phase": row.get("phase"),
                "classification": row.get("classification"),
                "scenario_id": row.get("scenario_id"),
                "state_current_city": row.get("current_city"),
                "state_phase_progress_index": row.get("phase_progress_index"),
                "state_prior_decisions_count": row.get("prior_decisions_count"),
                "state_prior_optimal_rate": row.get("prior_optimal_rate"),
                "state_prior_failure_rate": row.get("prior_failure_rate"),
                "state_prior_recommendation_compliance": row.get("prior_recommendation_compliance"),
                "state_prior_mean_bundle_size": row.get("prior_mean_bundle_size"),
                "state_prior_mean_regret": row.get("prior_mean_regret"),
                "state_prior_mean_score_ratio": row.get("prior_mean_score_ratio"),
                "state_prior_phase_score_ratio": row.get("prior_phase_score_ratio"),
                "action_bundle_ids": json.dumps(candidate["bundleIds"]),
                "action_bundle_size": candidate["bundleSize"],
                "action_score_ratio_to_best": candidate["scoreRatioToBest"],
                "action_percent_regret": candidate["percentRegret"],
                "action_score": candidate["score"],
                "action_modeled_time": candidate["modeledTime"],
                "action_earnings": candidate["earnings"],
                "action_is_optimal": candidate["isOptimal"],
                "action_is_near_optimal": candidate["isNearOptimal"],
                "action_matches_shown_recommendation": candidate["matchesShownRecommendation"],
                "action_recommendation_quality": candidate["recommendationQuality"],
                "observed_chosen_action": int(candidate["bundleSignature"] == chosen_signature),
                "observed_followed_recommendation": row.get("followed_recommendation"),
                "reward_target": candidate["scoreRatioToBest"],
                "observed_reward": row.get("score_ratio_to_best") if candidate["bundleSignature"] == chosen_signature else None,
                "next_round_index": next_row.get("round_index") if next_row else None,
                "next_phase": next_row.get("phase") if next_row else None,
                "next_current_city": next_row.get("current_city") if next_row else None,
                "next_prior_optimal_rate": next_row.get("prior_optimal_rate") if next_row else None,
                "next_prior_failure_rate": next_row.get("prior_failure_rate") if next_row else None,
                "next_prior_mean_regret": next_row.get("prior_mean_regret") if next_row else None,
                "done": int(next_row is None),
            }
            for field in extra_fields:
                if field in row:
                    policy_row[field] = row[field]
            output.append(policy_row)
    return output


def _build_recommendation_workbench(
    master_rows: list[dict[str, Any]],
    scenario_bundle: dict[str, Any],
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any], dict[str, Any]]:
    idx = build_indexes(scenario_bundle)
    scenario_by_round = idx["scenario_by_round"]
    orders_by_id = idx["order_by_id"]
    optimal_by_scenario = idx["optimal_by_scenario"]

    adoption_training = []
    outcome_training = []
    for row in master_rows:
        scenario = scenario_by_round.get(int(row.get("round_index", 0) or 0), {})
        optimal = optimal_by_scenario.get(str(row.get("scenario_id", "")), {})
        candidates = _evaluate_candidate_bundles(
            scenario,
            optimal,
            orders_by_id,
            str(row.get("current_city", "")),
            cities_dataset,
            store_dataset,
        )
        chosen_signature = _bundle_signature(row.get("chosen_orders"))
        chosen_candidate = next((candidate for candidate in candidates if candidate["bundleSignature"] == chosen_signature), None)
        if chosen_candidate:
            outcome_training.append({**_make_recommendation_feature_row(row, chosen_candidate), "target": float(row.get("score_ratio_to_best") or 0)})
        if row.get("shown_recommendation_status") == "shown":
            shown_candidate = next((candidate for candidate in candidates if candidate["matchesShownRecommendation"] == 1), None)
            if shown_candidate:
                adoption_training.append({**_make_recommendation_feature_row(row, shown_candidate), "target": float(row.get("followed_recommendation") or 0)})

    adoption_feature_keys = [
        "prior_optimal_rate",
        "prior_failure_rate",
        "prior_recommendation_compliance",
        "prior_mean_bundle_size",
        "phase_progress_index",
        "candidate_bundle_size_ratio",
        "candidate_score_ratio_to_best",
        "candidate_is_optimal",
    ]
    outcome_feature_keys = [
        "prior_optimal_rate",
        "prior_failure_rate",
        "prior_mean_regret",
        "prior_mean_score_ratio",
        "prior_phase_score_ratio",
        "candidate_bundle_size_ratio",
        "candidate_score_ratio_to_best",
        "candidate_is_optimal",
    ]
    adoption_model = _fit_linear_model(adoption_training, adoption_feature_keys, "target", min_rows=3)
    outcome_model = _fit_linear_model(
        outcome_training,
        outcome_feature_keys,
        "target",
        min_rows=4,
        default_value=_mean([row["target"] for row in outcome_training]) or 0.5,
    )
    label_map = {
        "prior_optimal_rate": "prior_optimal",
        "prior_failure_rate": "prior_failure",
        "prior_recommendation_compliance": "prior_follow",
        "prior_mean_bundle_size": "prior_bundle",
        "phase_progress_index": "phase_progress",
        "candidate_bundle_size_ratio": "bundle_ratio",
        "candidate_score_ratio_to_best": "candidate_ratio",
        "candidate_is_optimal": "candidate_optimal",
        "prior_mean_regret": "prior_regret",
        "prior_mean_score_ratio": "prior_score",
        "prior_phase_score_ratio": "phase_score",
    }

    rows = []
    for row in master_rows:
        scenario = scenario_by_round.get(int(row.get("round_index", 0) or 0), {})
        optimal = optimal_by_scenario.get(str(row.get("scenario_id", "")), {})
        candidates = _evaluate_candidate_bundles(
            scenario,
            optimal,
            orders_by_id,
            str(row.get("current_city", "")),
            cities_dataset,
            store_dataset,
        )
        baseline = _clamp(
            float(
                row.get("prior_phase_score_ratio")
                or row.get("prior_mean_score_ratio")
                or outcome_model.get("defaultValue", 0.5)
                or 0.5
            )
        )
        scored_candidates = []
        for candidate in candidates:
            feature_row = _make_recommendation_feature_row(row, candidate)
            adoption = _predict_linear_model(adoption_model, feature_row)
            outcome = _predict_linear_model(outcome_model, feature_row)
            expected = adoption * outcome + (1 - adoption) * baseline
            scored_candidates.append(
                {
                    **candidate,
                    "adoption": adoption,
                    "outcome": outcome,
                    "expected": expected,
                    "why": " || ".join(
                        [
                            _explain_linear_model(outcome_model, feature_row, label_map),
                            _explain_linear_model(adoption_model, feature_row, label_map),
                        ]
                    ),
                }
            )

        scored_candidates.sort(
            key=lambda candidate: (
                candidate.get("expected") if candidate.get("expected") is not None else float("-inf"),
                candidate.get("scoreRatioToBest") if candidate.get("scoreRatioToBest") is not None else float("-inf"),
                candidate.get("score") if candidate.get("score") is not None else float("-inf"),
            ),
            reverse=True,
        )
        recommended = scored_candidates[0] if scored_candidates else None
        rows.append(
            {
                "dataset_root": row.get("dataset_root"),
                "participant_id": row.get("participant_id"),
                "round_index": row.get("round_index"),
                "phase": row.get("phase"),
                "classification": row.get("classification"),
                "scenario_id": row.get("scenario_id"),
                "baseline_expected_score_ratio": baseline,
                "predicted_adoption_probability": recommended.get("adoption") if recommended else None,
                "predicted_outcome_score_ratio": recommended.get("outcome") if recommended else None,
                "predicted_expected_score_ratio": recommended.get("expected") if recommended else None,
                "predicted_lift_vs_baseline": (recommended.get("expected") - baseline) if recommended else None,
                "recommended_bundle_ids": json.dumps(recommended.get("bundleIds", [])) if recommended else json.dumps([]),
                "recommended_bundle_size": recommended.get("bundleSize") if recommended else None,
                "recommended_bundle_score_ratio_to_best": recommended.get("scoreRatioToBest") if recommended else None,
                "recommended_bundle_percent_regret": recommended.get("percentRegret") if recommended else None,
                "recommended_bundle_is_optimal": recommended.get("isOptimal") if recommended else None,
                "historical_chosen_bundle_ids": row.get("chosen_orders"),
                "historical_score_ratio_to_best": row.get("score_ratio_to_best"),
                "oracle_bundle_ids": row.get("best_bundle_ids"),
                "oracle_score_ratio_to_best": 1.0,
                "oracle_gap": (1 - recommended.get("scoreRatioToBest")) if recommended and recommended.get("scoreRatioToBest") is not None else None,
                "why_ranked_high": recommended.get("why", "no_candidate") if recommended else "no_candidate",
            }
        )

    def summarize(workbench_rows: list[dict[str, Any]], group_key: str | None = None) -> list[dict[str, Any]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        if group_key is None:
            grouped["overall"] = workbench_rows
        else:
            for row in workbench_rows:
                grouped[str(row.get(group_key, ""))].append(row)
        summary_rows = []
        for group_value, bucket in grouped.items():
            summary_rows.append(
                {
                    "scope": group_key or "overall",
                    "group_value": group_value,
                    "n_states": len(bucket),
                    "mean_baseline_expected_score_ratio": _mean([float(row["baseline_expected_score_ratio"]) for row in bucket if row.get("baseline_expected_score_ratio") is not None]),
                    "mean_predicted_adoption_probability": _mean([float(row["predicted_adoption_probability"]) for row in bucket if row.get("predicted_adoption_probability") is not None]),
                    "mean_predicted_outcome_score_ratio": _mean([float(row["predicted_outcome_score_ratio"]) for row in bucket if row.get("predicted_outcome_score_ratio") is not None]),
                    "mean_predicted_expected_score_ratio": _mean([float(row["predicted_expected_score_ratio"]) for row in bucket if row.get("predicted_expected_score_ratio") is not None]),
                    "mean_predicted_lift_vs_baseline": _mean([float(row["predicted_lift_vs_baseline"]) for row in bucket if row.get("predicted_lift_vs_baseline") is not None]),
                    "recommended_optimal_rate": _mean([float(row.get("recommended_bundle_is_optimal") or 0) for row in bucket]),
                    "recommended_mean_regret": _mean([float(row["recommended_bundle_percent_regret"]) for row in bucket if row.get("recommended_bundle_percent_regret") is not None]),
                    "historical_mean_score_ratio": _mean([float(row["historical_score_ratio_to_best"]) for row in bucket if row.get("historical_score_ratio_to_best") is not None]),
                    "oracle_mean_score_ratio": _mean([float(row["oracle_score_ratio_to_best"]) for row in bucket if row.get("oracle_score_ratio_to_best") is not None]),
                }
            )
        return summary_rows

    summary_rows = summarize(rows) + summarize(rows, "phase") + summarize(rows, "classification")
    return rows, summary_rows, adoption_model, outcome_model


def _stable_hash_string(value: Any) -> int:
    hash_value = 2166136261
    for char in str(value or ""):
        hash_value ^= ord(char)
        hash_value = (hash_value * 16777619) & 0xFFFFFFFF
    return hash_value


def _get_snapshot_split(participant_id: Any) -> str:
    ratio = (_stable_hash_string(participant_id) % 1000) / 1000.0
    if ratio < 0.7:
        return "train"
    if ratio < 0.85:
        return "validation"
    return "test"


def _build_split_manifest(master_rows: list[dict[str, Any]]) -> dict[str, Any]:
    splits = {
        "train": {"participant_ids": set(), "row_count": 0},
        "validation": {"participant_ids": set(), "row_count": 0},
        "test": {"participant_ids": set(), "row_count": 0},
    }

    for row in master_rows:
        participant_id = str(row.get("participant_id", "")).strip()
        if not participant_id:
            continue
        split = _get_snapshot_split(participant_id)
        splits[split]["participant_ids"].add(participant_id)
        splits[split]["row_count"] += 1

    return {
        "method": "stable_hash_participant_id",
        "train": {
            "participant_count": len(splits["train"]["participant_ids"]),
            "row_count": splits["train"]["row_count"],
        },
        "validation": {
            "participant_count": len(splits["validation"]["participant_ids"]),
            "row_count": splits["validation"]["row_count"],
        },
        "test": {
            "participant_count": len(splits["test"]["participant_ids"]),
            "row_count": splits["test"]["row_count"],
        },
    }


def _softmax(values: list[float]) -> list[float]:
    if not values:
        return []
    safe_values = [float(value) if value is not None else 0.0 for value in values]
    max_value = max(safe_values)
    exps = [math.exp(max(-20.0, min(20.0, value - max_value))) for value in safe_values]
    denom = sum(exps)
    if denom <= 0:
        return [1.0 / len(safe_values) for _ in safe_values]
    return [value / denom for value in exps]


def _make_policy_model_feature_row(row: dict[str, Any]) -> dict[str, float]:
    return {
        "prior_optimal_rate": float(row.get("state_prior_optimal_rate") or row.get("prior_optimal_rate") or 0),
        "prior_failure_rate": float(row.get("state_prior_failure_rate") or row.get("prior_failure_rate") or 0),
        "prior_recommendation_compliance": float(
            row.get("state_prior_recommendation_compliance")
            or row.get("prior_recommendation_compliance")
            or 0
        ),
        "prior_mean_bundle_size": float(
            row.get("state_prior_mean_bundle_size") or row.get("prior_mean_bundle_size") or 0
        ),
        "prior_mean_regret": float(row.get("state_prior_mean_regret") or row.get("prior_mean_regret") or 0),
        "prior_mean_score_ratio": float(
            row.get("state_prior_mean_score_ratio") or row.get("prior_mean_score_ratio") or 0
        ),
        "prior_phase_score_ratio": float(
            row.get("state_prior_phase_score_ratio") or row.get("prior_phase_score_ratio") or 0
        ),
        "phase_progress_index": float(
            row.get("state_phase_progress_index") or row.get("phase_progress_index") or 0
        ),
        "action_bundle_size": float(row.get("action_bundle_size") or row.get("bundle_size") or 0),
        "action_score_ratio_to_best": float(
            row.get("action_score_ratio_to_best") or row.get("score_ratio_to_best") or 0
        ),
        "action_percent_regret": float(
            row.get("action_percent_regret") or row.get("percent_regret") or 0
        ),
        "action_is_optimal": float(row.get("action_is_optimal") or row.get("is_exact_optimal") or 0),
        "action_is_near_optimal": float(
            row.get("action_is_near_optimal") or row.get("is_near_optimal") or 0
        ),
    }


def _sort_metric(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    return float("-inf")


def _choose_top_candidate(
    candidates: list[dict[str, Any]],
    score_accessor,
) -> dict[str, Any] | None:
    if not candidates:
        return None
    return sorted(
        candidates,
        key=lambda row: (
            _sort_metric(score_accessor(row)),
            _sort_metric(row.get("action_score_ratio_to_best")),
            _sort_metric(row.get("action_score")),
        ),
        reverse=True,
    )[0]


def _summarize_policy_rows(
    rows: list[dict[str, Any]],
    group_key: str | None = None,
) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        policy_name = str(row.get("policy_name", ""))
        group_value = str(row.get(group_key, "unknown")) if group_key else "overall"
        grouped[(policy_name, group_value)].append(row)

    output = []
    for (policy_name, group_value), bucket in grouped.items():
        output.append(
            {
                "policy_name": policy_name,
                "scope": group_key or "overall",
                "group_value": group_value,
                "n_states": len(bucket),
                "mean_reward": _mean(
                    [float(row["policy_expected_reward"]) for row in bucket if row.get("policy_expected_reward") is not None]
                ),
                "mean_regret": _mean(
                    [float(row["policy_regret"]) for row in bucket if row.get("policy_regret") is not None]
                ),
                "optimal_rate": _mean([float(row.get("policy_is_optimal") or 0) for row in bucket]),
                "mean_bundle_size": _mean(
                    [float(row["policy_bundle_size"]) for row in bucket if row.get("policy_bundle_size") is not None]
                ),
                "mean_lift_vs_historical": _mean(
                    [float(row["lift_vs_historical"]) for row in bucket if row.get("lift_vs_historical") is not None]
                ),
            }
        )

    return output


def _summarize_ope_rows(
    rows: list[dict[str, Any]],
    group_key: str | None = None,
) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        policy_name = str(row.get("policy_name", ""))
        group_value = str(row.get(group_key, "unknown")) if group_key else "overall"
        grouped[(policy_name, group_value)].append(row)

    output = []
    for (policy_name, group_value), bucket in grouped.items():
        n_states = len(bucket)
        weighted_rewards = []
        weights = []
        dr_values = []
        for row in bucket:
            propensity = max(1e-6, float(row.get("target_behavior_propensity") or 0))
            observed_reward = float(row.get("historical_reward") or 0)
            matched = int(row.get("match_logged_action") or 0)
            weighted_rewards.append((observed_reward / propensity) if matched else 0.0)
            weights.append((1.0 / propensity) if matched else 0.0)
            target_pred = float(row.get("policy_reward_prediction") or 0)
            logged_pred = float(row.get("historical_reward_prediction") or 0)
            dr_values.append(target_pred + (((observed_reward - logged_pred) / propensity) if matched else 0.0))

        output.append(
            {
                "policy_name": policy_name,
                "scope": group_key or "overall",
                "group_value": group_value,
                "n_states": n_states,
                "ips": (sum(weighted_rewards) / n_states) if n_states else None,
                "snips": (sum(weighted_rewards) / sum(weights)) if sum(weights) > 0 else None,
                "direct_method": _mean(
                    [float(row["policy_reward_prediction"]) for row in bucket if row.get("policy_reward_prediction") is not None]
                ),
                "doubly_robust": _mean(dr_values),
                "fqe_one_step": _mean(
                    [float(row["policy_reward_prediction"]) for row in bucket if row.get("policy_reward_prediction") is not None]
                ),
                "match_rate": _mean([float(row.get("match_logged_action") or 0) for row in bucket]),
                "mean_target_propensity": _mean(
                    [float(row["target_behavior_propensity"]) for row in bucket if row.get("target_behavior_propensity") is not None]
                ),
            }
        )

    return output


def _build_sandbox_summary_rows(
    rows: list[dict[str, Any]],
    *,
    iterations: int = 300,
    seed: int = DEFAULT_RANDOM_SEED,
) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get("policy_name", ""))].append(row)

    output = []
    for index, (policy_name, bucket) in enumerate(grouped.items()):
        rewards = [float(row["policy_expected_reward"]) for row in bucket if row.get("policy_expected_reward") is not None]
        gaps = [float(row["lift_vs_historical"]) for row in bucket if row.get("lift_vs_historical") is not None]
        ci_low, ci_high = bootstrap_ci(
            rewards,
            statistic="mean",
            b=max(50, int(iterations or 300)),
            seed=int(seed or DEFAULT_RANDOM_SEED) + index,
        )
        output.append(
            {
                "policy_name": policy_name,
                "simulation_label": "bootstrap_expected_reward",
                "n_states": len(bucket),
                "iterations": max(50, int(iterations or 300)),
                "seed": int(seed or DEFAULT_RANDOM_SEED),
                "mean_simulated_reward": _mean(rewards),
                "simulated_reward_ci_low": ci_low,
                "simulated_reward_ci_high": ci_high,
                "mean_gap_vs_historical": _mean(gaps),
            }
        )
    return output


def _build_policy_evaluation_suite(
    policy_training_rows: list[dict[str, Any]],
    recommendation_workbench_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    if not policy_training_rows:
        return {
            "behaviorModel": {},
            "rewardModel": {},
            "policyStateRows": [],
            "policyComparisons": [],
            "opeSummary": [],
            "sandboxSummary": [],
        }

    behavior_feature_keys = [
        "prior_optimal_rate",
        "prior_failure_rate",
        "prior_recommendation_compliance",
        "prior_mean_bundle_size",
        "prior_mean_regret",
        "phase_progress_index",
        "action_bundle_size",
        "action_score_ratio_to_best",
        "action_is_optimal",
    ]
    reward_feature_keys = [
        "prior_optimal_rate",
        "prior_failure_rate",
        "prior_mean_regret",
        "prior_mean_score_ratio",
        "prior_phase_score_ratio",
        "phase_progress_index",
        "action_bundle_size",
        "action_score_ratio_to_best",
        "action_percent_regret",
        "action_is_optimal",
    ]

    behavior_training_rows = [
        {**_make_policy_model_feature_row(row), "target": float(row.get("observed_chosen_action") or 0)}
        for row in policy_training_rows
    ]
    reward_training_rows = [
        {**_make_policy_model_feature_row(row), "target": float(row.get("reward_target") or 0)}
        for row in policy_training_rows
        if row.get("reward_target") is not None
    ]

    behavior_model = _fit_linear_model(
        behavior_training_rows,
        behavior_feature_keys,
        "target",
        default_value=0.2,
        clip_range=(0.001, 1.0),
        min_rows=8,
    )
    reward_model = _fit_linear_model(
        reward_training_rows,
        reward_feature_keys,
        "target",
        default_value=_mean([float(row["target"]) for row in reward_training_rows]) or 0.5,
        clip_range=(0.0, 1.0),
        min_rows=8,
    )

    grouped: dict[tuple[str, int], list[dict[str, Any]]] = defaultdict(list)
    for row in policy_training_rows:
        grouped[(str(row.get("participant_id", "")), int(row.get("round_index", 0) or 0))].append(row)

    recommendation_map = {
        (str(row.get("participant_id", "")), int(row.get("round_index", 0) or 0)): row
        for row in recommendation_workbench_rows
    }

    policy_state_rows = []
    for state_key, rows in grouped.items():
        enriched = []
        for row in rows:
            feature_row = _make_policy_model_feature_row(row)
            enriched.append(
                {
                    **row,
                    "__featureRow": feature_row,
                    "__behaviorScore": _predict_linear_model(behavior_model, feature_row),
                    "__rewardScore": _predict_linear_model(reward_model, feature_row),
                }
            )

        probabilities = _softmax([float(row.get("__behaviorScore") or 0) * 5 for row in enriched])
        for index, probability in enumerate(probabilities):
            enriched[index]["estimated_behavior_probability"] = probability

        historical = next((row for row in enriched if int(row.get("observed_chosen_action") or 0) == 1), None)
        if historical is None:
            historical = _choose_top_candidate(enriched, lambda row: row.get("estimated_behavior_probability"))
        oracle = _choose_top_candidate(enriched, lambda row: row.get("action_score_ratio_to_best"))
        reward_policy = _choose_top_candidate(enriched, lambda row: row.get("__rewardScore"))
        behavior_clone = _choose_top_candidate(enriched, lambda row: row.get("__behaviorScore"))
        workbench_row = recommendation_map.get(state_key)
        contextual_bandit = next(
            (
                row
                for row in enriched
                if _bundle_signature(row.get("action_bundle_ids"))
                == _bundle_signature(workbench_row.get("recommended_bundle_ids") if workbench_row else [])
            ),
            None,
        ) or reward_policy

        policy_choices = [
            ("historical_human", historical, historical.get("observed_reward") if historical else None),
            ("behavior_clone", behavior_clone, behavior_clone.get("reward_target") if behavior_clone else None),
            ("reward_model", reward_policy, reward_policy.get("reward_target") if reward_policy else None),
            (
                "contextual_bandit",
                contextual_bandit,
                (
                    workbench_row.get("predicted_expected_score_ratio")
                    if workbench_row and workbench_row.get("predicted_expected_score_ratio") is not None
                    else (contextual_bandit.get("reward_target") if contextual_bandit else None)
                ),
            ),
            ("oracle_optimal", oracle, oracle.get("reward_target") if oracle else None),
        ]

        historical_reward = (
            float(historical.get("observed_reward"))
            if historical and historical.get("observed_reward") is not None
            else (float(historical.get("reward_target")) if historical and historical.get("reward_target") is not None else None)
        )
        historical_reward_prediction = (
            _predict_linear_model(reward_model, historical["__featureRow"]) if historical else None
        )

        for policy_name, selected_row, expected_reward in policy_choices:
            if not selected_row:
                continue
            selected_expected_reward = (
                float(expected_reward) if expected_reward is not None else selected_row.get("reward_target")
            )
            policy_state_rows.append(
                {
                    "policy_name": policy_name,
                    "participant_id": selected_row.get("participant_id"),
                    "round_index": selected_row.get("round_index"),
                    "phase": selected_row.get("phase"),
                    "classification": selected_row.get("classification"),
                    "scenario_id": selected_row.get("scenario_id"),
                    "policy_bundle_ids": selected_row.get("action_bundle_ids"),
                    "policy_bundle_size": selected_row.get("action_bundle_size"),
                    "policy_reward": selected_row.get("reward_target"),
                    "policy_expected_reward": selected_expected_reward,
                    "policy_regret": selected_row.get("action_percent_regret"),
                    "policy_is_optimal": selected_row.get("action_is_optimal"),
                    "lift_vs_historical": (
                        selected_expected_reward - historical_reward
                        if selected_expected_reward is not None and historical_reward is not None
                        else None
                    ),
                    "historical_bundle_ids": historical.get("action_bundle_ids") if historical else [],
                    "historical_reward": historical_reward,
                    "historical_reward_prediction": historical_reward_prediction,
                    "policy_reward_prediction": _predict_linear_model(reward_model, selected_row["__featureRow"]),
                    "target_behavior_propensity": selected_row.get("estimated_behavior_probability"),
                    "match_logged_action": int(
                        _bundle_signature(selected_row.get("action_bundle_ids"))
                        == _bundle_signature(historical.get("action_bundle_ids") if historical else [])
                    ),
                }
            )

    return {
        "behaviorModel": behavior_model,
        "rewardModel": reward_model,
        "policyStateRows": policy_state_rows,
        "policyComparisons": (
            _summarize_policy_rows(policy_state_rows)
            + _summarize_policy_rows(policy_state_rows, "phase")
            + _summarize_policy_rows(policy_state_rows, "classification")
        ),
        "opeSummary": _summarize_ope_rows(policy_state_rows) + _summarize_ope_rows(policy_state_rows, "classification"),
        "sandboxSummary": _build_sandbox_summary_rows(policy_state_rows),
    }


def _build_dataset_snapshot(
    analysis_master_rows: list[dict[str, Any]],
    policy_training_rows: list[dict[str, Any]],
    qa_issues: list[dict[str, Any]],
    data_health: dict[str, Any],
    dataset_root: str,
    scenario_bundle: dict[str, Any],
) -> dict[str, Any]:
    issue_type_counts: dict[str, int] = defaultdict(int)
    for issue in qa_issues:
        issue_type_counts[str(issue.get("issue_type", "unknown"))] += 1

    blockers = []
    if any(int(row.get("qa_missing_recommendation_labels") or 0) == 1 for row in analysis_master_rows):
        blockers.append("missing_recommendation_labels")
    if any(int(row.get("qa_completed_game_mismatch") or 0) == 1 for row in analysis_master_rows):
        blockers.append("completed_game_mismatch")
    if not any(int(row.get("timestamp_available") or 0) == 1 for row in analysis_master_rows):
        blockers.append("missing_timestamps")

    version_id = str((scenario_bundle.get("metadata", {}) or {}).get("scenarioSetVersionId") or "").strip() or None
    snapshot_core = f"{dataset_root}:{version_id or 'no_version'}:{RESEARCH_FEATURE_VERSION}"

    return {
        "schema_version": DATASET_SNAPSHOT_SCHEMA_VERSION,
        "snapshot_id": f"{str(dataset_root or 'dataset').strip() or 'dataset'}_{_stable_hash_string(snapshot_core)}",
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "dataset_root": dataset_root,
        "dataset_version": version_id,
        "feature_version": RESEARCH_FEATURE_VERSION,
        "benchmark_only_dataset": int("missing_recommendation_labels" in blockers),
        "split_manifest": _build_split_manifest(analysis_master_rows),
        "qa_report": {
            "paper_ready": len(blockers) == 0,
            "blockers": blockers,
            "blocker_count": len(blockers),
            "warning_count": len([issue for issue in qa_issues if str(issue.get("severity", "")) == "warning"]),
            "issue_type_counts": dict(issue_type_counts),
        },
        "analysis_outputs": {
            "analysis_master_rows": len(analysis_master_rows),
            "policy_training_rows": len(policy_training_rows),
            "row_source_counts": data_health.get("rowSourceCounts", {}),
            "timestamped_rows": data_health.get("timestampedDecisionRows", 0),
            "reconstructed_rows": data_health.get("reconstructedDecisionRows", 0),
        },
    }


def run_pipeline(args: argparse.Namespace) -> dict[str, Any]:
    if args.source == "json":
        payload = load_from_json(args.data_json, args.scenario_bundle_json)
    else:
        payload = load_from_firestore(args.dataset_root)

    scenario_bundle = asdict(payload.scenario_bundle)
    cities_dataset = _read_optional_json(args.cities_json)
    store_dataset = _read_optional_json(args.stores_json)
    metadata_rows = _read_optional_rows(args.metadata_file)
    (
        merged_participants,
        metadata_fields,
        metadata_join_summary,
        metadata_join_issues,
    ) = _merge_participant_metadata(
        payload.participants,
        metadata_rows,
        metadata_join_key=args.metadata_join_key,
        participant_join_key=args.participant_join_key,
        metadata_session_key=args.metadata_session_key or "",
        participant_session_key=args.participant_session_key,
    )

    fact_rows, qa_issues = build_decision_fact(
        participants=merged_participants,
        scenario_bundle=scenario_bundle,
        dataset_root=args.dataset_root,
        cities_dataset=cities_dataset,
        store_dataset=store_dataset,
    )
    qa_issues.extend(metadata_join_issues)

    _attach_cohort(fact_rows, merged_participants, args.cohort_col)

    extra_fields = _append_unique_columns(metadata_fields, [args.cohort_col] if args.cohort_col else [])
    analysis_master_rows, research_issues = _build_analysis_master_rows(
        fact_rows,
        merged_participants,
        scenario_bundle,
        cities_dataset,
        store_dataset,
        extra_fields,
    )
    qa_issues.extend(research_issues)
    policy_training_rows = _build_policy_training_rows(
        analysis_master_rows,
        scenario_bundle,
        cities_dataset,
        store_dataset,
        extra_fields,
    )
    recommendation_rows, recommendation_summary, adoption_model, outcome_model = _build_recommendation_workbench(
        analysis_master_rows,
        scenario_bundle,
        cities_dataset,
        store_dataset,
    )
    policy_evaluation = _build_policy_evaluation_suite(
        policy_training_rows,
        recommendation_rows,
    )
    behavior_by_phase = _build_behavior_summary_rows(analysis_master_rows, "phase")
    behavior_by_recommendation_quality = _build_behavior_summary_rows(
        analysis_master_rows,
        "recommendation_quality",
    )
    participant_trajectories = _build_participant_trajectory_rows(analysis_master_rows)
    trajectory_segments = _summarize_trajectory_segments(participant_trajectories)
    trajectory_lookup = {
        row["participant_id"]: row["trajectory_segment"] for row in participant_trajectories
    }
    behavior_by_trajectory_segment = _build_behavior_summary_rows(
        [
            {**row, "trajectory_segment": trajectory_lookup.get(str(row.get("participant_id", "")), "mixed")}
            for row in analysis_master_rows
        ],
        "trajectory_segment",
    )
    transfer_summary = _build_transfer_summary(analysis_master_rows)

    overall = _build_kpi_rows(analysis_master_rows, None, args.bootstrap_b, args.seed)
    by_round = _build_kpi_rows(analysis_master_rows, "round_index", args.bootstrap_b, args.seed)
    by_participant = _build_kpi_rows(analysis_master_rows, "participant_id", args.bootstrap_b, args.seed)
    by_classification = _build_kpi_rows(analysis_master_rows, "classification", args.bootstrap_b, args.seed)
    by_scenario = _build_kpi_rows(analysis_master_rows, "scenario_id", args.bootstrap_b, args.seed)
    timing_overall = _build_timing_kpi_rows(analysis_master_rows, None)
    timing_by_round = _build_timing_kpi_rows(analysis_master_rows, "round_index")
    timing_by_classification = _build_timing_kpi_rows(analysis_master_rows, "classification")
    data_health = _build_data_health(merged_participants, fact_rows, scenario_bundle)
    dataset_snapshot = _build_dataset_snapshot(
        analysis_master_rows,
        policy_training_rows,
        qa_issues,
        data_health,
        args.dataset_root,
        scenario_bundle,
    )

    cohort_comparisons = []
    if args.cohort_col:
        cohort_comparisons = _build_cohort_comparisons(
            analysis_master_rows,
            cohort_col=args.cohort_col,
            bootstrap_b=args.bootstrap_b,
            seed=args.seed,
        )

    out_dir = Path(args.out_dir)
    _write_csv(
        out_dir / "decision_fact.csv",
        fact_rows,
        fieldnames=get_decision_fact_export_columns(args.cohort_col),
    )
    _write_csv(
        out_dir / "analysis_master.csv",
        analysis_master_rows,
        fieldnames=_append_unique_columns(ANALYSIS_MASTER_EXPORT_COLUMNS, extra_fields),
    )
    _write_json(out_dir / "analysis_master.json", {"rows": analysis_master_rows})
    _write_csv(
        out_dir / "policy_training.csv",
        policy_training_rows,
        fieldnames=_append_unique_columns(POLICY_TRAINING_EXPORT_COLUMNS, extra_fields),
    )
    _write_csv(
        out_dir / "recommendation_workbench.csv",
        recommendation_rows,
        fieldnames=RECOMMENDATION_WORKBENCH_EXPORT_COLUMNS,
    )
    _write_csv(
        out_dir / "recommendation_summary.csv",
        recommendation_summary,
        fieldnames=RECOMMENDATION_SUMMARY_EXPORT_COLUMNS,
    )
    _write_csv(
        out_dir / "policy_comparison.csv",
        policy_evaluation["policyComparisons"],
        fieldnames=POLICY_COMPARISON_EXPORT_COLUMNS,
    )
    _write_csv(
        out_dir / "ope_summary.csv",
        policy_evaluation["opeSummary"],
        fieldnames=OPE_SUMMARY_EXPORT_COLUMNS,
    )
    _write_csv(
        out_dir / "sandbox_summary.csv",
        policy_evaluation["sandboxSummary"],
        fieldnames=SANDBOX_SUMMARY_EXPORT_COLUMNS,
    )
    _write_json(out_dir / "dataset_snapshot.json", dataset_snapshot)
    _write_csv(out_dir / "kpi_overall.csv", overall)
    _write_csv(out_dir / "kpi_by_round.csv", by_round)
    _write_csv(out_dir / "kpi_by_participant.csv", by_participant)
    _write_csv(out_dir / "kpi_by_classification.csv", by_classification)
    _write_csv(out_dir / "kpi_by_scenario.csv", by_scenario)
    _write_csv(out_dir / "kpi_timing_overall.csv", timing_overall)
    _write_csv(out_dir / "kpi_timing_by_round.csv", timing_by_round)
    _write_csv(out_dir / "kpi_timing_by_classification.csv", timing_by_classification)
    _write_csv(out_dir / "behavior_by_phase.csv", behavior_by_phase)
    _write_csv(
        out_dir / "behavior_by_recommendation_quality.csv",
        behavior_by_recommendation_quality,
    )
    _write_csv(out_dir / "behavior_by_trajectory_segment.csv", behavior_by_trajectory_segment)
    _write_csv(out_dir / "participant_trajectories.csv", participant_trajectories)
    _write_csv(out_dir / "trajectory_segments.csv", trajectory_segments)
    _write_csv(out_dir / "qa_issues.csv", qa_issues)
    if args.cohort_col:
        _write_csv(out_dir / "cohort_comparisons.csv", cohort_comparisons)

    metadata = {
        "source": args.source,
        "dataset_root": args.dataset_root,
        "feature_version": RESEARCH_FEATURE_VERSION,
        "bootstrap_b": args.bootstrap_b,
        "seed": args.seed,
        "cohort_col": args.cohort_col,
        "data_health": data_health,
        "metadata_join": metadata_join_summary,
        "transfer_summary": transfer_summary,
        "models": {
            "adoption_training_rows": adoption_model.get("trainingRows", 0),
            "outcome_training_rows": outcome_model.get("trainingRows", 0),
            "behavior_policy_training_rows": policy_evaluation["behaviorModel"].get("trainingRows", 0),
            "reward_policy_training_rows": policy_evaluation["rewardModel"].get("trainingRows", 0),
        },
        "input_counts": {
            "participants": len(merged_participants),
            "scenarios": len(scenario_bundle.get("scenarios", [])),
            "orders": len(scenario_bundle.get("orders", [])),
            "optimal": len(scenario_bundle.get("optimal", [])),
            "decisions": len(fact_rows),
            "analysis_master_rows": len(analysis_master_rows),
            "policy_training_rows": len(policy_training_rows),
            "recommendation_workbench_rows": len(recommendation_rows),
            "qa_issues": len(qa_issues),
        },
        "snapshot_id": dataset_snapshot["snapshot_id"],
        "paper_ready": dataset_snapshot["qa_report"]["paper_ready"],
    }
    _write_json(out_dir / "run_metadata.json", metadata)

    return metadata


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Analytics v1 pipeline")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run = subparsers.add_parser("run", help="Run full analytics pipeline")
    run.add_argument("--source", choices=["json", "firestore"], required=True)
    run.add_argument("--dataset-root", required=True)
    run.add_argument("--out-dir", required=True)
    run.add_argument("--data-json", help="Path to downloader-export JSON (required when --source json)")
    run.add_argument("--scenario-bundle-json", help="Path to grouped scenario bundle JSON for json source")
    run.add_argument("--stores-json", help="Optional store dataset JSON for modeled-time parity")
    run.add_argument("--cities-json", help="Optional cities dataset JSON for modeled-time parity")
    run.add_argument("--metadata-file", help="Optional metadata CSV/JSON joined onto participants")
    run.add_argument("--metadata-join-key", default="participant_id", help="Metadata field matched to participant id")
    run.add_argument("--participant-join-key", default="id", help="Participant field matched to metadata join key")
    run.add_argument("--metadata-session-key", help="Optional metadata fallback field used only when explicitly provided")
    run.add_argument("--participant-session-key", default="liveSessionId", help="Participant session field used for optional fallback joins")
    run.add_argument("--bootstrap-b", type=int, default=DEFAULT_BOOTSTRAP_B)
    run.add_argument("--seed", type=int, default=DEFAULT_RANDOM_SEED)
    run.add_argument("--cohort-col", help="Participant field used for cohort comparisons")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "run":
        if args.source == "json" and not args.data_json:
            parser.error("--data-json is required when --source json")

        metadata = run_pipeline(args)
        print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
