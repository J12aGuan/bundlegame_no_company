"""Point-estimate metrics for dashboard tiles and tables."""

from __future__ import annotations

from collections import defaultdict
from statistics import mean, median
from typing import Any


def percentile(values: list[float], q: float) -> float:
    if not values:
        return float("nan")
    xs = sorted(values)
    if len(xs) == 1:
        return xs[0]
    idx = (len(xs) - 1) * q
    lo = int(idx)
    hi = min(lo + 1, len(xs) - 1)
    frac = idx - lo
    return xs[lo] * (1 - frac) + xs[hi] * frac


def summarize_continuous(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {
            "n": 0,
            "mean": None,
            "median": None,
            "q1": None,
            "q3": None,
            "iqr": None,
        }
    q1 = percentile(values, 0.25)
    q3 = percentile(values, 0.75)
    return {
        "n": len(values),
        "mean": mean(values),
        "median": median(values),
        "q1": q1,
        "q3": q3,
        "iqr": q3 - q1,
    }


def summarize_rate(values: list[int | float]) -> dict[str, float | int | None]:
    if not values:
        return {"n": 0, "x": 0, "rate": None}
    x = sum(1 for v in values if float(v) > 0)
    n = len(values)
    return {"n": n, "x": x, "rate": x / n}


def group_rows(rows: list[dict[str, Any]], group_key: str) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[str(row.get(group_key, ""))].append(row)
    return grouped
