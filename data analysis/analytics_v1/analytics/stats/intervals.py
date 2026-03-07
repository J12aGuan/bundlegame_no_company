"""Confidence intervals for rates and continuous metrics."""

from __future__ import annotations

import random
from math import sqrt
from statistics import mean, median

from analytics.config import WILSON_Z_95


def wilson_interval(x: int, n: int, z: float = WILSON_Z_95) -> tuple[float | None, float | None]:
    if n <= 0:
        return (None, None)
    p = x / n
    z2 = z * z
    denom = 1 + z2 / n
    center = (p + z2 / (2 * n)) / denom
    half = z * sqrt((p * (1 - p) / n) + (z2 / (4 * n * n))) / denom
    return (max(0.0, center - half), min(1.0, center + half))


def bootstrap_ci(
    values: list[float],
    statistic: str = "median",
    b: int = 2000,
    seed: int = 42,
    alpha: float = 0.05,
) -> tuple[float | None, float | None]:
    if not values:
        return (None, None)
    if len(values) == 1:
        return (values[0], values[0])

    if statistic not in {"median", "mean"}:
        raise ValueError("statistic must be 'median' or 'mean'")

    rng = random.Random(seed)
    n = len(values)
    samples = []

    for _ in range(max(1, b)):
        resample = [values[rng.randrange(n)] for _ in range(n)]
        samples.append(median(resample) if statistic == "median" else mean(resample))

    samples.sort()
    lo_idx = int((alpha / 2) * (len(samples) - 1))
    hi_idx = int((1 - alpha / 2) * (len(samples) - 1))
    return samples[lo_idx], samples[hi_idx]
