#!/usr/bin/env python3
"""
Confirmatory analysis pipeline for the BundleGame CHI main study (H1-H5).

This is the analysis that will run **once a treatment-aware export exists**. To
keep it ready before any real data is collected, it runs end-to-end on a
clearly-labeled SYNTHETIC FIXTURE with planted effects, so the plumbing,
contrasts, and outputs are validated in advance. It collects no participant
data.

Hypotheses:
  H1  matched < generic        on Phase-C unaided regret (lower is better)
  H2  matched < mismatched     (targeting beats same-form non-targeted control)
  H3  the *diagnosed* attribute's weight-gap shrinks MORE under matched than
      under non-diagnosed attributes / other arms (mechanistic transfer)
  H4  dose-response: matched benefit grows with diagnosed bias strength
      (bias_strength x arm interaction on Phase-C regret improvement)
  H5  deskilling check: generic is NOT better than no_ai on Phase-C transfer
      (generic regret >= no_ai; a harmful-reliance guardrail)

Production note: H1/H2/H5 are participant-level contrasts here; the registered
analysis fits mixed-effects models (regret ~ arm + diagnosed_bias + (1|worker))
with statsmodels/lme4. The participant-mean reduction used here is a valid,
dependency-light stand-in that exercises the same contrasts.

Usage:
  python publishing/analysis/confirmatory_plan.py                 # runs on synthetic fixture
  python publishing/analysis/confirmatory_plan.py --export DIR     # future: real export dir
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy import stats

ARMS = ["no_ai", "generic", "matched", "mismatched"]
WEAKNESSES = ["W1", "W2", "W3"]


# --------------------------------------------------------------------------- #
# Synthetic fixture with planted effects (LABELLED FIXTURE — not real data).   #
# --------------------------------------------------------------------------- #
def make_fixture(n_per_arm: int = 120, seed: int = 11) -> pd.DataFrame:
    """One row per worker. Planted: matched lowers Phase-C regret in proportion
    to diagnosed bias strength; the diagnosed-attribute gap shrinks most under
    matched; generic ~= no_ai (no deskilling)."""
    rng = np.random.default_rng(seed)
    rows = []
    for arm in ARMS:
        for _ in range(n_per_arm):
            weakness = rng.choice(WEAKNESSES)
            bias_strength = float(np.clip(rng.gamma(2.0, 0.25), 0.05, 2.0))
            base_regret = 0.16  # Phase-C baseline regret if unaided

            # Arm effect on Phase-C regret (lower = better). Only `matched`
            # delivers a targeted benefit that scales with bias strength.
            arm_effect = {
                "no_ai": 0.0,
                "generic": rng.normal(0.0, 0.005),       # ~ no_ai
                "matched": -0.10 * bias_strength,         # dose-responsive benefit
                "mismatched": -0.015,                     # weak generic-explanation effect
            }[arm]
            regret_c = max(0.0, base_regret + arm_effect + rng.normal(0, 0.06))

            # Diagnosed-attribute weight-gap at Phase A (start) and Phase C (end).
            gap_a = bias_strength + rng.normal(0, 0.1)
            shrink = {"no_ai": 0.05, "generic": 0.05, "matched": 0.55,
                      "mismatched": 0.08}[arm]
            gap_c = max(0.0, gap_a * (1 - shrink) + rng.normal(0, 0.1))
            # Non-diagnosed attribute gap (control for H3): little change anywhere.
            other_gap_a = float(np.clip(rng.gamma(2.0, 0.2), 0.05, 2.0))
            other_gap_c = max(0.0, other_gap_a * (1 - 0.07) + rng.normal(0, 0.1))

            rows.append({
                "user_id": f"f_{len(rows):04d}", "arm": arm,
                "diagnosed_weakness": weakness, "diagnosed_bias_strength": bias_strength,
                "phase_c_regret": regret_c,
                "diag_gap_phaseA": gap_a, "diag_gap_phaseC": gap_c,
                "other_gap_phaseA": other_gap_a, "other_gap_phaseC": other_gap_c,
            })
    df = pd.DataFrame(rows)
    df.attrs["is_fixture"] = True
    return df


# --------------------------------------------------------------------------- #
# Helpers.                                                                     #
# --------------------------------------------------------------------------- #
@dataclass
class TestResult:
    name: str
    estimate: float
    statistic: float
    p_value: float
    n: int
    passed: bool
    detail: str = ""

    def line(self) -> str:
        flag = "PASS" if self.passed else "n.s."
        return (f"[{flag}] {self.name}: est={self.estimate:+.4f}, "
                f"t/z={self.statistic:+.3f}, p={self.p_value:.4g}, n={self.n}  {self.detail}")


def _welch_one_sided(a, b, alt_lower=True):
    """One-sided Welch t-test that mean(a) < mean(b) (alt_lower)."""
    t, p_two = stats.ttest_ind(a, b, equal_var=False)
    # one-sided p for mean(a) < mean(b): t expected negative
    p = p_two / 2 if (t < 0) == alt_lower else 1 - p_two / 2
    return float(t), float(p)


def _ols_interaction(y, x_bias, is_matched):
    """OLS y ~ 1 + bias + matched + bias:matched; return interaction beta, t, p."""
    n = len(y)
    X = np.column_stack([np.ones(n), x_bias, is_matched, x_bias * is_matched])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    dof = n - X.shape[1]
    sigma2 = float(resid @ resid) / dof
    cov = sigma2 * np.linalg.inv(X.T @ X)
    se = np.sqrt(np.diag(cov))
    t = beta[3] / se[3]
    p = 2 * stats.t.sf(abs(t), dof)
    return float(beta[3]), float(t), float(p)


# --------------------------------------------------------------------------- #
# H1-H5.                                                                       #
# --------------------------------------------------------------------------- #
def run_confirmatory(df: pd.DataFrame, alpha: float = 0.05) -> list[TestResult]:
    g = {arm: df[df["arm"] == arm] for arm in ARMS}
    results: list[TestResult] = []

    # H1: matched < generic on Phase-C regret.
    a, b = g["matched"]["phase_c_regret"], g["generic"]["phase_c_regret"]
    t, p = _welch_one_sided(a, b, alt_lower=True)
    results.append(TestResult("H1 matched<generic (Phase-C regret)",
                              float(a.mean() - b.mean()), t, p, len(a) + len(b),
                              p < alpha))

    # H2: matched < mismatched.
    a, b = g["matched"]["phase_c_regret"], g["mismatched"]["phase_c_regret"]
    t, p = _welch_one_sided(a, b, alt_lower=True)
    results.append(TestResult("H2 matched<mismatched (Phase-C regret)",
                              float(a.mean() - b.mean()), t, p, len(a) + len(b),
                              p < alpha))

    # H3: diagnosed-attribute gap shrinks more than non-diagnosed under matched.
    m = g["matched"]
    diag_shrink = (m["diag_gap_phaseA"] - m["diag_gap_phaseC"]).to_numpy()
    other_shrink = (m["other_gap_phaseA"] - m["other_gap_phaseC"]).to_numpy()
    t, p = _welch_one_sided(-diag_shrink, -other_shrink, alt_lower=True)  # diag shrinks MORE
    results.append(TestResult("H3 matched: diagnosed gap shrinks > non-diagnosed",
                              float(diag_shrink.mean() - other_shrink.mean()), t, p,
                              len(m), p < alpha, "mechanistic transfer"))

    # H4: dose-response interaction bias_strength x matched on Phase-C regret.
    sub = df[df["arm"].isin(["matched", "no_ai"])]
    y = sub["phase_c_regret"].to_numpy()
    xb = sub["diagnosed_bias_strength"].to_numpy()
    im = (sub["arm"] == "matched").astype(float).to_numpy()
    beta, t, p = _ols_interaction(y, xb, im)
    # benefit grows with bias -> negative interaction (more bias => lower regret under matched)
    results.append(TestResult("H4 dose-response (bias x matched on regret)",
                              beta, t, p, len(sub), (p < alpha) and (beta < 0),
                              "negative => benefit grows with bias"))

    # H5: deskilling guardrail — generic should NOT beat no_ai (generic >= no_ai).
    a, b = g["generic"]["phase_c_regret"], g["no_ai"]["phase_c_regret"]
    t2, p_two = stats.ttest_ind(a, b, equal_var=False)
    # "pass" = no evidence generic is worse OR better in a deskilling-relevant way;
    # we report the two-sided test and flag if generic is significantly WORSE.
    generic_worse = (a.mean() > b.mean()) and (p_two < alpha)
    results.append(TestResult("H5 deskilling check (generic vs no_ai)",
                              float(a.mean() - b.mean()), t2, p_two, len(a) + len(b),
                              not generic_worse, "pass = generic not significantly worse"))
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="CHI confirmatory analysis (H1-H5).")
    ap.add_argument("--export", default="", help="Future: treatment-aware export dir.")
    ap.add_argument("--n-per-arm", type=int, default=120)
    ap.add_argument("--seed", type=int, default=11)
    args = ap.parse_args()

    if args.export:
        # Placeholder for the real loader once a treatment-aware export exists.
        raise SystemExit("Real-export path not yet wired: a treatment-aware export "
                         "(arms + scaffold_type + diagnosis + Phase-C regret) is required. "
                         "Run without --export to validate the pipeline on the fixture.")

    print("=== CHI confirmatory pipeline — running on SYNTHETIC FIXTURE (no real data) ===")
    df = make_fixture(n_per_arm=args.n_per_arm, seed=args.seed)
    print(f"fixture: {len(df)} workers x {len(ARMS)} arms; planted matched benefit + dose-response\n")
    results = run_confirmatory(df)
    for r in results:
        print(r.line())
    n_pass = sum(r.passed for r in results)
    print(f"\n{n_pass}/{len(results)} planted effects recovered on the fixture "
          f"(this validates the pipeline; it is NOT evidence about real participants).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
