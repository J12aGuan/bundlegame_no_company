"""JSON adapter for analytics pipeline."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from analytics.types import ScenarioBundle, SourcePayload


def _read_json(path: str | Path) -> Any:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_from_json(
    data_json_path: str,
    scenario_bundle_json_path: str | None = None,
) -> SourcePayload:
    """
    Load participant and scenario data from local JSON.

    Supported participant payload shapes:
    1) downloader export: [ {id, actions, orders, ...}, ... ]
    2) wrapped object: {"participants": [...], "scenario_bundle": {...}}
    """
    raw = _read_json(data_json_path)

    participants: list[dict[str, Any]]
    scenario_raw: dict[str, Any] | None = None

    if isinstance(raw, list):
        participants = raw
    elif isinstance(raw, dict):
        participants = raw.get("participants", [])
        maybe_bundle = raw.get("scenario_bundle")
        if isinstance(maybe_bundle, dict):
            scenario_raw = maybe_bundle
    else:
        raise ValueError("Unsupported data JSON format.")

    if not isinstance(participants, list):
        raise ValueError("participants must be a list.")

    if scenario_raw is None:
        if not scenario_bundle_json_path:
            raise ValueError(
                "Scenario bundle missing. Provide --scenario-bundle-json or include scenario_bundle in --data-json."
            )
        loaded = _read_json(scenario_bundle_json_path)
        if not isinstance(loaded, dict):
            raise ValueError("Scenario bundle JSON must be an object.")
        scenario_raw = loaded

    bundle = ScenarioBundle(
        scenarios=list(scenario_raw.get("scenarios", [])),
        orders=list(scenario_raw.get("orders", [])),
        optimal=list(scenario_raw.get("optimal", [])),
        metadata=dict(scenario_raw.get("metadata", {})),
    )

    return SourcePayload(participants=participants, scenario_bundle=bundle)
