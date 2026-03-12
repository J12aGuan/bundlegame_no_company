import json
from pathlib import Path

from analytics.pipeline.decision_fact import build_decision_fact


FIXTURES = Path(__file__).parent / "fixtures"


def _load(name: str):
    with (FIXTURES / name).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def test_ordered_exact_match_logic():
    participants = _load("participants_fixture.json")
    scenario_bundle = _load("scenario_bundle_fixture.json")
    stores = _load("stores_fixture.json")
    cities = _load("cities_fixture.json")

    rows, _issues = build_decision_fact(
        participants=participants,
        scenario_bundle=scenario_bundle,
        dataset_root="experiment",
        cities_dataset=cities,
        store_dataset=stores,
    )

    p1_r1 = next(r for r in rows if r["participant_id"] == "p1" and r["round_index"] == 1)
    p2_r1 = next(r for r in rows if r["participant_id"] == "p2" and r["round_index"] == 1)

    assert p1_r1["is_exact_optimal"] == 1
    assert p2_r1["is_exact_optimal"] == 0


def test_near_optimal_threshold_and_failure_bucket():
    participants = _load("participants_fixture.json")
    scenario_bundle = _load("scenario_bundle_fixture.json")
    stores = _load("stores_fixture.json")
    cities = _load("cities_fixture.json")

    rows, _issues = build_decision_fact(
        participants=participants,
        scenario_bundle=scenario_bundle,
        dataset_root="experiment",
        cities_dataset=cities,
        store_dataset=stores,
    )

    p1_r2 = next(r for r in rows if r["participant_id"] == "p1" and r["round_index"] == 2)
    assert p1_r2["is_failure"] == 1
    assert p1_r2["is_near_optimal"] == 0
    assert p1_r2["participant_earnings"] == 0.0
    assert p1_r2["score_ratio_to_best"] is None

    for row in rows:
        if row["score_ratio_to_best"] is not None:
            expected = int(row["score_ratio_to_best"] >= 0.95)
            assert row["is_near_optimal"] == expected


def test_classification_propagation_and_phase_fallback():
    participants = _load("participants_fixture.json")
    scenario_bundle = _load("scenario_bundle_fixture.json")
    stores = _load("stores_fixture.json")
    cities = _load("cities_fixture.json")

    rows, issues = build_decision_fact(
        participants=participants,
        scenario_bundle=scenario_bundle,
        dataset_root="experiment",
        cities_dataset=cities,
        store_dataset=stores,
    )

    p1_r1 = next(r for r in rows if r["participant_id"] == "p1" and r["round_index"] == 1)
    p1_r2 = next(r for r in rows if r["participant_id"] == "p1" and r["round_index"] == 2)
    assert p1_r1["classification"] in {"easy", "medium", "hard", "unclassified"}
    assert p1_r2["phase"] == "B"
    assert not any(issue["issue_type"] == "missing_classification" for issue in issues)
