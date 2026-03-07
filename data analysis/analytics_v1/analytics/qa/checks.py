"""QA checks for decision rows."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from analytics.types import QAIssue


def check_multi_store_bundle(
    participant_id: str,
    round_index: int,
    scenario_id: str,
    chosen_orders: list[str],
    orders_by_id: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    if len(chosen_orders) <= 1:
        return []

    stores = []
    for order_id in chosen_orders:
        order = orders_by_id.get(order_id)
        if not order:
            continue
        stores.append(str(order.get("store", "")))

    stores_set = {s for s in stores if s}
    if len(stores_set) <= 1:
        return []

    issue = QAIssue(
        severity="warning",
        issue_type="invalid_bundle_store_mismatch",
        participant_id=participant_id,
        round_index=round_index,
        scenario_id=scenario_id,
        message="Selected multi-order bundle spans multiple stores.",
    )
    return [asdict(issue)]
