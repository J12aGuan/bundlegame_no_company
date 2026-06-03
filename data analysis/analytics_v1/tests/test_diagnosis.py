"""Tests for the worker cost-blindness diagnosis module (CHI main study).

Covers (a) parameter recovery on synthetic workers with a *known* injected
weakness, and (b) a smoke run of the split-half reliability path. No real
participant data is required for the unit tests.
"""

from __future__ import annotations

import pytest

# The diagnosis module needs a numeric stack (declared in the `dev`/`diagnosis`
# extras). Skip cleanly if it is unavailable rather than erroring at collection.
pytest.importorskip("numpy")
pytest.importorskip("scipy")
pytest.importorskip("pandas")

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from analytics import diagnosis as dg  # noqa: E402


# --------------------------------------------------------------------------- #
# Synthetic choice-data generator with a known decision rule.                 #
# --------------------------------------------------------------------------- #
def _make_worker(user_id, rule, n_rounds=14, n_alt=5, seed=0):
    """Build candidates-shaped rows for one worker.

    `rule(features_dict) -> utility` selects the chosen alternative; the oracle
    always maximizes the *normative* utility (earnings minus every time cost).
    """
    rng = np.random.default_rng(seed)
    rows = []
    for r in range(1, n_rounds + 1):
        # Comparable leverage across attributes so each weakness is identifiable
        # (the experiment's own "stress the neglected axis" requirement).
        earnings = rng.uniform(0, 30, n_alt)
        pick = rng.uniform(0, 30, n_alt)
        cross = rng.uniform(0, 30, n_alt)
        local = rng.uniform(0, 30, n_alt)
        shared = rng.uniform(0, 12, n_alt)
        normative = earnings - pick - cross - local + 0.5 * shared
        worker_u = np.array([
            rule(dict(earnings=earnings[i], pick=pick[i], cross=cross[i],
                      local=local[i], shared=shared[i]))
            for i in range(n_alt)
        ])
        oracle_idx = int(np.argmax(normative))
        chosen_idx = int(np.argmax(worker_u))
        for i in range(n_alt):
            rows.append({
                "user_id": user_id, "round_index": r, "phase": "A", "legal": 1,
                "is_chosen": int(i == chosen_idx), "is_oracle": int(i == oracle_idx),
                "earnings": earnings[i],
                "effective_pick_time_seconds": pick[i],
                "cross_city_travel_time_seconds": cross[i],
                "local_travel_time_seconds": local[i],
                "shared_item_savings_seconds": shared[i],
            })
    return pd.DataFrame(rows)


# Decision rules for injected weaknesses.
def rule_pick_neglect(f):   # ignores pick cost entirely -> W1
    return f["earnings"] - f["cross"] - f["local"]


def rule_crosscity_neglect(f):  # ignores cross-city cost -> W2
    return f["earnings"] - f["pick"] - f["local"]


def rule_payout_chaser(f):  # over-weights earnings (3x) but still penalizes costs -> W3
    return 3.0 * f["earnings"] - f["pick"] - f["cross"] - f["local"]


def rule_normative(f):  # matches the oracle -> 'none'
    return f["earnings"] - f["pick"] - f["cross"] - f["local"] + 0.5 * f["shared"]


@pytest.mark.parametrize("rule,expected", [
    (rule_pick_neglect, "W1"),
    (rule_crosscity_neglect, "W2"),
    (rule_payout_chaser, "W3"),
])
def test_diagnosis_recovers_injected_weakness(rule, expected):
    df = _make_worker("w1", rule, seed=1)
    std = dg.fit_standardizer(df)
    diag = dg.diagnose_worker(df, std, n_boot=0)
    assert diag.dominant_weakness == expected, (
        f"expected {expected}, got {diag.dominant_weakness} "
        f"(strengths={diag.weakness_strengths})")
    # The diagnosed attribute should carry the largest positive bias.
    assert diag.weakness_strengths[expected] > 0


def test_normative_worker_is_not_strongly_biased():
    df = _make_worker("w0", rule_normative, seed=2)
    std = dg.fit_standardizer(df)
    diag = dg.diagnose_worker(df, std, n_boot=0)
    # A worker who follows the oracle should not show a large W1/W2/W3 bias.
    assert abs(diag.bias_strength) < 1.0


def test_too_few_rounds_returns_none():
    df = _make_worker("wshort", rule_pick_neglect, n_rounds=2, seed=3)
    std = dg.fit_standardizer(df)
    diag = dg.diagnose_worker(df, std, min_rounds=3, n_boot=0)
    assert diag.dominant_weakness == "none"
    assert diag.confidence == 0.0


def test_diagnose_all_and_confidence_bounds():
    workers = pd.concat([
        _make_worker("pick", rule_pick_neglect, seed=10),
        _make_worker("cross", rule_crosscity_neglect, seed=11),
        _make_worker("pay", rule_payout_chaser, seed=12),
    ], ignore_index=True)
    out = dg.diagnose_all(workers, phase="A", n_boot=40)
    assert set(out["user_id"]) == {"pick", "cross", "pay"}
    assert (out["diagnosis_confidence"].between(0.0, 1.0)).all()
    by = dict(zip(out["user_id"], out["diagnosed_weakness"]))
    assert by["pick"] == "W1" and by["cross"] == "W2" and by["pay"] == "W3"


def test_split_half_reliability_runs():
    # Cleanly-separable W1/W2 workers with enough rounds for a well-powered split.
    workers = pd.concat([
        _make_worker(f"pick{i}", rule_pick_neglect, n_rounds=24, seed=20 + i) for i in range(4)
    ] + [
        _make_worker(f"cross{i}", rule_crosscity_neglect, n_rounds=24, seed=40 + i) for i in range(4)
    ], ignore_index=True)
    rel = dg.split_half_reliability(workers, phase="A", min_rounds=3, n_boot=0)
    assert rel["n_workers"] == 8
    assert 0.0 <= rel["percent_agreement"] <= 1.0
    assert -1.0 <= rel["cohen_kappa"] <= 1.0
    # Agreement must beat chance (4 labels -> 0.25). The *precise* reliability is
    # an empirical quantity reported from the pilot, not asserted here, because
    # split-half stability scales with each worker's bias strength (ties to H4).
    assert rel["percent_agreement"] >= 0.5
    assert rel["cohen_kappa"] > 0.0
