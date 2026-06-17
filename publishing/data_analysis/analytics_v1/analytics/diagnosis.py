"""
Worker cost-blindness diagnosis (CHI main-study module).

Given a worker's early *unaided* (Phase A) choices, estimate a **signed
per-attribute bias vector** by fitting a regularized conditional (McFadden)
logit to the worker's choices over each round's legal choice set, and comparing
the worker's revealed weights to the **oracle's** revealed weights fit over the
same choice sets. A positive bias on a *cost* attribute means the worker
under-weights (is "blind" to) that cost; a positive bias on *earnings* means the
worker over-weights payout.

The bias vector maps to a dominant diagnosed weakness:

    W1  over-bundling / pick-time neglect    <- bias on effective pick time
    W2  route-dispersion / cross-city neglect<- bias on cross-city travel
    W3  payout-overweighting                 <- bias on earnings
    none (no attribute clears the threshold / too few rounds)

This module reads the *derived* attribute columns produced by
``publishing/export_for_analysis/export.py`` (candidates table), so it runs directly on the
verified pilot export. It collects **no** new participant data.

Design choices (see ``DESIGN_NOTES.md``):
* Features are z-scored over the analysis pool so weights are comparable across
  workers and attributes; the bias argmax is therefore scale-free.
* Reference weights come from a conditional logit fit to the per-round oracle
  (``is_oracle``) choice over the identical choice sets — a normative
  "always pick the best-score bundle" policy.
* Confidence is the bootstrap stability of the dominant label (fraction of
  round-resamples that reproduce it), which is what we report in the paper.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
from scipy.optimize import minimize
from scipy.special import logsumexp

# Attribute columns in candidates.csv (seconds for time costs; game-$ for earnings).
FEATURE_COLUMNS = [
    "earnings",
    "effective_pick_time_seconds",
    "cross_city_travel_time_seconds",
    "local_travel_time_seconds",
    "shared_item_savings_seconds",
]

# Dominant-weakness mapping: weakness -> (feature, human label).
WEAKNESS_FEATURE = {
    "W1": "effective_pick_time_seconds",   # over-bundling / pick-time neglect
    "W2": "cross_city_travel_time_seconds",  # route-dispersion / cross-city neglect
    "W3": "earnings",                        # payout-overweighting
}
WEAKNESS_LABEL = {
    "W1": "over-bundling / pick-time neglect",
    "W2": "route-dispersion / cross-city neglect",
    "W3": "payout-overweighting",
    "none": "no dominant diagnosed weakness",
}

DEFAULT_RIDGE = 1.0
DEFAULT_MIN_ROUNDS = 3
DEFAULT_DOMINANCE_THRESHOLD = 0.0  # positive bias required to flag a weakness
DEFAULT_N_BOOT = 200
DEFAULT_SEED = 7


# --------------------------------------------------------------------------- #
# Standardization.                                                            #
# --------------------------------------------------------------------------- #
@dataclass
class Standardizer:
    mean: np.ndarray
    std: np.ndarray
    columns: list[str]

    def transform(self, x: np.ndarray) -> np.ndarray:
        return (x - self.mean) / self.std


def fit_standardizer(candidates_df, feature_cols: list[str] = FEATURE_COLUMNS) -> Standardizer:
    cols = [c for c in feature_cols if c in candidates_df.columns]
    x = candidates_df[cols].to_numpy(dtype=float)
    x = np.nan_to_num(x, nan=0.0)
    mean = x.mean(axis=0)
    std = x.std(axis=0)
    std = np.where(std < 1e-9, 1.0, std)  # guard zero-variance columns
    return Standardizer(mean=mean, std=std, columns=cols)


# --------------------------------------------------------------------------- #
# Choice-set construction.                                                    #
# --------------------------------------------------------------------------- #
@dataclass
class ChoiceSet:
    features: np.ndarray   # (n_alternatives, k)
    chosen_index: int
    round_index: int


def build_choice_sets(
    worker_candidates,
    standardizer: Standardizer,
    target: str = "is_chosen",
) -> list[ChoiceSet]:
    """One ChoiceSet per round: legal alternatives + the index of `target`==1."""
    cols = standardizer.columns
    out: list[ChoiceSet] = []
    for round_index, grp in worker_candidates.groupby("round_index"):
        legal = grp[grp["legal"] == 1]
        if len(legal) < 2:
            continue
        sel = legal[legal[target] == 1]
        if len(sel) != 1:
            # target not in the legal set (e.g. illegal observed choice) -> skip
            continue
        feats = standardizer.transform(
            np.nan_to_num(legal[cols].to_numpy(dtype=float), nan=0.0)
        )
        chosen_idx = int(np.where(legal[target].to_numpy() == 1)[0][0])
        out.append(ChoiceSet(features=feats, chosen_index=chosen_idx,
                             round_index=int(round_index)))
    return out


# --------------------------------------------------------------------------- #
# Conditional (McFadden) logit with L2 ridge.                                 #
# --------------------------------------------------------------------------- #
def _nll_and_grad(beta: np.ndarray, sets: list[ChoiceSet], ridge: float):
    nll = 0.0
    grad = np.zeros_like(beta)
    for cs in sets:
        v = cs.features @ beta              # (n,)
        z = logsumexp(v)
        nll -= (v[cs.chosen_index] - z)
        p = np.exp(v - z)                   # softmax probs
        grad -= (cs.features[cs.chosen_index] - p @ cs.features)
    nll += 0.5 * ridge * float(beta @ beta)
    grad += ridge * beta
    return nll, grad


def fit_conditional_logit(sets: list[ChoiceSet], k: int, ridge: float = DEFAULT_RIDGE) -> np.ndarray:
    if not sets:
        return np.zeros(k)
    res = minimize(
        lambda b: _nll_and_grad(b, sets, ridge),
        x0=np.zeros(k),
        jac=True,
        method="L-BFGS-B",
        options={"maxiter": 500},
    )
    return res.x


def _direction(beta: np.ndarray) -> np.ndarray:
    """Unit-normalize a coefficient vector.

    Independently-fit worker and oracle logits differ in overall scale
    (decisiveness/temperature); comparing *directions* isolates the worker's
    *relative* attribute emphasis, which is what cost-blindness means.
    """
    norm = float(np.linalg.norm(beta))
    return beta / norm if norm > 1e-8 else beta


def _bias_from_sets(
    chosen_sets: list[ChoiceSet],
    oracle_sets: list[ChoiceSet],
    columns: list[str],
    ridge: float,
) -> dict[str, float]:
    k = len(columns)
    dir_w = _direction(fit_conditional_logit(chosen_sets, k, ridge))
    dir_o = _direction(fit_conditional_logit(oracle_sets, k, ridge))
    return {c: float(dir_w[i] - dir_o[i]) for i, c in enumerate(columns)}


# --------------------------------------------------------------------------- #
# Per-worker diagnosis.                                                        #
# --------------------------------------------------------------------------- #
@dataclass
class Diagnosis:
    user_id: str
    n_rounds: int
    dominant_weakness: str
    dominant_label: str
    confidence: float
    bias_vector: dict[str, float] = field(default_factory=dict)
    weakness_strengths: dict[str, float] = field(default_factory=dict)
    bias_strength: float = 0.0  # signed strength of the dominant weakness (for H4 dose-response)

    def to_row(self) -> dict[str, Any]:
        row = {
            "user_id": self.user_id,
            "n_diagnosis_rounds": self.n_rounds,
            "diagnosed_weakness": self.dominant_weakness,
            "diagnosis_label": self.dominant_label,
            "diagnosis_confidence": round(self.confidence, 4),
            "diagnosed_bias_strength": round(self.bias_strength, 4),
        }
        for f, v in self.bias_vector.items():
            row[f"bias_{f}"] = round(v, 4)
        return row


def _bias_to_strengths(bias: dict[str, float]) -> dict[str, float]:
    return {w: float(bias.get(feat, 0.0)) for w, feat in WEAKNESS_FEATURE.items()}


def _dominant_from_strengths(strengths: dict[str, float],
                             threshold: float) -> tuple[str, float]:
    w = max(strengths, key=strengths.get)
    return (w, strengths[w]) if strengths[w] > threshold else ("none", 0.0)


def diagnose_worker(
    worker_candidates,
    standardizer: Standardizer,
    ridge: float = DEFAULT_RIDGE,
    min_rounds: int = DEFAULT_MIN_ROUNDS,
    threshold: float = DEFAULT_DOMINANCE_THRESHOLD,
    n_boot: int = DEFAULT_N_BOOT,
    seed: int = DEFAULT_SEED,
) -> Diagnosis:
    """Diagnose one worker from their Phase-A candidate rows."""
    uid = str(worker_candidates["user_id"].iloc[0]) if len(worker_candidates) else ""
    k = len(standardizer.columns)
    chosen_sets = build_choice_sets(worker_candidates, standardizer, "is_chosen")
    oracle_sets = build_choice_sets(worker_candidates, standardizer, "is_oracle")
    n = len(chosen_sets)

    if n < min_rounds or len(oracle_sets) < min_rounds:
        return Diagnosis(uid, n, "none", WEAKNESS_LABEL["none"], 0.0,
                         {c: 0.0 for c in standardizer.columns},
                         {w: 0.0 for w in WEAKNESS_FEATURE})

    bias = _bias_from_sets(chosen_sets, oracle_sets, standardizer.columns, ridge)
    strengths = _bias_to_strengths(bias)
    dominant, strength = _dominant_from_strengths(strengths, threshold)

    # Bootstrap stability of the dominant label over resampled rounds.
    rng = np.random.default_rng(seed)
    agree = 0
    for _ in range(max(0, n_boot)):
        idx = rng.integers(0, n, n)
        bs_chosen = [chosen_sets[i] for i in idx]
        bs_oracle = [oracle_sets[i] for i in idx]
        bbias = _bias_from_sets(bs_chosen, bs_oracle, standardizer.columns, ridge)
        bdom, _ = _dominant_from_strengths(_bias_to_strengths(bbias), threshold)
        agree += int(bdom == dominant)
    confidence = (agree / n_boot) if n_boot else 1.0

    return Diagnosis(
        user_id=uid, n_rounds=n, dominant_weakness=dominant,
        dominant_label=WEAKNESS_LABEL[dominant], confidence=confidence,
        bias_vector=bias, weakness_strengths=strengths, bias_strength=strength,
    )


def diagnose_all(
    candidates_df,
    phase: str = "A",
    ridge: float = DEFAULT_RIDGE,
    min_rounds: int = DEFAULT_MIN_ROUNDS,
    n_boot: int = DEFAULT_N_BOOT,
    standardizer: Standardizer | None = None,
):
    """Diagnose every worker with enough Phase-`phase` rounds. Returns a DataFrame."""
    import pandas as pd

    df = candidates_df
    if phase and "phase" in df.columns:
        df = df[df["phase"] == phase]
    std = standardizer or fit_standardizer(df)
    rows = []
    for uid, grp in df.groupby("user_id"):
        d = diagnose_worker(grp, std, ridge=ridge, min_rounds=min_rounds, n_boot=n_boot)
        rows.append(d.to_row())
    return pd.DataFrame(rows).sort_values("user_id").reset_index(drop=True)


# --------------------------------------------------------------------------- #
# B7: split-half test-retest reliability on the pilot.                        #
# --------------------------------------------------------------------------- #
def split_half_reliability(
    candidates_df,
    phase: str = "A",
    ridge: float = DEFAULT_RIDGE,
    min_rounds: int = 2,
    n_boot: int = 0,
) -> dict[str, Any]:
    """
    Split each worker's Phase-`phase` rounds into interleaved halves, diagnose
    each half, and report test-retest agreement of the dominant weakness.
    Pool standardization is shared across halves. Pilot data is not modified.
    """
    import pandas as pd

    df = candidates_df
    if phase and "phase" in df.columns:
        df = df[df["phase"] == phase]
    std = fit_standardizer(df)

    pairs: list[tuple[str, str]] = []
    per_worker = []
    for uid, grp in df.groupby("user_id"):
        rounds = sorted(grp["round_index"].unique())
        if len(rounds) < 2 * min_rounds:
            continue
        a_rounds = set(rounds[0::2])  # interleaved split (odd/even by order)
        b_rounds = set(rounds[1::2])
        ga = grp[grp["round_index"].isin(a_rounds)]
        gb = grp[grp["round_index"].isin(b_rounds)]
        da = diagnose_worker(ga, std, ridge=ridge, min_rounds=min_rounds, n_boot=n_boot)
        db = diagnose_worker(gb, std, ridge=ridge, min_rounds=min_rounds, n_boot=n_boot)
        pairs.append((da.dominant_weakness, db.dominant_weakness))
        per_worker.append({
            "user_id": uid, "half_a": da.dominant_weakness,
            "half_b": db.dominant_weakness, "agree": int(da.dominant_weakness == db.dominant_weakness),
        })

    n = len(pairs)
    agree = sum(1 for a, b in pairs if a == b)
    p_observed = agree / n if n else float("nan")
    kappa = _cohen_kappa([a for a, _ in pairs], [b for _, b in pairs]) if n else float("nan")
    return {
        "n_workers": n,
        "percent_agreement": p_observed,
        "cohen_kappa": kappa,
        "per_worker": per_worker,
    }


def _cohen_kappa(a: list[str], b: list[str]) -> float:
    labels = sorted(set(a) | set(b))
    if not labels:
        return float("nan")
    idx = {l: i for i, l in enumerate(labels)}
    n = len(a)
    m = np.zeros((len(labels), len(labels)))
    for x, y in zip(a, b):
        m[idx[x], idx[y]] += 1
    po = np.trace(m) / n
    row = m.sum(axis=1) / n
    col = m.sum(axis=0) / n
    pe = float(row @ col)
    if abs(1 - pe) < 1e-12:
        return 1.0 if po >= 1 - 1e-12 else 0.0
    return float((po - pe) / (1 - pe))


# --------------------------------------------------------------------------- #
# Convenience: load the verified pilot export.                                #
# --------------------------------------------------------------------------- #
def load_pilot_candidates(export_dir: str):
    import pandas as pd
    from pathlib import Path
    return pd.read_csv(Path(export_dir) / "candidates.csv")
