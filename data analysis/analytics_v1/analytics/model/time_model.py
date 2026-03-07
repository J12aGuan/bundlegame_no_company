"""Modeled-time utilities mirrored from game logic."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from analytics.config import LOCAL_TRAVEL_BUNDLE_SAVE_RATE, SECONDS_PER_UNIQUE_ITEM_DEFAULT


def manhattan_distance(a: tuple[int, int], b: tuple[int, int]) -> int:
    return abs((a[0] if a else 0) - (b[0] if b else 0)) + abs((a[1] if a else 0) - (b[1] if b else 0))


def normalize_item_keys(items: dict[str, Any] | None) -> list[str]:
    if not isinstance(items, dict):
        return []
    out = []
    for key in items.keys():
        normalized = str(key or "").lower().strip()
        if normalized:
            out.append(normalized)
    return out


def find_item_position(locations: list[Any], item_name: str) -> tuple[int, int] | None:
    needle = str(item_name or "").lower().strip()
    for r, row in enumerate(locations or []):
        cells = row
        if isinstance(row, dict) and isinstance(row.get("cells"), list):
            cells = row["cells"]
        if not isinstance(cells, list):
            cells = []
        for c, value in enumerate(cells):
            if str(value or "").lower().strip() == needle:
                return (r, c)
    return None


def resolve_store_config(store_dataset: dict[str, Any], store_name: str) -> dict[str, Any] | None:
    stores = store_dataset.get("stores", []) if isinstance(store_dataset, dict) else []
    for store in stores:
        if str(store.get("store", "")) == str(store_name or ""):
            return store
    return None


def get_cross_city_extra_time(
    order_city: str,
    current_city: str,
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
) -> float:
    if not order_city or not current_city or order_city == current_city:
        return 0.0

    travel_times = (cities_dataset or {}).get("travelTimes", {})
    direct = travel_times.get(current_city, {}).get(order_city)
    if isinstance(direct, (int, float)) and direct > 0:
        return float(direct)

    legacy_distances = (store_dataset or {}).get("distances", {})
    row = legacy_distances.get(current_city, {}) if isinstance(legacy_distances, dict) else {}
    destinations = row.get("destinations", []) if isinstance(row, dict) else []
    distances = row.get("distances", []) if isinstance(row, dict) else []

    try:
        idx = destinations.index(order_city)
    except Exception:
        return 0.0

    value = distances[idx] if idx < len(distances) else 0
    return float(value) if isinstance(value, (int, float)) and value > 0 else 0.0


def estimate_pick_item_seconds(order: dict[str, Any], store_config: dict[str, Any]) -> float:
    locations = store_config.get("locations", []) if isinstance(store_config, dict) else []
    entrance = store_config.get("Entrance", [0, 0]) if isinstance(store_config, dict) else [0, 0]
    if not isinstance(entrance, list) or len(entrance) < 2:
        entrance = [0, 0]

    seconds_per_cell = float(store_config.get("cellDistance", 1000) or 1000) / 1000.0
    unique_items = normalize_item_keys(order.get("items", {}))
    current = (int(entrance[0]), int(entrance[1]))
    walk_steps = 0

    for item in unique_items:
        pos = find_item_position(locations, item)
        if not pos:
            continue
        walk_steps += manhattan_distance(current, pos)
        current = pos

    return (walk_steps * seconds_per_cell) + (len(unique_items) * SECONDS_PER_UNIQUE_ITEM_DEFAULT)


def item_access_seconds(store_config: dict[str, Any], item_name: str) -> float:
    locations = store_config.get("locations", []) if isinstance(store_config, dict) else []
    entrance = store_config.get("Entrance", [0, 0]) if isinstance(store_config, dict) else [0, 0]
    if not isinstance(entrance, list) or len(entrance) < 2:
        entrance = [0, 0]
    seconds_per_cell = float(store_config.get("cellDistance", 1000) or 1000) / 1000.0

    pos = find_item_position(locations, item_name)
    if not pos:
        return 0.0
    return manhattan_distance((int(entrance[0]), int(entrance[1])), pos) * seconds_per_cell


def calculate_shared_item_travel_savings(
    orders: list[dict[str, Any]],
    store_dataset: dict[str, Any],
) -> float:
    if len(orders) <= 1:
        return 0.0

    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for order in orders:
        groups[(str(order.get("store", "")), str(order.get("city", "")))].append(order)

    savings = 0.0
    for (store_name, _city), group_orders in groups.items():
        if len(group_orders) < 2:
            continue

        cfg = resolve_store_config(store_dataset, store_name)
        if not cfg:
            continue

        item_counts: dict[str, int] = defaultdict(int)
        for order in group_orders:
            unique = set(normalize_item_keys(order.get("items", {})))
            for item in unique:
                item_counts[item] += 1

        for item, count in item_counts.items():
            if count <= 1:
                continue
            savings += item_access_seconds(cfg, item) * (count - 1)

        total_local_travel = 0.0
        for order in group_orders:
            base = max(0.0, float(order.get("estimatedTime", 0) or 0))
            pick = max(0.0, estimate_pick_item_seconds(order, cfg))
            total_local_travel += max(0.0, base - pick)

        savings += total_local_travel * LOCAL_TRAVEL_BUNDLE_SAVE_RATE

    return max(0.0, savings)


def compute_modeled_bundle_time(
    bundle_orders: list[dict[str, Any]],
    current_city: str,
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
) -> float:
    simulated_city = str(current_city or "")
    order_times: list[float] = []

    for order in bundle_orders:
        base = float(order.get("estimatedTime", 0) or 0)
        extra = get_cross_city_extra_time(
            str(order.get("city", "")),
            simulated_city,
            cities_dataset,
            store_dataset,
        )
        order_times.append(max(0.0, base + extra))
        if order.get("city"):
            simulated_city = str(order.get("city"))

    raw_total = sum(order_times)
    savings = calculate_shared_item_travel_savings(bundle_orders, store_dataset)
    return max(0.0, raw_total - savings)
