"""Cohort comparison helpers."""

from __future__ import annotations

import random
from math import erf, sqrt
from statistics import median


def _normal_cdf(x: float) -> float:
    return 0.5 * (1 + erf(x / sqrt(2)))


def two_proportion_z_test(x1: int, n1: int, x2: int, n2: int) -> dict[str, float | None]:
    if min(n1, n2) <= 0:
        return {"diff": None, "z": None, "p_value": None}

    p1 = x1 / n1
    p2 = x2 / n2
    pooled = (x1 + x2) / (n1 + n2)
    se = sqrt(max(0.0, pooled * (1 - pooled) * (1 / n1 + 1 / n2)))

    if se == 0:
        return {"diff": p1 - p2, "z": None, "p_value": None}

    z = (p1 - p2) / se
    p = 2 * (1 - _normal_cdf(abs(z)))
    return {"diff": p1 - p2, "z": z, "p_value": p}


def bootstrap_diff_median_ci(
    values_a: list[float],
    values_b: list[float],
    b: int = 2000,
    seed: int = 42,
    alpha: float = 0.05,
) -> tuple[float | None, float | None, float | None]:
    if not values_a or not values_b:
        return (None, None, None)

    rng = random.Random(seed)
    na = len(values_a)
    nb = len(values_b)
    diffs = []

    for _ in range(max(1, b)):
        sa = [values_a[rng.randrange(na)] for _ in range(na)]
        sb = [values_b[rng.randrange(nb)] for _ in range(nb)]
        diffs.append(median(sa) - median(sb))

    diffs.sort()
    point = median(values_a) - median(values_b)
    lo_idx = int((alpha / 2) * (len(diffs) - 1))
    hi_idx = int((1 - alpha / 2) * (len(diffs) - 1))
    return point, diffs[lo_idx], diffs[hi_idx]
