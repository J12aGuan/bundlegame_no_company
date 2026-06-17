"""
Treatment-aware snapshot gate (CHI main study, DoD E11).

A dataset may only be labeled **treatment-aware** when every instrumentation
field the confirmatory analysis depends on is populated. This gate fixes the
pilot's two defects (success-censoring and missing timestamps) by *blocking* the
label unless arms, scaffold types, decision timestamps, and the binary success
outcome are all present, plus at least one Phase-B round actually showed a
recommendation.

Pure-stdlib over a list of row dicts (or a pandas DataFrame via .to_dict),
so it has no heavy dependencies and is easy to unit-test.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

TREATED_SCAFFOLD_TYPES = {"generic", "matched", "mismatched"}
ALL_SCAFFOLD_TYPES = {"no_ai"} | TREATED_SCAFFOLD_TYPES


def _is_blank(v: Any) -> bool:
    if v is None:
        return True
    s = str(v).strip().lower()
    return s in ("", "nan", "none", "null", "[]")


@dataclass
class GateResult:
    treatment_aware: bool
    gates: dict[str, bool]
    reasons: list[str] = field(default_factory=list)
    counts: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "treatment_aware": self.treatment_aware,
            "gates": self.gates,
            "reasons": self.reasons,
            "counts": self.counts,
        }


def evaluate_treatment_aware_gate(
    rows: Iterable[dict[str, Any]],
    *,
    arm_field: str = "scaffold_type",
    phase_field: str = "phase",
    timestamp_field: str = "decision_timestamp",
    success_field: str = "success",
    recommended_field: str = "recommended_bundle_ids",
    treatment_phase: str = "B",
) -> GateResult:
    """Return a GateResult; ``treatment_aware`` is True only if all gates pass."""
    rows = [dict(r) for r in rows]
    n = len(rows)
    treated_rows = [r for r in rows if str(r.get(arm_field, "")).strip() in TREATED_SCAFFOLD_TYPES]
    phase_b_rows = [r for r in rows if str(r.get(phase_field, "")).strip() == treatment_phase]

    # Gate 1: arms / scaffold types populated and valid on every row.
    blank_arm = sum(1 for r in rows if _is_blank(r.get(arm_field)))
    bad_arm = sum(1 for r in rows if not _is_blank(r.get(arm_field))
                  and str(r.get(arm_field)).strip() not in ALL_SCAFFOLD_TYPES)
    has_arms = (n > 0) and blank_arm == 0 and bad_arm == 0

    # Gate 2: at least one treated arm present (a real treatment was delivered).
    has_treated = len(treated_rows) > 0

    # Gate 3: decision timestamps populated on every row (no missing-timestamp).
    missing_ts = sum(1 for r in rows if _is_blank(r.get(timestamp_field)))
    has_timestamps = (n > 0) and missing_ts == 0

    # Gate 4: binary success populated on every row (no success-censoring).
    missing_success = sum(
        1 for r in rows
        if _is_blank(r.get(success_field)) or str(r.get(success_field)).strip() not in ("0", "1", "true", "false", "True", "False")
    )
    has_success = (n > 0) and missing_success == 0

    # Gate 5: at least one Phase-B treated round actually showed a recommendation.
    shown = sum(
        1 for r in phase_b_rows
        if str(r.get(arm_field, "")).strip() in TREATED_SCAFFOLD_TYPES
        and not _is_blank(r.get(recommended_field))
    )
    has_shown_recommendations = shown > 0

    gates = {
        "arms_populated": has_arms,
        "treated_arm_present": has_treated,
        "timestamps_populated": has_timestamps,
        "success_populated": has_success,
        "recommendations_shown_in_phase_b": has_shown_recommendations,
    }
    reasons = []
    if not has_arms:
        reasons.append(f"missing_or_invalid_scaffold_type: {blank_arm} blank, {bad_arm} invalid of {n} rows")
    if not has_treated:
        reasons.append("no treated-arm (generic/matched/mismatched) rows present")
    if not has_timestamps:
        reasons.append(f"missing_timestamps: {missing_ts}/{n} rows")
    if not has_success:
        reasons.append(f"missing_or_censored_success: {missing_success}/{n} rows")
    if not has_shown_recommendations:
        reasons.append("no Phase-B treated round logged a shown recommendation")

    return GateResult(
        treatment_aware=all(gates.values()),
        gates=gates,
        reasons=reasons,
        counts={
            "n_rows": n,
            "n_treated_rows": len(treated_rows),
            "n_phase_b_rows": len(phase_b_rows),
            "n_phase_b_shown": shown,
        },
    )
