"""CLI entrypoint for analytics v1 pipeline."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import asdict
from itertools import combinations
from pathlib import Path
from typing import Any

from analytics.config import DEFAULT_BOOTSTRAP_B, DEFAULT_RANDOM_SEED
from analytics.io.firestore_adapter import load_from_firestore
from analytics.io.json_adapter import load_from_json
from analytics.pipeline.decision_fact import build_decision_fact
from analytics.stats.comparisons import bootstrap_diff_median_ci, two_proportion_z_test
from analytics.stats.intervals import bootstrap_ci, wilson_interval
from analytics.stats.point_estimates import summarize_continuous, summarize_rate


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


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames = sorted({k for row in rows for k in row.keys()})
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def _collect_continuous(rows: list[dict[str, Any]], key: str) -> list[float]:
    out = []
    for row in rows:
        if int(row.get("is_failure", 0)) == 1:
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


def run_pipeline(args: argparse.Namespace) -> dict[str, Any]:
    if args.source == "json":
        payload = load_from_json(args.data_json, args.scenario_bundle_json)
    else:
        payload = load_from_firestore(args.dataset_root)

    scenario_bundle = asdict(payload.scenario_bundle)
    cities_dataset = _read_optional_json(args.cities_json)
    store_dataset = _read_optional_json(args.stores_json)

    fact_rows, qa_issues = build_decision_fact(
        participants=payload.participants,
        scenario_bundle=scenario_bundle,
        dataset_root=args.dataset_root,
        cities_dataset=cities_dataset,
        store_dataset=store_dataset,
    )

    _attach_cohort(fact_rows, payload.participants, args.cohort_col)

    overall = _build_kpi_rows(fact_rows, None, args.bootstrap_b, args.seed)
    by_round = _build_kpi_rows(fact_rows, "round_index", args.bootstrap_b, args.seed)
    by_participant = _build_kpi_rows(fact_rows, "participant_id", args.bootstrap_b, args.seed)
    by_classification = _build_kpi_rows(fact_rows, "classification", args.bootstrap_b, args.seed)
    by_scenario = _build_kpi_rows(fact_rows, "scenario_id", args.bootstrap_b, args.seed)

    cohort_comparisons = []
    if args.cohort_col:
        cohort_comparisons = _build_cohort_comparisons(
            fact_rows,
            cohort_col=args.cohort_col,
            bootstrap_b=args.bootstrap_b,
            seed=args.seed,
        )

    out_dir = Path(args.out_dir)
    _write_csv(out_dir / "decision_fact.csv", fact_rows)
    _write_csv(out_dir / "kpi_overall.csv", overall)
    _write_csv(out_dir / "kpi_by_round.csv", by_round)
    _write_csv(out_dir / "kpi_by_participant.csv", by_participant)
    _write_csv(out_dir / "kpi_by_classification.csv", by_classification)
    _write_csv(out_dir / "kpi_by_scenario.csv", by_scenario)
    _write_csv(out_dir / "qa_issues.csv", qa_issues)
    if args.cohort_col:
        _write_csv(out_dir / "cohort_comparisons.csv", cohort_comparisons)

    metadata = {
        "source": args.source,
        "dataset_root": args.dataset_root,
        "bootstrap_b": args.bootstrap_b,
        "seed": args.seed,
        "cohort_col": args.cohort_col,
        "input_counts": {
            "participants": len(payload.participants),
            "scenarios": len(scenario_bundle.get("scenarios", [])),
            "orders": len(scenario_bundle.get("orders", [])),
            "optimal": len(scenario_bundle.get("optimal", [])),
            "decisions": len(fact_rows),
            "qa_issues": len(qa_issues),
        },
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
