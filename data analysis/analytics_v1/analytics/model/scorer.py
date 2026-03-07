"""Scoring helpers for participant and optimal bundles."""

from __future__ import annotations

from typing import Any

from analytics.model.time_model import compute_modeled_bundle_time


def compute_score(earnings: float, modeled_time: float) -> float | None:
    if modeled_time <= 0:
        return None
    return float(earnings) / float(modeled_time)


def score_bundle(
    bundle_ids: list[str],
    orders_by_id: dict[str, dict[str, Any]],
    current_city: str,
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
    earnings_override: float | None = None,
) -> dict[str, Any]:
    missing = [order_id for order_id in bundle_ids if order_id not in orders_by_id]
    if missing:
        return {
            "bundle_ids": bundle_ids,
            "missing_order_ids": missing,
            "modeled_time": None,
            "earnings": None,
            "score": None,
        }

    bundle_orders = [orders_by_id[order_id] for order_id in bundle_ids]
    modeled_time = compute_modeled_bundle_time(
        bundle_orders=bundle_orders,
        current_city=current_city,
        cities_dataset=cities_dataset,
        store_dataset=store_dataset,
    )

    earnings = (
        float(earnings_override)
        if earnings_override is not None
        else float(sum(float(order.get("earnings", 0) or 0) for order in bundle_orders))
    )

    return {
        "bundle_ids": bundle_ids,
        "missing_order_ids": [],
        "modeled_time": modeled_time,
        "earnings": earnings,
        "score": compute_score(earnings, modeled_time),
    }
