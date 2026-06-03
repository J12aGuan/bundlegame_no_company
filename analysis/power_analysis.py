#!/usr/bin/env python3
"""
Power analysis for the BundleGame CHI main study.

Estimates the required **per-arm N** for the two primary confirmatory contrasts:

  (1) matched vs mismatched  on Phase-C unaided regret  (H2, the key control)
  (2) diagnosed-bias x arm interaction (H4 dose-response)

It uses the *pilot's* observed regret variability (loaded from the verified
export if present, else accepted as parameters) and an assumed treatment effect
expressed as a fraction of the pilot's mean regret. The Phase-C design is
within-subjects (m repeated unaided transfer rounds per worker), so we deflate
the participant-level variance via the standard repeated-measures factor
``rho + (1-rho)/m`` before computing N.

No participant data is collected. Reads only the de-identified pilot export.

Usage:
  python analysis/power_analysis.py
  python analysis/power_analysis.py --pilot-dir export_for_analysis \
      --effect-fraction 0.30 --phase-c-rounds 10 --icc 0.5 --power 0.8
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

from scipy import stats


def _z(p: float) -> float:
    return float(stats.norm.ppf(p))


def two_sample_n_per_arm(d: float, alpha: float, power: float) -> float:
    """N per group for a two-sample comparison of standardized effect d."""
    if d <= 0:
        return float("inf")
    return 2.0 * (_z(1 - alpha / 2) + _z(power)) ** 2 / (d ** 2)


def load_pilot_regret(pilot_dir: str) -> dict | None:
    """Return {mean, sd, n, phase_counts} of regret_to_best from the pilot export."""
    path = Path(pilot_dir) / "rounds.csv"
    if not path.exists():
        return None
    import pandas as pd
    df = pd.read_csv(path)
    reg = pd.to_numeric(df.get("regret_to_best"), errors="coerce").dropna()
    reg = reg[reg >= 0]
    if reg.empty:
        return None
    return {
        "mean": float(reg.mean()),
        "sd": float(reg.std(ddof=1)),
        "n_rows": int(reg.shape[0]),
        "n_workers": int(df["user_id"].nunique()),
    }


def repeated_measures_sd(round_sd: float, m: int, icc: float) -> float:
    """SD of a worker's mean regret over m correlated Phase-C rounds."""
    m = max(1, int(m))
    icc = min(max(icc, 0.0), 0.999)
    return round_sd * math.sqrt(icc + (1.0 - icc) / m)


def run(args: argparse.Namespace) -> dict:
    pilot = load_pilot_regret(args.pilot_dir)
    if pilot:
        mean_regret, round_sd = pilot["mean"], pilot["sd"]
        source = f"pilot export ({args.pilot_dir}): {pilot['n_workers']} workers, {pilot['n_rows']} rounds"
    else:
        mean_regret, round_sd = args.assume_mean_regret, args.assume_sd_regret
        source = "assumed parameters (no pilot export found)"

    # Assumed absolute treatment effect on Phase-C regret (matched lowers regret).
    delta = args.effect_fraction * mean_regret
    part_sd = repeated_measures_sd(round_sd, args.phase_c_rounds, args.icc)
    d_main = delta / part_sd if part_sd > 0 else 0.0

    n_main = two_sample_n_per_arm(d_main, args.alpha, args.power)
    # Detecting an interaction of the same standardized magnitude needs ~4x the N
    # of the corresponding main effect (Gelman; Leon & Heo 2009).
    n_interaction = 4.0 * n_main

    n_main_ceil = math.ceil(n_main)
    n_inter_ceil = math.ceil(n_interaction)
    # Primary driver is the larger of the two; pad for ~15% attrition/exclusions.
    per_arm = max(n_main_ceil, n_inter_ceil)
    per_arm_recruit = math.ceil(per_arm / (1.0 - args.attrition))
    total_recruit = per_arm_recruit * args.n_arms

    report = {
        "source": source,
        "pilot_mean_regret": round(mean_regret, 4),
        "pilot_round_sd": round(round_sd, 4),
        "effect_fraction": args.effect_fraction,
        "assumed_delta_regret": round(delta, 4),
        "phase_c_rounds": args.phase_c_rounds,
        "icc": args.icc,
        "participant_level_sd": round(part_sd, 4),
        "cohens_d_main": round(d_main, 4),
        "alpha": args.alpha,
        "power": args.power,
        "n_per_arm_matched_vs_mismatched": n_main_ceil,
        "n_per_arm_bias_x_arm_interaction": n_inter_ceil,
        "recommended_per_arm_analyzable": per_arm,
        "recommended_per_arm_recruit": per_arm_recruit,
        "n_arms": args.n_arms,
        "recommended_total_recruit": total_recruit,
        "attrition_assumed": args.attrition,
    }
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description="CHI main-study power analysis.")
    ap.add_argument("--pilot-dir", default="export_for_analysis")
    ap.add_argument("--effect-fraction", type=float, default=0.30,
                    help="Assumed matched-vs-mismatched regret reduction, as a fraction of pilot mean regret.")
    ap.add_argument("--phase-c-rounds", type=int, default=10,
                    help="Repeated unaided transfer rounds per worker in Phase C.")
    ap.add_argument("--icc", type=float, default=0.5, help="Within-worker intraclass correlation of regret.")
    ap.add_argument("--alpha", type=float, default=0.05)
    ap.add_argument("--power", type=float, default=0.80)
    ap.add_argument("--n-arms", type=int, default=4)
    ap.add_argument("--attrition", type=float, default=0.15)
    ap.add_argument("--assume-mean-regret", type=float, default=0.16)
    ap.add_argument("--assume-sd-regret", type=float, default=0.18)
    args = ap.parse_args()

    rep = run(args)
    print("=== BundleGame CHI main study — power analysis ===")
    print(f"Variance source: {rep['source']}")
    print(f"Pilot mean regret={rep['pilot_mean_regret']}, round-level SD={rep['pilot_round_sd']}")
    print(f"Assumed matched-vs-mismatched effect: {int(args.effect_fraction*100)}% of mean regret "
          f"= {rep['assumed_delta_regret']} absolute")
    print(f"Phase-C within-subjects: {rep['phase_c_rounds']} rounds, ICC={rep['icc']} "
          f"-> participant-level SD={rep['participant_level_sd']}, Cohen's d={rep['cohens_d_main']}")
    print(f"alpha={rep['alpha']}, power={rep['power']}")
    print("-" * 60)
    print(f"N/arm for matched-vs-mismatched (H2):      {rep['n_per_arm_matched_vs_mismatched']}")
    print(f"N/arm for bias x arm interaction (H4):     {rep['n_per_arm_bias_x_arm_interaction']}")
    print(f">>> RECOMMENDED per-arm analyzable N:      {rep['recommended_per_arm_analyzable']}")
    print(f">>> RECOMMENDED per-arm recruit (incl {int(args.attrition*100)}% attrition): {rep['recommended_per_arm_recruit']}")
    print(f">>> RECOMMENDED total across {rep['n_arms']} arms:        {rep['recommended_total_recruit']}")
    print("\nNote: the interaction (H4) is the binding constraint; powering the "
          "main matched-vs-mismatched contrast alone would need fewer. Re-run with "
          "--effect-fraction to see sensitivity.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
