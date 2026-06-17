#!/usr/bin/env python3
"""Vector-PDF versions of the BundleGame analysis figures (companion to generate.py).

generate.py emits crude, stdlib-only SVG so a clean reviewer machine needs no
extra packages. THIS module builds publication-grade, fully vector PDF (and SVG)
with embedded TrueType fonts, for the camera-ready paper. generate.py and its SVG
path are left completely unchanged.

It covers EVERY chart generate.py emits as SVG:
  * participant_completion_dropoff  - line: participants remaining per round
  * phase_decision_quality          - grouped bars: score / exact / near by phase
  * recommendation_adoption         - bars: adoption rate by policy arm x quality

To guarantee the PDFs carry the SAME numbers as the SVGs and the CSV/MD tables,
the underlying data is built by importing generate.py's own loaders and
aggregators (it reads the identical frozen analysis snapshot); this module owns
only the matplotlib rendering.

Usage:
    python publishing/paper_artifacts/figures_pdf.py \
        --analysis-dir publishing/paper_artifacts/fixtures/analysis \
        --publication-dir publishing/paper_artifacts/fixtures/publication_export \
        --out-dir publishing/paper_artifacts/out/figures_pdf \
        --width single        # or "double", or a number in inches
"""
import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from paper_figure_style import (  # noqa: E402
    BLUE,
    GREY,
    TEAL,
    apply_camera_ready_style,
    fig_size,
    save_figure,
)
import generate as gen  # noqa: E402  (stdlib-only; the SVG path's data layer, reused)

import matplotlib.pyplot as plt  # noqa: E402

apply_camera_ready_style()

PHASE_SERIES = [TEAL, BLUE, GREY]
HATCHES = ["", "//", ".."]  # redundant encoding so color is not the only cue


def completion_dropoff(completion_rows, out_dir, width):
    """Line: participants remaining per round (generate.py write_line_svg analog)."""
    rows = [r for r in completion_rows if gen.parse_int(r.get("round_index")) is not None]
    if not rows:
        return None
    xs = [gen.parse_int(r["round_index"]) for r in rows]
    ys = [gen.parse_int(r.get("participants_remaining")) or 0 for r in rows]
    fig, ax = plt.subplots(figsize=fig_size(width), layout="constrained")
    ax.plot(xs, ys, color=BLUE, marker="o", markersize=2.5, linewidth=1.4)
    ax.set_xlabel("Round")
    ax.set_ylabel("Participants remaining")
    ax.set_ylim(bottom=0)
    ax.margins(x=0.02)
    return save_figure(fig, out_dir, "participant_completion_dropoff")


def phase_decision_quality(phase_rows, out_dir, width):
    """Grouped bars: mean score ratio / exact-optimal / near-optimal, by phase."""
    labels = ["Mean score ratio", "Exact-optimal", "Near-optimal"]
    keys = ["mean_score_ratio", "exact_optimal_rate", "near_optimal_rate"]
    data = {}
    for row in phase_rows:  # generate.build_phase_rows preserves A/B/C order
        if any(gen.parse_float(row.get(k)) is not None for k in keys):
            data[row["phase"]] = [gen.parse_float(row.get(k)) or 0.0 for k in keys]
    if not data:
        return None

    # Grouped bars read better at ~two-column width even when other figures are single.
    size = fig_size("double" if width == "single" else width, aspect=0.42)
    fig, ax = plt.subplots(figsize=size, layout="constrained")
    phases = list(data)
    n = len(labels)
    group_w = 0.8
    bar_w = group_w / len(phases)
    x = range(n)
    for j, phase in enumerate(phases):
        offs = [i - group_w / 2 + bar_w * (j + 0.5) for i in x]
        bars = ax.bar(
            offs, data[phase], width=bar_w, label=f"Phase {phase}",
            color=PHASE_SERIES[j % len(PHASE_SERIES)], edgecolor="white",
            hatch=HATCHES[j % len(HATCHES)], linewidth=0.5,
        )
        ax.bar_label(bars, fmt="%.2f", padding=1.5, fontsize=6)
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.set_ylabel("Rate / score ratio")
    ax.set_ylim(0, 1.05)
    ax.legend(frameon=False, ncol=len(phases), loc="upper center", bbox_to_anchor=(0.5, 1.16))
    return save_figure(fig, out_dir, "phase_decision_quality")


def recommendation_adoption(adoption_rows, out_dir, width):
    """Bars: recommendation adoption rate by (policy arm / recommendation quality)."""
    size = fig_size("double" if width == "single" else width, aspect=0.5)
    fig, ax = plt.subplots(figsize=size, layout="constrained")
    if adoption_rows:
        labels = [f"{r['policy_arm']} /\n{r['recommendation_quality']}" for r in adoption_rows]
        values = [gen.parse_float(r.get("adoption_rate")) or 0.0 for r in adoption_rows]
        exposures = [gen.parse_int(r.get("n_exposures")) or 0 for r in adoption_rows]
    else:
        # Mirror generate.py's placeholder when no recommendation rows are present.
        labels, values, exposures = ["no recommendation\nrows"], [0.0], [0]
    xpos = list(range(len(labels)))
    bars = ax.bar(xpos, values, color=TEAL, edgecolor="white", linewidth=0.5, width=0.7)
    for bar, value, n_exp in zip(bars, values, exposures):
        ax.text(bar.get_x() + bar.get_width() / 2, value + 0.02, f"{value:.2f}\n(n={n_exp})",
                ha="center", va="bottom", fontsize=6)
    ax.set_xticks(xpos)
    ax.set_xticklabels(labels)
    ax.set_ylabel("Adoption rate")
    ax.set_ylim(0, 1.12)
    ax.margins(x=0.04)
    return save_figure(fig, out_dir, "recommendation_adoption")


def build_parser():
    parser = argparse.ArgumentParser(description="Vector-PDF BundleGame analysis figures")
    parser.add_argument("--analysis-dir", required=True,
                        help="Frozen analysis dir with analysis_master.csv (same as generate.py)")
    parser.add_argument("--publication-dir", default="",
                        help="Publication-safe export dir (participant_summary.csv, "
                             "recommendation_exposure.csv) - same as generate.py")
    parser.add_argument("--out-dir", default="publishing/paper_artifacts/out/figures_pdf")
    parser.add_argument("--width", default="single", help="'single', 'double', or width in inches")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)

    # Identical data layer to the SVG generator -> identical numbers in the PDFs.
    analysis_rows, _ = gen.load_analysis_rows(args.analysis_dir, args.publication_dir)
    if not analysis_rows:
        raise SystemExit(f"No analysis rows under {args.analysis_dir} / {args.publication_dir}")
    participant_rows = gen.load_participant_summary(analysis_rows, args.publication_dir)
    recommendation_rows = gen.load_recommendation_rows(analysis_rows, args.publication_dir)

    completion_rows = gen.build_completion_rows(participant_rows, analysis_rows)
    phase_rows = gen.build_phase_rows(analysis_rows)
    adoption_rows = gen.build_recommendation_adoption_rows(recommendation_rows)

    written = [
        completion_dropoff(completion_rows, args.out_dir, args.width),
        phase_decision_quality(phase_rows, args.out_dir, args.width),
        recommendation_adoption(adoption_rows, args.out_dir, args.width),
    ]
    written = [str(path) for path in written if path]
    for path in written:
        print("wrote", path)
    if len(written) != 3:
        raise SystemExit(f"Expected 3 analysis figures, wrote {len(written)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
