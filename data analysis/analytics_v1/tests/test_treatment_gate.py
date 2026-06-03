"""Tests for the treatment-aware snapshot gate (E11)."""

from analytics.qa.treatment_gate import evaluate_treatment_aware_gate


def _complete_rows():
    return [
        {"scaffold_type": "no_ai", "phase": "A", "decision_timestamp": "2026-01-01T00:00:00Z", "success": 1, "recommended_bundle_ids": "[]"},
        {"scaffold_type": "matched", "phase": "B", "decision_timestamp": "2026-01-01T00:01:00Z", "success": 0, "recommended_bundle_ids": '["o1"]'},
        {"scaffold_type": "generic", "phase": "B", "decision_timestamp": "2026-01-01T00:02:00Z", "success": 1, "recommended_bundle_ids": '["o2"]'},
        {"scaffold_type": "mismatched", "phase": "C", "decision_timestamp": "2026-01-01T00:03:00Z", "success": 1, "recommended_bundle_ids": "[]"},
    ]


def test_complete_dataset_is_treatment_aware():
    res = evaluate_treatment_aware_gate(_complete_rows())
    assert res.treatment_aware is True
    assert all(res.gates.values())
    assert res.reasons == []


def test_missing_timestamps_blocks_label():
    rows = _complete_rows()
    rows[1]["decision_timestamp"] = ""
    res = evaluate_treatment_aware_gate(rows)
    assert res.treatment_aware is False
    assert res.gates["timestamps_populated"] is False
    assert any("missing_timestamps" in r for r in res.reasons)


def test_censored_success_blocks_label():
    rows = _complete_rows()
    rows[2]["success"] = ""  # success-censoring (the pilot's defect)
    res = evaluate_treatment_aware_gate(rows)
    assert res.treatment_aware is False
    assert res.gates["success_populated"] is False


def test_missing_arms_blocks_label():
    rows = _complete_rows()
    rows[0]["scaffold_type"] = ""
    res = evaluate_treatment_aware_gate(rows)
    assert res.treatment_aware is False
    assert res.gates["arms_populated"] is False


def test_no_recommendation_shown_blocks_label():
    rows = _complete_rows()
    for r in rows:
        r["recommended_bundle_ids"] = "[]"  # never actually showed a recommendation
    res = evaluate_treatment_aware_gate(rows)
    assert res.treatment_aware is False
    assert res.gates["recommendations_shown_in_phase_b"] is False


def test_baseline_pilot_shape_is_not_treatment_aware():
    # Pilot rows: no scaffold_type, no shown recommendations -> must be blocked.
    rows = [
        {"scaffold_type": "", "phase": "A", "decision_timestamp": "", "success": 1, "recommended_bundle_ids": "[]"},
        {"scaffold_type": "", "phase": "B", "decision_timestamp": "", "success": 1, "recommended_bundle_ids": "[]"},
    ]
    res = evaluate_treatment_aware_gate(rows)
    assert res.treatment_aware is False
    assert len(res.reasons) >= 2
