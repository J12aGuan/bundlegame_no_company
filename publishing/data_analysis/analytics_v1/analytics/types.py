"""Typed structures used by analytics pipeline."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ScenarioBundle:
    scenarios: list[dict[str, Any]]
    orders: list[dict[str, Any]]
    optimal: list[dict[str, Any]]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class SourcePayload:
    participants: list[dict[str, Any]]
    scenario_bundle: ScenarioBundle


@dataclass
class QAIssue:
    severity: str
    issue_type: str
    participant_id: str
    round_index: int | None
    scenario_id: str
    message: str
