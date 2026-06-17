#!/usr/bin/env python3
"""Generate BundleGame paper figures, tables, and an output manifest.

The script intentionally uses only the Python standard library. Figures are
written as SVG so a clean reviewer machine does not need matplotlib.
"""

import argparse
import csv
import html
import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path


PHASE_ORDER = ["A", "B", "C"]
REQUIRED_OUTPUTS = [
    "figures/participant_completion_dropoff.svg",
    "figures/phase_decision_quality.svg",
    "figures/recommendation_adoption.svg",
    "tables/completion_by_round.csv",
    "tables/phase_decision_quality.csv",
    "tables/recommendation_adoption.csv",
    "tables/ope_comparison.csv",
    "tables/ablation_summary.csv",
    "tables/model_registry_snapshot_manifest.csv",
    "output_manifest.json",
]


def read_csv(path):
    path = Path(path)
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def read_json(path, default=None):
    path = Path(path)
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_csv(path, rows, columns):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow({column: row.get(column, "") for column in columns})


def write_markdown(path, rows, columns):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join(["---"] * len(columns)) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(format_cell(row.get(column, "")) for column in columns) + " |")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def format_cell(value):
    if value is None:
        return ""
    if isinstance(value, float):
        return format_number(value)
    return str(value).replace("|", "\\|")


def parse_float(value):
    if value is None:
        return None
    text = str(value).strip()
    if text == "":
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if not math.isfinite(number):
        return None
    return number


def parse_int(value):
    number = parse_float(value)
    return int(number) if number is not None else None


def parse_bool_number(value):
    if isinstance(value, bool):
        return 1.0 if value else 0.0
    text = str(value or "").strip().lower()
    if text in {"true", "yes", "y"}:
        return 1.0
    if text in {"false", "no", "n"}:
        return 0.0
    number = parse_float(value)
    if number is None:
        return None
    return 1.0 if number > 0 else 0.0


def first_value(row, names, default=""):
    for name in names:
        value = row.get(name)
        if value not in (None, ""):
            return value
    return default


def metric_value(row, names):
    for name in names:
        value = parse_float(row.get(name))
        if value is not None:
            return value
    return None


def mean(values):
    values = [value for value in values if value is not None]
    return sum(values) / len(values) if values else None


def median(values):
    values = [value for value in values if value is not None]
    return statistics.median(values) if values else None


def safe_rate(numerator, denominator):
    return numerator / denominator if denominator else None


def format_number(value, digits=3):
    if value in (None, ""):
        return ""
    number = parse_float(value)
    if number is None:
        return str(value)
    return f"{number:.{digits}f}".rstrip("0").rstrip(".")


def escape(value):
    return html.escape(str(value), quote=True)


def load_analysis_rows(analysis_dir, publication_dir):
    analysis_rows = read_csv(Path(analysis_dir) / "analysis_master.csv") if analysis_dir else []
    if analysis_rows:
        return analysis_rows, "analysis_master.csv"
    publication_rows = read_csv(Path(publication_dir) / "per_round_decisions.csv") if publication_dir else []
    return publication_rows, "publication per_round_decisions.csv" if publication_rows else ""


def load_participant_summary(analysis_rows, publication_dir):
    publication_summary = read_csv(Path(publication_dir) / "participant_summary.csv") if publication_dir else []
    if publication_summary:
        return publication_summary
    by_participant = {}
    for row in analysis_rows:
        participant_id = first_value(row, ["publication_participant_id", "participant_id"], "")
        round_index = parse_int(row.get("round_index")) or 0
        if not participant_id:
            continue
        entry = by_participant.setdefault(
            participant_id,
            {
                "publication_participant_id": participant_id,
                "rounds_completed": 0,
                "total_rounds": 0,
            },
        )
        entry["rounds_completed"] = max(entry["rounds_completed"], round_index)
        entry["total_rounds"] = max(entry["total_rounds"], round_index)
    return list(by_participant.values())


def participant_key(row):
    return first_value(row, ["publication_participant_id", "participant_id"], "")


def build_completion_rows(participant_rows, analysis_rows):
    if participant_rows:
        max_round = max([parse_int(row.get("total_rounds")) or 0 for row in participant_rows] + [0])
        max_round = max(max_round, max([parse_int(row.get("rounds_completed")) or 0 for row in participant_rows] + [0]))
        max_round = max_round or max([parse_int(row.get("round_index")) or 0 for row in analysis_rows] + [0])
        output = []
        for round_index in range(1, max_round + 1):
            remaining = sum((parse_int(row.get("rounds_completed")) or 0) >= round_index for row in participant_rows)
            output.append(
                {
                    "round_index": round_index,
                    "participants_remaining": remaining,
                    "decision_rows": sum((parse_int(row.get("round_index")) or 0) == round_index for row in analysis_rows),
                }
            )
        return output

    max_round_by_participant = {}
    for row in analysis_rows:
        key = participant_key(row)
        round_index = parse_int(row.get("round_index")) or 0
        if key:
            max_round_by_participant[key] = max(max_round_by_participant.get(key, 0), round_index)
    max_round = max(max_round_by_participant.values(), default=0)
    return [
        {
            "round_index": round_index,
            "participants_remaining": sum(value >= round_index for value in max_round_by_participant.values()),
            "decision_rows": sum((parse_int(row.get("round_index")) or 0) == round_index for row in analysis_rows),
        }
        for round_index in range(1, max_round + 1)
    ]


def build_phase_rows(analysis_rows):
    rows = []
    for phase in PHASE_ORDER:
        phase_rows = [row for row in analysis_rows if str(row.get("phase") or "").strip() == phase]
        participants = {participant_key(row) for row in phase_rows if participant_key(row)}
        score_values = [metric_value(row, ["score_ratio_to_best", "reward"]) for row in phase_rows]
        regret_values = [metric_value(row, ["percent_regret", "regret"]) for row in phase_rows]
        exact_values = [metric_value(row, ["is_exact_optimal", "exact_optimal"]) for row in phase_rows]
        near_values = [metric_value(row, ["is_near_optimal", "near_optimal"]) for row in phase_rows]
        failure_values = [metric_value(row, ["is_failure"]) for row in phase_rows]
        rows.append(
            {
                "phase": phase,
                "n_participants": len(participants),
                "n_decisions": len(phase_rows),
                "mean_score_ratio": mean(score_values),
                "median_score_ratio": median(score_values),
                "mean_regret": mean(regret_values),
                "exact_optimal_rate": mean(exact_values),
                "near_optimal_rate": mean(near_values),
                "failure_rate": mean(failure_values),
            }
        )
    return rows


def load_recommendation_rows(analysis_rows, publication_dir):
    exposure_rows = read_csv(Path(publication_dir) / "recommendation_exposure.csv") if publication_dir else []
    if exposure_rows:
        return exposure_rows
    return analysis_rows


def infer_adoption(row):
    explicit = parse_bool_number(first_value(row, ["selected_recommended_bundle", "followed_recommendation"], ""))
    if explicit is not None:
        return explicit
    shown = parse_json_list(first_value(row, ["shown_recommendation_bundle_ids_json"], ""))
    chosen = parse_json_list(first_value(row, ["chosen_orders_json", "chosen_orders"], ""))
    if not shown or not chosen:
        return None
    return 1.0 if set(shown) == set(chosen) else 0.0


def parse_json_list(value):
    if isinstance(value, list):
        return [str(entry) for entry in value]
    text = str(value or "").strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return [part.strip() for part in text.split("|") if part.strip()]
    if isinstance(parsed, list) and parsed and isinstance(parsed[0], list):
        return [str(entry) for entry in parsed[0]]
    if isinstance(parsed, list):
        return [str(entry) for entry in parsed]
    return []


def build_recommendation_adoption_rows(recommendation_rows):
    buckets = {}
    for row in recommendation_rows:
        source = str(first_value(row, ["recommendation_source"], "")).strip()
        shown_status = str(row.get("shown_recommendation_status") or "").strip()
        if source in {"", "none"} and shown_status not in {"shown", "1", "true"}:
            continue
        adoption = infer_adoption(row)
        if adoption is None:
            continue
        arm = str(first_value(row, ["policy_arm", "state_policy_arm"], "unknown")).strip() or "unknown"
        quality = str(first_value(row, ["recommendation_quality", "action_recommendation_quality"], "unknown")).strip() or "unknown"
        key = (arm, quality)
        bucket = buckets.setdefault(key, {"policy_arm": arm, "recommendation_quality": quality, "values": []})
        bucket["values"].append(adoption)

    output = []
    for key in sorted(buckets):
        bucket = buckets[key]
        values = bucket["values"]
        output.append(
            {
                "policy_arm": bucket["policy_arm"],
                "recommendation_quality": bucket["recommendation_quality"],
                "n_exposures": len(values),
                "adoption_rate": mean(values),
            }
        )
    return output


def confidence_interval(value, n):
    value = parse_float(value)
    n = parse_float(n)
    if value is None or not n or n <= 0:
        return None, None
    bounded = min(1.0, max(0.0, value))
    se = math.sqrt(max(0.000001, bounded * (1.0 - bounded)) / n)
    return max(0.0, value - 1.96 * se), min(1.0, value + 1.96 * se)


def collect_ope_rows(analysis_dir, model_dirs):
    rows = []
    if analysis_dir:
        for row in read_csv(Path(analysis_dir) / "ope_summary.csv"):
            row = dict(row)
            row["artifact_source"] = "analysis"
            rows.append(row)
    for model_dir in model_dirs:
        model_dir = Path(model_dir)
        for row in read_csv(model_dir / "ope_summary.csv"):
            row = dict(row)
            row["artifact_source"] = str(model_dir)
            rows.append(row)
    return rows


def build_ope_table(ope_rows):
    output = []
    for row in ope_rows:
        n_states = metric_value(row, ["n_states"]) or 0
        match_rate = metric_value(row, ["match_rate"]) or 0
        ess = metric_value(row, ["effective_sample_size", "ess"])
        if ess is None:
            ess = n_states * match_rate if n_states else None
        out = {
            "artifact_source": row.get("artifact_source", ""),
            "policy_name": first_value(row, ["policy_name"], ""),
            "model_type": first_value(row, ["model_type", "algorithm"], ""),
            "implementation_status": first_value(row, ["implementation_status"], ""),
            "scope": first_value(row, ["scope", "split"], ""),
            "group_value": first_value(row, ["group_value", "split"], ""),
            "n_states": n_states,
            "effective_sample_size": ess,
            "match_rate": match_rate,
        }
        for metric in ["ips", "snips", "doubly_robust"]:
            value = metric_value(row, [metric])
            low = metric_value(row, [f"{metric}_ci_low", f"{metric}_ci_lower"])
            high = metric_value(row, [f"{metric}_ci_high", f"{metric}_ci_upper"])
            if low is None or high is None:
                low, high = confidence_interval(value, ess or n_states)
            out[metric] = value
            out[f"{metric}_ci_low"] = low
            out[f"{metric}_ci_high"] = high
        output.append(out)
    return output


def build_ablation_table(analysis_dir, model_dirs):
    rows = []
    if analysis_dir:
        for row in read_csv(Path(analysis_dir) / "sandbox_summary.csv"):
            rows.append(
                {
                    "artifact_source": "analysis",
                    "policy_name": first_value(row, ["policy_name"], ""),
                    "ablation_label": first_value(row, ["simulation_label"], ""),
                    "n_states": metric_value(row, ["n_states"]),
                    "iterations": metric_value(row, ["iterations"]),
                    "seed": first_value(row, ["seed"], ""),
                    "mean_reward": metric_value(row, ["mean_simulated_reward"]),
                    "reward_ci_low": metric_value(row, ["simulated_reward_ci_low"]),
                    "reward_ci_high": metric_value(row, ["simulated_reward_ci_high"]),
                    "gap_vs_historical": metric_value(row, ["mean_gap_vs_historical"]),
                }
            )
    for model_dir in model_dirs:
        model_dir = Path(model_dir)
        summary = read_json(model_dir / "evaluation_summary.json", {})
        if not summary:
            continue
        for policy_row in summary.get("policy_comparison", []):
            rows.append(
                {
                    "artifact_source": str(model_dir),
                    "policy_name": summary.get("policy_name", policy_row.get("policy_name", "")),
                    "ablation_label": f"{summary.get('algorithm', '')}:{policy_row.get('split', '')}",
                    "n_states": policy_row.get("n_states", ""),
                    "iterations": "",
                    "seed": summary.get("seed", ""),
                    "mean_reward": policy_row.get("mean_reward", ""),
                    "reward_ci_low": "",
                    "reward_ci_high": "",
                    "gap_vs_historical": policy_row.get("mean_lift_vs_historical", ""),
                }
            )
    return rows


def build_manifest_table(analysis_dir, model_dirs):
    snapshot = read_json(Path(analysis_dir) / "dataset_snapshot.json", {}) if analysis_dir else {}
    manifest = read_json(Path(analysis_dir) / "paper_manifest.json", {}) if analysis_dir else {}
    snapshot_summary = manifest.get("dataset_snapshot") or {}
    qa_report = snapshot.get("qa_report") or {}
    outputs = [
        {
            "row_type": "snapshot",
            "name": snapshot.get("snapshot_id") or snapshot_summary.get("snapshot_id", ""),
            "version_or_type": snapshot.get("feature_version") or snapshot_summary.get("feature_version", ""),
            "status": "paper_ready" if qa_report.get("paper_ready") or snapshot_summary.get("paper_ready") else "blocked_or_benchmark",
            "dataset_snapshot_id": snapshot.get("snapshot_id") or snapshot_summary.get("snapshot_id", ""),
            "dataset_root": snapshot.get("dataset_root") or snapshot_summary.get("dataset_root", ""),
            "details": ";".join(qa_report.get("blockers") or snapshot_summary.get("blockers") or []),
        }
    ]

    registry = manifest.get("model_registry") or {}
    for model in registry.get("baseline_ladder", []) + registry.get("models", []):
        outputs.append(
            {
                "row_type": "model",
                "name": model.get("policy_name") or model.get("model_id", ""),
                "version_or_type": model.get("model_type") or model.get("algorithm", ""),
                "status": model.get("implementation_status") or ("active" if model.get("is_active") else "registered"),
                "dataset_snapshot_id": model.get("dataset_snapshot_id", ""),
                "dataset_root": "",
                "details": model.get("training_mode") or model.get("training_data_source", ""),
            }
        )
    for model_dir in model_dirs:
        model_dir = Path(model_dir)
        summary = read_json(model_dir / "evaluation_summary.json", {})
        config = read_json(model_dir / "config.json", {})
        if not summary and not config:
            continue
        outputs.append(
            {
                "row_type": "trained_artifact",
                "name": summary.get("policy_name") or config.get("policy_name", model_dir.name),
                "version_or_type": summary.get("algorithm") or config.get("algorithm", ""),
                "status": "generated",
                "dataset_snapshot_id": "",
                "dataset_root": "",
                "details": f"seed={summary.get('seed', config.get('seed', ''))}; states={summary.get('state_count', '')}",
            }
        )
    return outputs


def write_line_svg(path, title, rows, x_key, y_key, y_label):
    width = 760
    height = 430
    margin_left = 64
    margin_right = 28
    margin_top = 52
    margin_bottom = 58
    values = [metric_value(row, [y_key]) or 0 for row in rows]
    xs = [metric_value(row, [x_key]) or index + 1 for index, row in enumerate(rows)]
    max_y = max(values + [1])
    max_x = max(xs + [1])
    min_x = min(xs + [1])
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom

    def px(x):
        if max_x == min_x:
            return margin_left
        return margin_left + (x - min_x) / (max_x - min_x) * plot_w

    def py(y):
        return margin_top + plot_h - (y / max_y) * plot_h

    points = " ".join(f"{px(x):.1f},{py(y):.1f}" for x, y in zip(xs, values))
    circles = "\n".join(
        f'<circle cx="{px(x):.1f}" cy="{py(y):.1f}" r="3" fill="#2563eb" />'
        for x, y in zip(xs, values)
    )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{escape(title)}">
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="{margin_left}" y="30" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#111827">{escape(title)}</text>
<line x1="{margin_left}" y1="{margin_top + plot_h}" x2="{width - margin_right}" y2="{margin_top + plot_h}" stroke="#9ca3af"/>
<line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{margin_top + plot_h}" stroke="#9ca3af"/>
<polyline points="{points}" fill="none" stroke="#2563eb" stroke-width="3"/>
{circles}
<text x="{width / 2:.1f}" y="{height - 16}" font-family="Arial, sans-serif" font-size="13" fill="#374151" text-anchor="middle">Round</text>
<text transform="translate(18 {height / 2:.1f}) rotate(-90)" font-family="Arial, sans-serif" font-size="13" fill="#374151" text-anchor="middle">{escape(y_label)}</text>
<text x="{margin_left}" y="{margin_top + plot_h + 22}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">{format_number(min_x, 0)}</text>
<text x="{width - margin_right}" y="{margin_top + plot_h + 22}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="end">{format_number(max_x, 0)}</text>
<text x="{margin_left - 8}" y="{py(max_y):.1f}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="end">{format_number(max_y)}</text>
<text x="{margin_left - 8}" y="{py(0):.1f}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="end">0</text>
</svg>
"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(svg, encoding="utf-8")


def write_bar_svg(path, title, bars, y_label, max_value=None):
    width = max(760, 120 + len(bars) * 92)
    height = 450
    margin_left = 70
    margin_right = 28
    margin_top = 52
    margin_bottom = 112
    plot_w = width - margin_left - margin_right
    plot_h = height - margin_top - margin_bottom
    max_y = max_value if max_value is not None else max([value for _, value in bars] + [1])
    max_y = max(max_y, 0.001)
    gap = 18
    bar_w = max(24, (plot_w - gap * (len(bars) + 1)) / max(1, len(bars)))
    rects = []
    labels = []
    for index, (label, value) in enumerate(bars):
        value = value or 0
        x = margin_left + gap + index * (bar_w + gap)
        h = max(0, value / max_y * plot_h)
        y = margin_top + plot_h - h
        rects.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{h:.1f}" fill="#0f766e" rx="3"/>')
        rects.append(f'<text x="{x + bar_w / 2:.1f}" y="{y - 7:.1f}" font-family="Arial, sans-serif" font-size="11" fill="#111827" text-anchor="middle">{escape(format_number(value))}</text>')
        labels.append(
            f'<text transform="translate({x + bar_w / 2:.1f} {margin_top + plot_h + 16}) rotate(35)" font-family="Arial, sans-serif" font-size="11" fill="#374151" text-anchor="start">{escape(label)}</text>'
        )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{escape(title)}">
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="{margin_left}" y="30" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#111827">{escape(title)}</text>
<line x1="{margin_left}" y1="{margin_top + plot_h}" x2="{width - margin_right}" y2="{margin_top + plot_h}" stroke="#9ca3af"/>
<line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{margin_top + plot_h}" stroke="#9ca3af"/>
{''.join(rects)}
{''.join(labels)}
<text transform="translate(18 {height / 2:.1f}) rotate(-90)" font-family="Arial, sans-serif" font-size="13" fill="#374151" text-anchor="middle">{escape(y_label)}</text>
<text x="{margin_left - 8}" y="{margin_top}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="end">{format_number(max_y)}</text>
<text x="{margin_left - 8}" y="{margin_top + plot_h}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280" text-anchor="end">0</text>
</svg>
"""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(svg, encoding="utf-8")


def required_paths_exist(out_dir):
    missing = []
    for relative in REQUIRED_OUTPUTS:
        if not (Path(out_dir) / relative).exists():
            missing.append(relative)
    return missing


def build_parser():
    parser = argparse.ArgumentParser(description="Generate BundleGame paper figures and tables")
    parser.add_argument("--analysis-dir", default="", help="Frozen analysis directory with analysis_master.csv and snapshot files")
    parser.add_argument("--publication-dir", default="", help="Publication-safe export directory")
    parser.add_argument("--model-dir", action="append", default=[], help="Offline/model artifact directory; may be repeated")
    parser.add_argument("--out-dir", default="publishing/paper_artifacts/out/latest", help="Output directory")
    parser.add_argument("--title", default="BundleGame Paper Artifacts", help="Manifest title")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    out_dir = Path(args.out_dir)
    figures_dir = out_dir / "figures"
    tables_dir = out_dir / "tables"
    figures_dir.mkdir(parents=True, exist_ok=True)
    tables_dir.mkdir(parents=True, exist_ok=True)

    analysis_rows, analysis_source = load_analysis_rows(args.analysis_dir, args.publication_dir)
    participant_rows = load_participant_summary(analysis_rows, args.publication_dir)
    recommendation_rows = load_recommendation_rows(analysis_rows, args.publication_dir)

    completion_rows = build_completion_rows(participant_rows, analysis_rows)
    phase_rows = build_phase_rows(analysis_rows)
    adoption_rows = build_recommendation_adoption_rows(recommendation_rows)
    ope_rows = build_ope_table(collect_ope_rows(args.analysis_dir, args.model_dir))
    ablation_rows = build_ablation_table(args.analysis_dir, args.model_dir)
    manifest_rows = build_manifest_table(args.analysis_dir, args.model_dir)

    completion_columns = ["round_index", "participants_remaining", "decision_rows"]
    phase_columns = [
        "phase",
        "n_participants",
        "n_decisions",
        "mean_score_ratio",
        "median_score_ratio",
        "mean_regret",
        "exact_optimal_rate",
        "near_optimal_rate",
        "failure_rate",
    ]
    adoption_columns = ["policy_arm", "recommendation_quality", "n_exposures", "adoption_rate"]
    ope_columns = [
        "artifact_source",
        "policy_name",
        "model_type",
        "implementation_status",
        "scope",
        "group_value",
        "n_states",
        "effective_sample_size",
        "match_rate",
        "ips",
        "ips_ci_low",
        "ips_ci_high",
        "snips",
        "snips_ci_low",
        "snips_ci_high",
        "doubly_robust",
        "doubly_robust_ci_low",
        "doubly_robust_ci_high",
    ]
    ablation_columns = [
        "artifact_source",
        "policy_name",
        "ablation_label",
        "n_states",
        "iterations",
        "seed",
        "mean_reward",
        "reward_ci_low",
        "reward_ci_high",
        "gap_vs_historical",
    ]
    manifest_columns = ["row_type", "name", "version_or_type", "status", "dataset_snapshot_id", "dataset_root", "details"]

    table_specs = [
        ("completion_by_round", completion_rows, completion_columns),
        ("phase_decision_quality", phase_rows, phase_columns),
        ("recommendation_adoption", adoption_rows, adoption_columns),
        ("ope_comparison", ope_rows, ope_columns),
        ("ablation_summary", ablation_rows, ablation_columns),
        ("model_registry_snapshot_manifest", manifest_rows, manifest_columns),
    ]
    for name, rows, columns in table_specs:
        write_csv(tables_dir / f"{name}.csv", rows, columns)
        write_markdown(tables_dir / f"{name}.md", rows, columns)

    write_line_svg(
        figures_dir / "participant_completion_dropoff.svg",
        "Participant Completion / Drop-off",
        completion_rows,
        "round_index",
        "participants_remaining",
        "Participants remaining",
    )
    phase_bars = []
    for row in phase_rows:
        phase = row["phase"]
        phase_bars.append((f"{phase} score", parse_float(row.get("mean_score_ratio")) or 0))
        phase_bars.append((f"{phase} exact", parse_float(row.get("exact_optimal_rate")) or 0))
        phase_bars.append((f"{phase} near", parse_float(row.get("near_optimal_rate")) or 0))
    write_bar_svg(
        figures_dir / "phase_decision_quality.svg",
        "Phase A/B/C Decision Quality",
        phase_bars,
        "Rate / score ratio",
        max_value=1.0,
    )
    adoption_bars = [
        (f"{row['policy_arm']} / {row['recommendation_quality']}", parse_float(row.get("adoption_rate")) or 0)
        for row in adoption_rows
    ]
    write_bar_svg(
        figures_dir / "recommendation_adoption.svg",
        "Recommendation Adoption By Arm And Quality",
        adoption_bars or [("no recommendation rows", 0)],
        "Adoption rate",
        max_value=1.0,
    )

    generated_files = sorted(
        str(path.relative_to(out_dir))
        for path in out_dir.rglob("*")
        if path.is_file() and path.name != "output_manifest.json"
    )
    manifest = {
        "schema_version": "bundlegame_paper_artifact_manifest_v1",
        "title": args.title,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "inputs": {
            "analysis_dir": args.analysis_dir,
            "analysis_source": analysis_source,
            "publication_dir": args.publication_dir,
            "model_dirs": args.model_dir,
        },
        "row_counts": {
            "analysis_rows": len(analysis_rows),
            "participant_summary_rows": len(participant_rows),
            "recommendation_source_rows": len(recommendation_rows),
            "completion_by_round": len(completion_rows),
            "phase_decision_quality": len(phase_rows),
            "recommendation_adoption": len(adoption_rows),
            "ope_comparison": len(ope_rows),
            "ablation_summary": len(ablation_rows),
            "model_registry_snapshot_manifest": len(manifest_rows),
        },
        "generated_files": generated_files + ["output_manifest.json"],
        "required_outputs": REQUIRED_OUTPUTS,
    }
    write_json(out_dir / "output_manifest.json", manifest)

    missing = required_paths_exist(out_dir)
    if missing:
        raise SystemExit(f"Missing required paper outputs: {', '.join(missing)}")

    print(f"Wrote BundleGame paper artifacts to {out_dir}")
    print(f"Generated {len(generated_files) + 1} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
