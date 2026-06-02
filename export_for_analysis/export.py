#!/usr/bin/env python3
"""
BundleGame -> analysis-ready export.

Regenerates every file in ``export_for_analysis/``:
    rounds.csv, candidates.csv, scenarios.csv, participants.csv,
    orders.csv, stores.csv, travel_matrix.csv,
    DATA_DICTIONARY.md, QUALITY_REPORT.md

Design goals
------------
* **Source of truth = the repo's own reward model.** All modeled-time and score
  derivations reuse ``analytics.model.time_model`` / ``analytics.model.scorer``
  and decision extraction reuses ``analytics.pipeline.normalize``. Nothing about
  the scoring is re-invented here, only *decomposed* into the reported
  components so the identity ``total = effective_pick + local_travel + cross_city``
  holds exactly against ``compute_modeled_bundle_time``.

* **Source-agnostic & reproducible.** Data is resolved in this priority order:
    1. ``--source firestore`` (or env creds detected) -> live Firestore pull.
       Requires ``GOOGLE_APPLICATION_CREDENTIALS`` or an Application Default
       Credentials login. Reads creds from the environment only; never prints
       or hardcodes secrets. (Not exercised when no creds are present.)
    2. Env / CLI supplied JSON: ``--participants-json``, ``--scenario-bundle-json``,
       ``--cities-json``, ``--stores-json`` (or the matching ``BUNDLEGAME_*`` env
       vars).
    3. Repo ``analytics_v1`` fixtures -> a clearly labelled **SAMPLE** export.

* **De-identified.** ``user_id`` is a stable salted SHA-256 hash. No emails,
  names, Qualtrics free-text, IPs, or raw timestamps reach the CSVs.

Run:
    python export_for_analysis/export.py            # SAMPLE from repo fixtures
    python export_for_analysis/export.py --source firestore --dataset-root mainGame
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path
from typing import Any

# --------------------------------------------------------------------------- #
# Locate the repo + the analytics_v1 package, and import the reward model.     #
# --------------------------------------------------------------------------- #
HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
ANALYTICS_DIR = REPO_ROOT / "data analysis" / "analytics_v1"
FIXTURE_DIR = ANALYTICS_DIR / "tests" / "fixtures"

if str(ANALYTICS_DIR) not in sys.path:
    sys.path.insert(0, str(ANALYTICS_DIR))

from analytics.config import (  # noqa: E402
    LOCAL_TRAVEL_BUNDLE_SAVE_RATE,
    NEAR_OPTIMAL_THRESHOLD,
)
from analytics.model.scorer import compute_score, score_bundle  # noqa: E402
from analytics.model.time_model import (  # noqa: E402
    calculate_shared_item_travel_savings,
    compute_modeled_bundle_time,
    estimate_pick_item_seconds,
    get_cross_city_extra_time,
    item_access_seconds,
    normalize_item_keys,
    resolve_store_config,
)
from analytics.pipeline.normalize import (  # noqa: E402
    get_action_summary_reconstructed_decisions,
    get_latest_round_summaries,
    merge_decision_sources,
)

# --------------------------------------------------------------------------- #
# Canonical protocol constants (mirror src/lib/researchStudy.js).             #
# --------------------------------------------------------------------------- #
PROTOCOL_VERSION = "bundlegame_abc_50_round_v1"
PROTOCOL_ID = "bundlegame_abc_recommendation_v1"
TOTAL_ROUNDS = 50
LEGAL_ACTION_MASK_VERSION = "legal_bundle_mask_v1"
PHASE_PLAN = [  # (id, round_start, round_end, recommendations_enabled)
    ("A", 1, 15, False),
    ("B", 16, 35, True),
    ("C", 36, 50, False),
]
# Non-secret, documented salt. Override with BUNDLEGAME_PSEUDONYM_SALT for a
# private stable pseudonym mapping across exports.
DEFAULT_PSEUDONYM_SALT = "bundlegame_export_for_analysis_v1"

FLOAT_TOL = 1e-6


def phase_for_round(round_index: int) -> str:
    for phase_id, start, end, _ in PHASE_PLAN:
        if start <= round_index <= end:
            return phase_id
    return ""


def recommendations_enabled_for_round(round_index: int) -> bool:
    for _, start, end, enabled in PHASE_PLAN:
        if start <= round_index <= end:
            return enabled
    return False


# --------------------------------------------------------------------------- #
# Small helpers.                                                              #
# --------------------------------------------------------------------------- #
def hash_user_id(raw_id: str, salt: str) -> str:
    digest = hashlib.sha256(f"{salt}:{raw_id}".encode("utf-8")).hexdigest()
    return f"u_{digest[:16]}"


def jdump(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def bundle_signature(order_ids: list[str]) -> str:
    return "|".join(sorted(str(o).strip() for o in order_ids if str(o).strip()))


def round_or_none(value: Any, digits: int = 4) -> Any:
    if value is None:
        return None
    return round(float(value), digits)


# --------------------------------------------------------------------------- #
# Data source resolution.                                                     #
# --------------------------------------------------------------------------- #
def _read_json(path: str | Path) -> Any:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def firestore_creds_present() -> bool:
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        return True
    # Application Default Credentials login dir (gcloud).
    adc = Path.home() / ".config" / "gcloud" / "application_default_credentials.json"
    return adc.exists()


def load_live_firestore(dataset_root: str) -> dict[str, Any]:
    """Live Firestore pull. Only invoked when creds are present.

    Intentionally minimal: defers to firebase-admin if installed, reading
    credentials from the environment (never hardcoded). Raises a clear,
    actionable error if the dependency or creds are unavailable so the caller
    can fall back to fixtures.
    """
    try:
        import firebase_admin  # type: ignore
        from firebase_admin import firestore  # type: ignore
    except Exception as exc:  # pragma: no cover - depends on optional dep
        raise RuntimeError(
            "Live Firestore pull requires the 'firebase-admin' package and "
            "GOOGLE_APPLICATION_CREDENTIALS / ADC. Falling back to fixtures. "
            f"(import error: {exc})"
        )
    if not firebase_admin._apps:  # pragma: no cover - needs real creds
        firebase_admin.initialize_app()
    db = firestore.client()  # pragma: no cover - needs real creds
    raise RuntimeError(
        "Live Firestore export is wired but not implemented for this offline run; "
        "use the repo's `npm run firestore:export:*` tooling to materialize JSON, "
        "then pass it via --participants-json / --scenario-bundle-json."
    )


def resolve_source(args: argparse.Namespace) -> dict[str, Any]:
    """Return {participants, scenario_bundle, cities, stores, meta}."""
    participants_json = args.participants_json or os.environ.get(
        "BUNDLEGAME_PARTICIPANTS_JSON"
    )
    scenario_json = args.scenario_bundle_json or os.environ.get(
        "BUNDLEGAME_SCENARIO_BUNDLE_JSON"
    )
    cities_json = args.cities_json or os.environ.get("BUNDLEGAME_CITIES_JSON")
    stores_json = args.stores_json or os.environ.get("BUNDLEGAME_STORES_JSON")

    requested_firestore = args.source == "firestore"
    if requested_firestore or (args.source == "auto" and firestore_creds_present()
                               and not participants_json):
        try:
            live = load_live_firestore(args.dataset_root)
            live["meta"] = {"source": "firestore", "is_sample": False,
                            "dataset_root": args.dataset_root}
            return live
        except RuntimeError as exc:
            print(f"[warn] {exc}", file=sys.stderr)
            if requested_firestore:
                # Explicit request failed -> still fall back, but make it loud.
                print("[warn] Falling back to fixtures/sample data.", file=sys.stderr)

    # Env/CLI-supplied JSON.
    if participants_json and scenario_json:
        participants = _read_json(participants_json)
        scenario_bundle = _read_json(scenario_json)
        cities = _read_json(cities_json) if cities_json else {}
        stores = _read_json(stores_json) if stores_json else {}
        return {
            "participants": participants if isinstance(participants, list)
            else participants.get("participants", []),
            "scenario_bundle": scenario_bundle,
            "cities": cities,
            "stores": stores,
            "meta": {"source": "supplied_json", "is_sample": False,
                     "dataset_root": args.dataset_root},
        }

    # Fixture fallback (SAMPLE).
    return {
        "participants": _read_json(FIXTURE_DIR / "participants_fixture.json"),
        "scenario_bundle": _read_json(FIXTURE_DIR / "scenario_bundle_fixture.json"),
        "cities": _read_json(FIXTURE_DIR / "cities_fixture.json"),
        "stores": _read_json(FIXTURE_DIR / "stores_fixture.json"),
        "meta": {"source": "analytics_v1_fixtures", "is_sample": True,
                 "dataset_root": "experiment"},
    }


# --------------------------------------------------------------------------- #
# Reward-model decomposition (consistent with analytics.model.time_model).    #
# --------------------------------------------------------------------------- #
def savings_components(
    bundle_orders: list[dict[str, Any]],
    store_dataset: dict[str, Any],
) -> tuple[float, float]:
    """Split shared-item savings into (pick_savings, local_travel_savings).

    Mirrors ``calculate_shared_item_travel_savings`` exactly so that the two
    parts sum to its return value.
    """
    if len(bundle_orders) <= 1:
        return 0.0, 0.0

    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for order in bundle_orders:
        groups[(str(order.get("store", "")), str(order.get("city", "")))].append(order)

    pick_savings = 0.0
    local_savings = 0.0
    for (store_name, _city), group_orders in groups.items():
        if len(group_orders) < 2:
            continue
        cfg = resolve_store_config(store_dataset, store_name)
        if not cfg:
            continue
        item_counts: dict[str, int] = defaultdict(int)
        for order in group_orders:
            for item in set(normalize_item_keys(order.get("items", {}))):
                item_counts[item] += 1
        for item, count in item_counts.items():
            if count <= 1:
                continue
            pick_savings += item_access_seconds(cfg, item) * (count - 1)

        total_local_travel = 0.0
        for order in group_orders:
            base = max(0.0, float(order.get("estimatedTime", 0) or 0))
            pick = max(0.0, estimate_pick_item_seconds(order, cfg))
            total_local_travel += max(0.0, base - pick)
        local_savings += total_local_travel * LOCAL_TRAVEL_BUNDLE_SAVE_RATE

    return max(0.0, pick_savings), max(0.0, local_savings)


def decompose_bundle(
    order_ids: list[str],
    orders_by_id: dict[str, dict[str, Any]],
    current_city: str,
    cities_dataset: dict[str, Any],
    store_dataset: dict[str, Any],
    earnings_override: float | None = None,
) -> dict[str, Any]:
    """Score + decompose a single bundle into reported time components.

    Returns None-valued components when orders are missing. When store grids are
    unavailable the pick/local split is left empty (None) but total/cross-city/
    savings are still reported.
    """
    missing = [o for o in order_ids if o not in orders_by_id]
    bundle_orders = [orders_by_id[o] for o in order_ids if o in orders_by_id]

    if missing or not bundle_orders:
        return {
            "missing_order_ids": missing,
            "earnings": None,
            "total_time_seconds": None,
            "travel_time_seconds": None,
            "local_travel_time_seconds": None,
            "cross_city_travel_time_seconds": None,
            "effective_pick_time_seconds": None,
            "pick_time_seconds": None,
            "shared_item_savings_seconds": None,
            "score": None,
            "ending_city": None,
            "split_ok": False,
        }

    # Walk the bundle in delivery order, mirroring compute_modeled_bundle_time.
    sim_city = str(current_city or "")
    gross_pick = 0.0
    gross_local = 0.0
    cross_city = 0.0
    have_grids = True
    for order in bundle_orders:
        base = max(0.0, float(order.get("estimatedTime", 0) or 0))
        extra = get_cross_city_extra_time(
            str(order.get("city", "")), sim_city, cities_dataset, store_dataset
        )
        cross_city += extra
        cfg = resolve_store_config(store_dataset, str(order.get("store", "")))
        if cfg:
            pick = min(base, max(0.0, estimate_pick_item_seconds(order, cfg)))
            gross_pick += pick
            gross_local += max(0.0, base - pick)
        else:
            have_grids = False
            gross_local += base  # cannot split without a store grid
        if order.get("city"):
            sim_city = str(order.get("city"))

    pick_savings, local_savings = savings_components(bundle_orders, store_dataset)
    total_savings = calculate_shared_item_travel_savings(bundle_orders, store_dataset)
    total_time = compute_modeled_bundle_time(
        bundle_orders, current_city, cities_dataset, store_dataset
    )
    earnings = (
        float(earnings_override)
        if earnings_override is not None
        else float(sum(float(o.get("earnings", 0) or 0) for o in bundle_orders))
    )
    score = compute_score(earnings, total_time) if total_time and total_time > 0 else None

    effective_pick = gross_pick - pick_savings if have_grids else None
    local_travel = (gross_local - local_savings) if have_grids else None
    travel = (local_travel + cross_city) if local_travel is not None else None

    # Identity check: total == effective_pick + local_travel + cross_city, and
    # pick_savings + local_savings == calculate_shared_item_travel_savings.
    split_ok = True
    if have_grids:
        recomposed = (effective_pick or 0.0) + (local_travel or 0.0) + cross_city
        if abs(recomposed - total_time) > 1e-4 or abs(
            (pick_savings + local_savings) - total_savings
        ) > 1e-4:
            split_ok = False
            effective_pick = None
            local_travel = None
            travel = None

    return {
        "missing_order_ids": [],
        "earnings": earnings,
        "total_time_seconds": total_time,
        "travel_time_seconds": travel,
        "local_travel_time_seconds": local_travel,
        "cross_city_travel_time_seconds": cross_city,
        "effective_pick_time_seconds": effective_pick,
        "pick_time_seconds": (gross_pick if have_grids else None),
        "shared_item_savings_seconds": total_savings,
        "score": score,
        "ending_city": sim_city,
        "split_ok": split_ok,
    }


# --------------------------------------------------------------------------- #
# Candidate enumeration (legal action set), per scenario.                     #
# --------------------------------------------------------------------------- #
def is_multi_store(order_ids: list[str], orders_by_id: dict[str, Any]) -> bool:
    stores = {
        str((orders_by_id.get(o) or {}).get("store", ""))
        for o in order_ids
        if str((orders_by_id.get(o) or {}).get("store", ""))
    }
    return len(stores) > 1


def enumerate_legal_bundles(order_ids: list[str], max_bundle: int,
                            orders_by_id: dict[str, Any]) -> list[list[str]]:
    """Single-store bundles of size 1..min(len, max_bundle) (legal_bundle_mask_v1)."""
    out: list[list[str]] = []
    cap = min(len(order_ids), max(1, int(max_bundle or len(order_ids) or 1)))
    for size in range(1, cap + 1):
        for combo in combinations(order_ids, size):
            combo = list(combo)
            if is_multi_store(combo, orders_by_id):
                continue
            out.append(combo)
    return out


# --------------------------------------------------------------------------- #
# Index helpers.                                                              #
# --------------------------------------------------------------------------- #
def build_indexes(scenario_bundle: dict[str, Any]) -> dict[str, Any]:
    scenarios = scenario_bundle.get("scenarios", []) or []
    orders = scenario_bundle.get("orders", []) or []
    optimal = scenario_bundle.get("optimal", []) or []

    scenario_by_round: dict[int, dict[str, Any]] = {}
    scenario_by_id: dict[str, dict[str, Any]] = {}
    for sc in scenarios:
        if not isinstance(sc, dict):
            continue
        try:
            r = int(sc.get("round", 0))
        except Exception:
            r = 0
        if r:
            scenario_by_round[r] = sc
        if str(sc.get("scenario_id", "")):
            scenario_by_id[str(sc.get("scenario_id"))] = sc

    order_by_id = {
        str(o.get("id", "")): o for o in orders
        if isinstance(o, dict) and str(o.get("id", ""))
    }
    optimal_by_scenario = {
        str(e.get("scenario_id", "")): e for e in optimal
        if isinstance(e, dict) and str(e.get("scenario_id", ""))
    }
    return {
        "scenario_by_round": scenario_by_round,
        "scenario_by_id": scenario_by_id,
        "order_by_id": order_by_id,
        "optimal_by_scenario": optimal_by_scenario,
    }


# --------------------------------------------------------------------------- #
# Core build.                                                                 #
# --------------------------------------------------------------------------- #
def build_tables(source: dict[str, Any], salt: str) -> dict[str, Any]:
    participants = source["participants"]
    scenario_bundle = source["scenario_bundle"]
    cities = source["cities"] or {}
    stores = source["stores"] or {}
    meta = source["meta"]
    dataset_root = meta.get("dataset_root", "")

    idx = build_indexes(scenario_bundle)
    scenario_by_round = idx["scenario_by_round"]
    scenario_by_id = idx["scenario_by_id"]
    order_by_id = idx["order_by_id"]
    optimal_by_scenario = idx["optimal_by_scenario"]

    starting_location = str(
        cities.get("startinglocation")
        or scenario_bundle.get("metadata", {}).get("startinglocation")
        or ""
    )
    scenario_set_version_id = str(
        scenario_bundle.get("metadata", {}).get("scenarioSetVersionId") or ""
    ).strip()
    dataset_snapshot_id = scenario_set_version_id or dataset_root or "unknown_snapshot"

    # Canonical round_summary decisions, plus reconstruction of older participants
    # who only logged the compact Action/orderSummary format (mirrors decision_fact).
    round_summary_decisions, qa_rs = get_latest_round_summaries(participants)
    reconstructed_decisions, qa_rec = get_action_summary_reconstructed_decisions(
        participants, scenario_bundle, scenario_set_version_id, starting_location,
    )
    decisions, qa_merge = merge_decision_sources(
        round_summary_decisions, reconstructed_decisions,
    )
    qa_decisions = [*qa_rs, *qa_rec, *qa_merge]

    rounds_rows: list[dict[str, Any]] = []
    candidate_rows: list[dict[str, Any]] = []
    qa_notes: list[dict[str, Any]] = list(qa_decisions)

    # Per-participant carried city (mirrors decision_fact participant_city).
    participant_city: dict[str, str] = {}
    # Per-participant summary for participants.csv.
    participant_meta: dict[str, dict[str, Any]] = {}
    for p in participants:
        if not isinstance(p, dict):
            continue
        pid = str(p.get("id", ""))
        summary_map = (
            (p.get("summaryDoc") or p.get("progressSummary") or {})
            .get("summaryByScenarioSetVersionId", {})
        )
        summary_entry = summary_map.get(scenario_set_version_id, {}) if scenario_set_version_id else {}
        if not summary_entry and summary_map:
            # legacy / single-version: take the only entry
            summary_entry = next(iter(summary_map.values()), {}) if len(summary_map) == 1 else {}
        participant_meta[pid] = {
            "cohort": str(p.get("cohort", "") or ""),
            "completed_game": bool(summary_entry.get("completedGame")) if summary_entry else None,
            "rounds_completed": summary_entry.get("roundsCompleted"),
            "total_rounds": summary_entry.get("totalRounds"),
        }

    for decision in decisions:
        pid = str(decision["participant_id"])
        round_index = int(decision["round_index"])
        chosen_orders = [str(o) for o in decision["chosen_orders"]]
        success = bool(decision["success"])

        scenario = scenario_by_id.get(str(decision.get("scenario_id", ""))) \
            or scenario_by_round.get(round_index)
        if not scenario:
            qa_notes.append({"issue_type": "missing_scenario_for_round",
                             "participant_id": pid, "round_index": round_index,
                             "message": "No scenario for round; row skipped."})
            continue
        scenario_id = str(decision.get("scenario_id") or scenario.get("scenario_id", ""))

        # current_city: carried, else order fallback, else starting location.
        current_city = str(
            decision.get("current_city")
            or participant_city.get(pid, starting_location)
            or ""
        )
        if not current_city and chosen_orders:
            current_city = str((order_by_id.get(chosen_orders[0]) or {}).get("city", ""))

        scenario_order_ids = [str(o) for o in scenario.get("order_ids", []) if str(o)]
        max_bundle = int(scenario.get("max_bundle", len(scenario_order_ids)) or len(scenario_order_ids))

        legal_bundles = enumerate_legal_bundles(scenario_order_ids, max_bundle, order_by_id)
        legal_sigs = {bundle_signature(b) for b in legal_bundles}

        # Candidate set = legal bundles (+ the chosen bundle if not already legal).
        candidate_defs: list[tuple[list[str], int]] = [(b, 1) for b in legal_bundles]
        chosen_sig = bundle_signature(chosen_orders)
        if chosen_orders and chosen_sig not in legal_sigs:
            candidate_defs.append((list(chosen_orders), 0))

        # Score every candidate.
        scored: list[dict[str, Any]] = []
        for order_ids, legal in candidate_defs:
            comp = decompose_bundle(order_ids, order_by_id, current_city, cities, stores)
            if comp.get("split_ok") is False and comp.get("total_time_seconds") is not None:
                qa_notes.append({"issue_type": "time_component_split_unavailable",
                                 "participant_id": pid, "round_index": round_index,
                                 "scenario_id": scenario_id,
                                 "message": f"Pick/local split unavailable for bundle {bundle_signature(order_ids)}."})
            scored.append({"order_ids": order_ids, "legal": legal, **comp})

        # Oracle = best score among legal candidates (ties -> larger bundle),
        # mirroring _evaluate_dynamic_candidates.
        legal_scored = [c for c in scored if c["legal"] == 1 and c["score"] is not None]
        legal_scored.sort(key=lambda c: (c["score"], len(c["order_ids"])), reverse=True)
        oracle = legal_scored[0] if legal_scored else None
        oracle_sig = bundle_signature(oracle["order_ids"]) if oracle else ""
        best_score = oracle["score"] if oracle else None
        second_score = legal_scored[1]["score"] if len(legal_scored) > 1 else None

        # Chosen candidate row.
        chosen = next((c for c in scored if bundle_signature(c["order_ids"]) == chosen_sig), None)
        chosen_score = chosen["score"] if chosen else None

        ratio = (chosen_score / best_score) if (chosen_score is not None and best_score) else None
        regret = (1 - ratio) if ratio is not None else None
        exact_optimal = bool(oracle and sorted(chosen_orders) == sorted(oracle["order_ids"]))

        phase = str(decision.get("phase") or scenario.get("phase") or phase_for_round(round_index))

        # ---- candidates.csv rows (one per user x round x candidate) ----
        for c in scored:
            sig = bundle_signature(c["order_ids"])
            c_ratio = (c["score"] / best_score) if (c["score"] is not None and best_score) else None
            c_regret = (1 - c_ratio) if c_ratio is not None else None
            candidate_rows.append({
                "user_id": hash_user_id(pid, salt),
                "round_index": round_index,
                "phase": phase,
                "scenario_id": scenario_id,
                "bundle_id": f"{scenario_id}::{sig}" if sig else f"{scenario_id}::<empty>",
                "order_ids": jdump(c["order_ids"]),
                "is_chosen": int(sig == chosen_sig),
                "is_oracle": int(bool(oracle) and sig == oracle_sig),
                "legal": int(c["legal"]),
                "score": round_or_none(c["score"], 6),
                "earnings": round_or_none(c["earnings"], 4),
                "total_time_seconds": round_or_none(c["total_time_seconds"]),
                "travel_time_seconds": round_or_none(c["travel_time_seconds"]),
                "local_travel_time_seconds": round_or_none(c["local_travel_time_seconds"]),
                "cross_city_travel_time_seconds": round_or_none(c["cross_city_travel_time_seconds"]),
                "effective_pick_time_seconds": round_or_none(c["effective_pick_time_seconds"]),
                "shared_item_savings_seconds": round_or_none(c["shared_item_savings_seconds"]),
                "ending_city": c["ending_city"],
                "regret_to_best": round_or_none(c_regret, 6),
                "score_ratio_to_best": round_or_none(c_ratio, 6),
            })

        # QA: exactly one chosen / one oracle per (user, round).
        n_chosen = sum(1 for c in scored if bundle_signature(c["order_ids"]) == chosen_sig)
        if n_chosen != 1:
            qa_notes.append({"issue_type": "chosen_candidate_count",
                             "participant_id": pid, "round_index": round_index,
                             "scenario_id": scenario_id,
                             "message": f"Expected 1 chosen candidate, found {n_chosen}."})
        if oracle is None:
            qa_notes.append({"issue_type": "no_legal_oracle",
                             "participant_id": pid, "round_index": round_index,
                             "scenario_id": scenario_id,
                             "message": "No scoreable legal candidate; oracle undefined."})

        # ---- rounds.csv row ----
        chosen_comp = chosen or {}
        oracle_comp = oracle or {}
        rounds_rows.append({
            "user_id": hash_user_id(pid, salt),
            "round_index": round_index,
            "phase": phase,
            "scenario_id": scenario_id,
            "chosen_orders": jdump(chosen_orders),
            "bundle_size": len(chosen_orders),
            "success": int(success),
            "earnings": round_or_none(decision.get("participant_earnings"), 4),
            "duration": round_or_none(decision.get("duration"), 4),
            "regret_to_best": round_or_none(regret, 6),
            "score_ratio_to_best": round_or_none(ratio, 6),
            "exact_optimal": int(exact_optimal),
            "near_optimal": int(ratio is not None and ratio >= NEAR_OPTIMAL_THRESHOLD),
            "policy_arm": str(decision.get("policy_arm", "") or ""),
            "recommendation_source": str(decision.get("recommendation_source", "") or ""),
            "shown_recommendation_bundle_ids": jdump(
                decision.get("shown_recommendation_bundle_ids", []) or []),
            "decision_source": str(decision.get("decision_source", "")),
            "timestamp_available": int(decision.get("timestamp_available", 0) or 0),
            "legal_action_mask_version": str(
                decision.get("legal_action_mask_version", "") or LEGAL_ACTION_MASK_VERSION),
            "dataset_snapshot_id": dataset_snapshot_id,
            # chosen time components
            "chosen_total_time_seconds": round_or_none(chosen_comp.get("total_time_seconds")),
            "chosen_travel_time_seconds": round_or_none(chosen_comp.get("travel_time_seconds")),
            "chosen_local_travel_time_seconds": round_or_none(chosen_comp.get("local_travel_time_seconds")),
            "chosen_cross_city_travel_time_seconds": round_or_none(chosen_comp.get("cross_city_travel_time_seconds")),
            "chosen_effective_pick_time_seconds": round_or_none(chosen_comp.get("effective_pick_time_seconds")),
            "chosen_shared_item_savings_seconds": round_or_none(chosen_comp.get("shared_item_savings_seconds")),
            "chosen_ending_city": chosen_comp.get("ending_city"),
            # oracle time components
            "oracle_total_time_seconds": round_or_none(oracle_comp.get("total_time_seconds")),
            "oracle_travel_time_seconds": round_or_none(oracle_comp.get("travel_time_seconds")),
            "oracle_local_travel_time_seconds": round_or_none(oracle_comp.get("local_travel_time_seconds")),
            "oracle_cross_city_travel_time_seconds": round_or_none(oracle_comp.get("cross_city_travel_time_seconds")),
            "oracle_effective_pick_time_seconds": round_or_none(oracle_comp.get("effective_pick_time_seconds")),
            "oracle_shared_item_savings_seconds": round_or_none(oracle_comp.get("shared_item_savings_seconds")),
            "oracle_ending_city": oracle_comp.get("ending_city"),
        })

        if success and decision.get("final_location"):
            participant_city[pid] = str(decision.get("final_location"))

    # ----------------------------------------------------------------- #
    # scenarios.csv + orders.csv + stores.csv + travel_matrix.csv       #
    # ----------------------------------------------------------------- #
    scenario_rows: list[dict[str, Any]] = []
    for sc in scenario_bundle.get("scenarios", []) or []:
        if not isinstance(sc, dict):
            continue
        try:
            r = int(sc.get("round", 0))
        except Exception:
            r = 0
        sid = str(sc.get("scenario_id", ""))
        order_ids = [str(o) for o in sc.get("order_ids", []) if str(o)]
        sc_orders = [order_by_id.get(o, {}) for o in order_ids]
        store_list = [str(o.get("store", "")) for o in sc_orders if str(o.get("store", ""))]
        city_list = [str(o.get("city", "")) for o in sc_orders if str(o.get("city", ""))]
        n_stores = len(set(store_list))
        n_cities = len(set(city_list))
        # store overlap: at least one store hosts >=2 of the menu's orders.
        store_counts: dict[str, int] = defaultdict(int)
        for s in store_list:
            store_counts[s] += 1
        store_overlap_flag = int(any(c >= 2 for c in store_counts.values()))
        dispersion_flag = int(n_cities >= 2)

        optimal = optimal_by_scenario.get(sid, {})
        best_score = optimal.get("best_score")
        second_score = optimal.get("second_best_score")
        if not (isinstance(best_score, (int, float)) and isinstance(second_score, (int, float))):
            # Datasets store best/second bundle ids but not scores. Derive a
            # canonical scenario difficulty by scoring every legal bundle at the
            # dataset starting location and taking the top two scores.
            mb = int(sc.get("max_bundle", len(order_ids)) or len(order_ids))
            sc_scores = []
            for b in enumerate_legal_bundles(order_ids, mb, order_by_id):
                comp = decompose_bundle(b, order_by_id, starting_location, cities, stores)
                if comp["score"] is not None:
                    sc_scores.append(comp["score"])
            sc_scores.sort(reverse=True)
            best_score = sc_scores[0] if sc_scores else None
            second_score = sc_scores[1] if len(sc_scores) > 1 else None
        score_gap = None
        relative_gap = None
        if isinstance(best_score, (int, float)) and isinstance(second_score, (int, float)):
            score_gap = float(best_score) - float(second_score)
            relative_gap = (score_gap / float(best_score)) if best_score else None

        scenario_rows.append({
            "round_index": r,
            "scenario_id": sid,
            "phase": str(sc.get("phase") or phase_for_round(r)),
            "order_ids": jdump(order_ids),
            "max_bundle": int(sc.get("max_bundle", len(order_ids)) or len(order_ids)),
            "classification": str(sc.get("classification", "") or ""),
            "score_gap": round_or_none(score_gap),
            "relative_gap": round_or_none(relative_gap, 6),
            "n_orders": len(order_ids),
            "n_distinct_stores": n_stores,
            "n_distinct_cities": n_cities,
            "store_overlap_flag": store_overlap_flag,
            "dispersion_flag": dispersion_flag,
            "recommendations_enabled": int(recommendations_enabled_for_round(r)),
        })

    order_rows: list[dict[str, Any]] = []
    for oid, o in order_by_id.items():
        order_rows.append({
            "order_id": oid,
            "store": str(o.get("store", "")),
            "city": str(o.get("city", "")),
            "items": jdump(list(normalize_item_keys(o.get("items", {})))),
            "n_unique_items": len(set(normalize_item_keys(o.get("items", {})))),
            "earnings": round_or_none(o.get("earnings"), 4),
            "estimatedTime": round_or_none(o.get("estimatedTime")),
            "localTravelTime": round_or_none(o.get("localTravelTime")),
        })

    store_rows: list[dict[str, Any]] = []
    for st in (stores.get("stores", []) if isinstance(stores, dict) else []):
        if not isinstance(st, dict):
            continue
        store_rows.append({
            "store": str(st.get("store", "")),
            "city": str(st.get("city", "")),
            "entrance": jdump(st.get("Entrance", [0, 0])),
            "cell_distance": round_or_none(st.get("cellDistance"), 2),
            "grid_rows": len(st.get("locations", []) or []),
        })

    travel_rows: list[dict[str, Any]] = []
    travel_times = (cities.get("travelTimes", {}) if isinstance(cities, dict) else {}) or {}
    for from_city, dests in travel_times.items():
        if not isinstance(dests, dict):
            continue
        for to_city, minutes in dests.items():
            travel_rows.append({
                "from_city": str(from_city),
                "to_city": str(to_city),
                "travel_time_seconds": round_or_none(minutes),
            })

    # ----------------------------------------------------------------- #
    # participants.csv                                                  #
    # ----------------------------------------------------------------- #
    # Observed arm per participant from any round_summary that carried one.
    arm_by_pid: dict[str, str] = {}
    rounds_by_pid: dict[str, set[int]] = defaultdict(set)
    for d in decisions:
        pid = str(d["participant_id"])
        rounds_by_pid[pid].add(int(d["round_index"]))
        arm = str(d.get("policy_arm", "") or "")
        if arm and pid not in arm_by_pid:
            arm_by_pid[pid] = arm

    participant_rows: list[dict[str, Any]] = []
    seen_pids = {str(p.get("id", "")) for p in participants if isinstance(p, dict)}
    for pid in sorted(seen_pids | set(rounds_by_pid)):
        m = participant_meta.get(pid, {})
        n_observed = len(rounds_by_pid.get(pid, set()))
        participant_rows.append({
            "user_id": hash_user_id(pid, salt),
            "arm": arm_by_pid.get(pid, "unknown"),
            "completed": (int(bool(m.get("completed_game")))
                          if m.get("completed_game") is not None else ""),
            "n_rounds_completed": (int(m["rounds_completed"])
                                   if isinstance(m.get("rounds_completed"), (int, float))
                                   else n_observed),
            "n_rounds_observed": n_observed,
            "expected_total_rounds": TOTAL_ROUNDS,
            "dataset_snapshot_id": dataset_snapshot_id,
            "cohort": m.get("cohort", ""),
        })

    return {
        "rounds": rounds_rows,
        "candidates": candidate_rows,
        "scenarios": scenario_rows,
        "orders": order_rows,
        "stores": store_rows,
        "travel_matrix": travel_rows,
        "participants": participant_rows,
        "qa_notes": qa_notes,
        "meta": {
            **meta,
            "dataset_snapshot_id": dataset_snapshot_id,
            "scenario_set_version_id": scenario_set_version_id,
            "protocol_version": PROTOCOL_VERSION,
            "protocol_id": PROTOCOL_ID,
        },
    }


# --------------------------------------------------------------------------- #
# CSV writing.                                                                #
# --------------------------------------------------------------------------- #
ROUNDS_COLUMNS = [
    "user_id", "round_index", "phase", "scenario_id", "chosen_orders", "bundle_size",
    "success", "earnings", "duration", "regret_to_best", "score_ratio_to_best",
    "exact_optimal", "near_optimal", "policy_arm", "recommendation_source",
    "shown_recommendation_bundle_ids", "decision_source", "timestamp_available",
    "legal_action_mask_version", "dataset_snapshot_id",
    "chosen_total_time_seconds", "chosen_travel_time_seconds",
    "chosen_local_travel_time_seconds", "chosen_cross_city_travel_time_seconds",
    "chosen_effective_pick_time_seconds", "chosen_shared_item_savings_seconds",
    "chosen_ending_city",
    "oracle_total_time_seconds", "oracle_travel_time_seconds",
    "oracle_local_travel_time_seconds", "oracle_cross_city_travel_time_seconds",
    "oracle_effective_pick_time_seconds", "oracle_shared_item_savings_seconds",
    "oracle_ending_city",
]
CANDIDATES_COLUMNS = [
    "user_id", "round_index", "phase", "scenario_id", "bundle_id", "order_ids",
    "is_chosen", "is_oracle", "legal", "score", "earnings", "total_time_seconds",
    "travel_time_seconds", "local_travel_time_seconds", "cross_city_travel_time_seconds",
    "effective_pick_time_seconds", "shared_item_savings_seconds", "ending_city",
    "regret_to_best", "score_ratio_to_best",
]
SCENARIOS_COLUMNS = [
    "round_index", "scenario_id", "phase", "order_ids", "max_bundle", "classification",
    "score_gap", "relative_gap", "n_orders", "n_distinct_stores", "n_distinct_cities",
    "store_overlap_flag", "dispersion_flag", "recommendations_enabled",
]
ORDERS_COLUMNS = ["order_id", "store", "city", "items", "n_unique_items", "earnings",
                  "estimatedTime", "localTravelTime"]
STORES_COLUMNS = ["store", "city", "entrance", "cell_distance", "grid_rows"]
TRAVEL_COLUMNS = ["from_city", "to_city", "travel_time_seconds"]
PARTICIPANTS_COLUMNS = ["user_id", "arm", "completed", "n_rounds_completed",
                        "n_rounds_observed", "expected_total_rounds",
                        "dataset_snapshot_id", "cohort"]


def write_csv(path: Path, columns: list[str], rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({c: ("" if row.get(c) is None else row.get(c)) for c in columns})


# --------------------------------------------------------------------------- #
# Documentation generation.                                                   #
# --------------------------------------------------------------------------- #
def write_data_dictionary(out_dir: Path, tables: dict[str, Any]) -> None:
    meta = tables["meta"]
    sample = meta.get("is_sample")
    banner = ("> **SAMPLE EXPORT** — built from the repo's `analytics_v1` test "
              "fixtures because no live Firestore credentials were available. "
              "Structure is production-faithful; values are illustrative.\n\n"
              if sample else "")
    text = f"""# BundleGame Export — Data Dictionary

{banner}**Source:** `{meta.get('source')}`  |  **Dataset root:** `{meta.get('dataset_root')}`  |  **Snapshot id:** `{meta.get('dataset_snapshot_id')}`
**Protocol:** `{meta.get('protocol_version')}` (`{meta.get('protocol_id')}`), 50 rounds, Phase A 1–15 (rec OFF), B 16–35 (rec by arm), C 36–50 (rec OFF).

All modeled-time and score values are produced by the repo's own reward model
(`data analysis/analytics_v1/analytics/model/time_model.py` + `scorer.py`). This
export only *decomposes* the modeled time into reported components; it does not
re-invent the scoring.

## Reward model (how score & the deadline term work)
* **Per-order modeled time** = `estimatedTime + cityTravelTime`, where
  `cityTravelTime` comes from `MasterData/cities.travelTimes` (same-city = 0).
* **Bundle modeled time** = Σ(order times) − shared-item savings, where savings
  come from store overlap: redundant item-pick walk savings plus a
  `{LOCAL_TRAVEL_BUNDLE_SAVE_RATE:g}×` reduction on within-store local travel
  (`calculate_shared_item_travel_savings`).
* **Score** = `earnings / modeled_time` (`compute_score`). Higher is better.
* **Deadline / on-time term:** the reward used for scoring is **continuous**
  (earnings-per-time); it does **not** subtract a deadline penalty. The
  **on-time / success outcome is modeled as a separate BINARY flag** (`success`),
  recorded per round in the participant's `round_summary`. The continuous score
  and the binary success outcome are independent columns — downstream code
  decides whether to gate score/regret on `success`. (This export reports modeled
  regret/score-ratio for every round regardless of `success`, with `success`
  alongside, so failed rounds can be filtered downstream.)

## Time-component identity
For every bundle: `total = effective_pick + local_travel + cross_city` and
`travel = local_travel + cross_city`. `shared_item_savings` is reported as the
savings amount netted out (so gross time = total + shared_item_savings). When a
store grid is unavailable the pick/local split is left empty (rare; flagged in
`qa_notes`).

## `rounds.csv` — one row per (user × round)
| column | type | units | provenance |
|---|---|---|---|
| user_id | str | — | `Users/{{id}}` → salted SHA-256 (`u_<16hex>`) |
| round_index | int | — | `round_summary.round_index` |
| phase | str A/B/C | — | derived from round (1–15/16–35/36–50); `round_summary.phase`/`scenario.phase` |
| scenario_id | str | — | `round_summary.scenario_id` / scenario lookup |
| chosen_orders | json[str] | — | `round_summary.chosen_orders` |
| bundle_size | int | orders | `len(chosen_orders)` (derived) |
| success | 0/1 | — | `round_summary.success` (binary on-time/complete outcome) |
| earnings | float | game-$ | `round_summary.earnings` (canonical Σ order.earnings) |
| duration | float | seconds | `round_summary.duration` (decision latency) |
| regret_to_best | float | ratio | derived `1 − chosen_score/oracle_score` |
| score_ratio_to_best | float | ratio | derived `chosen_score/oracle_score` |
| exact_optimal | 0/1 | — | chosen order-set == oracle order-set |
| near_optimal | 0/1 | — | `score_ratio ≥ {NEAR_OPTIMAL_THRESHOLD:g}` |
| policy_arm | str | — | `round_summary.policy_arm` (empty in SAMPLE) |
| recommendation_source | str | — | `round_summary.recommendation_source` (empty/none in SAMPLE) |
| shown_recommendation_bundle_ids | json[str] | — | `round_summary.shown_recommendation_bundle_ids` (empty in SAMPLE) |
| decision_source | str | — | `round_summary` or `action_summary_reconstructed` |
| timestamp_available | 0/1 | — | whether a usable timestamp existed (QA gate input) |
| legal_action_mask_version | str | — | `round_summary.legal_action_mask_version` |
| dataset_snapshot_id | str | — | scenarioSetVersionId / dataset root |
| chosen_total_time_seconds | float | s | decompose(chosen) total modeled time |
| chosen_travel_time_seconds | float | s | local + cross-city |
| chosen_local_travel_time_seconds | float | s | est-time minus pick, net of overlap savings |
| chosen_cross_city_travel_time_seconds | float | s | `get_cross_city_extra_time` summed |
| chosen_effective_pick_time_seconds | float | s | item-pick walk, net of redundant-pick savings |
| chosen_shared_item_savings_seconds | float | s | overlap savings netted from chosen bundle |
| chosen_ending_city | str | — | city of last order in delivery sequence |
| oracle_* (same six + ending_city) | float/str | s | decompose(oracle = regret==0 legal bundle) |

## `candidates.csv` — one row per (user × round × candidate bundle)
Every legal single-store bundle (`legal_bundle_mask_v1`: size 1..`max_bundle`,
one store) plus the participant's chosen bundle if it was illegal. Scored at the
participant's carried `current_city`, so candidate scores are genuinely per-user.
Columns: user_id, round_index, phase, scenario_id, bundle_id
(`<scenario>::<sorted order sig>`), order_ids(json), is_chosen(0/1),
is_oracle(0/1), legal(0/1), score, earnings, total_time_seconds,
travel_time_seconds, local_travel_time_seconds, cross_city_travel_time_seconds,
effective_pick_time_seconds, shared_item_savings_seconds, ending_city,
regret_to_best, score_ratio_to_best.
**Invariant:** exactly one `is_chosen==1` and exactly one `is_oracle==1` per
(user, round).

## `scenarios.csv` — one row per (round × scenario)
round_index, scenario_id, phase, order_ids(json), max_bundle, classification,
score_gap (`best_score − second_best_score` from `optimal[]`), relative_gap
(`score_gap/best_score`), n_orders, n_distinct_stores, n_distinct_cities,
store_overlap_flag (a store hosts ≥2 menu orders), dispersion_flag (≥2 cities),
recommendations_enabled. Companion tables: `orders.csv` (per-order
store/city/items/earnings/estimatedTime/localTravelTime), `stores.csv` (store grid
metadata), `travel_matrix.csv` (cross-city travel-time matrix from
`MasterData/cities`). Together these let downstream verify the intended 2×2 of
store-overlap × spatial-dispersion.

## `participants.csv` — de-identified
user_id (salted SHA-256), arm (`round_summary.policy_arm` or `unknown`),
completed (`summary.completedGame`), n_rounds_completed
(`summary.roundsCompleted`), n_rounds_observed (rounds seen in this export),
expected_total_rounds (50), dataset_snapshot_id, cohort (non-PII tag).
**Stripped:** emails, names, Qualtrics ids/free-text, IPs, raw timestamps.

## Empty / unpopulated target fields (and why)
* `policy_arm`, `recommendation_source`, `shown_recommendation_bundle_ids`,
  `arm` — empty/`unknown`: this dataset is **baseline/unaided** with no Phase-B
  treatment arms run, so no recommendation labels exist. See `QUALITY_REPORT.md`.
* `score_gap`/`relative_gap` — the dataset `optimal[]` block stores best/second
  bundle *ids* but not scores, so these are **derived** by scoring every legal
  bundle at the dataset starting location and taking the top-two score gap.
* pick/local split columns — empty only if a bundle's order is missing from the
  menu or a store grid is unavailable (rare; flagged in `qa_notes`).
"""
    (out_dir / "DATA_DICTIONARY.md").write_text(text, encoding="utf-8")


def write_quality_report(out_dir: Path, tables: dict[str, Any]) -> None:
    import pandas as pd  # local import keeps the core export pandas-free

    meta = tables["meta"]
    rounds = pd.DataFrame(tables["rounds"])
    candidates = pd.DataFrame(tables["candidates"])
    participants = pd.DataFrame(tables["participants"])
    scenarios = pd.DataFrame(tables["scenarios"])

    # Decision-source mix and coverage.
    src_counts = (rounds["decision_source"].value_counts().to_dict()
                  if not rounds.empty and "decision_source" in rounds else {})
    n_decision_participants = int(rounds["user_id"].nunique()) if not rounds.empty else 0
    n_reconstructed = int(src_counts.get("action_summary_reconstructed", 0))
    round_min = int(rounds["round_index"].min()) if not rounds.empty else 0
    round_max = int(rounds["round_index"].max()) if not rounds.empty else 0
    success_rate = round(float(rounds["success"].mean()), 3) if not rounds.empty else None

    # Phase distribution.
    phase_counts = rounds["phase"].value_counts().to_dict() if not rounds.empty else {}
    rounds_per_phase = (
        scenarios["phase"].value_counts().to_dict() if not scenarios.empty else {}
    )

    # 2x2 design coverage: store-overlap x spatial-dispersion (downstream goal).
    coverage_lines = []
    overlap_constant = None
    if not scenarios.empty:
        cov = (scenarios.groupby(["store_overlap_flag", "dispersion_flag"]).size()
               .reset_index(name="n"))
        for _, r in cov.iterrows():
            coverage_lines.append(
                f"  - overlap={int(r['store_overlap_flag'])}, "
                f"dispersion={int(r['dispersion_flag'])}: {int(r['n'])} scenarios")
        cells_present = {(int(a), int(b)) for a, b in
                         zip(cov["store_overlap_flag"], cov["dispersion_flag"])}
        full_2x2 = cells_present.issuperset({(0, 0), (0, 1), (1, 0), (1, 1)})
        if scenarios["store_overlap_flag"].nunique() == 1:
            overlap_constant = int(scenarios["store_overlap_flag"].iloc[0])
    coverage_block = "\n".join(coverage_lines) if coverage_lines else "  - (no scenarios)"
    coverage_note = ""
    if overlap_constant is not None:
        coverage_note = (f"\n**Note:** `store_overlap_flag` is constant "
                         f"(={overlap_constant}) across all scenarios, so the 2×2 of "
                         f"overlap × dispersion is **not fully spanned** — only the "
                         f"dispersion dimension varies. Treat overlap as a fixed design "
                         f"property, not a manipulated factor.")

    # Rounds whose chosen bundle is not scoreable (e.g. chosen order not in menu).
    noncomputable_chosen = 0
    if not rounds.empty:
        noncomputable_chosen = int(rounds["chosen_total_time_seconds"]
                                   .isna().sum()
                                   + (rounds["chosen_total_time_seconds"]
                                      .astype(str) == "").sum())

    # Per-column missingness for rounds.csv.
    miss_lines = []
    if not rounds.empty:
        for col in rounds.columns:
            n_missing = int((rounds[col].isna() | (rounds[col].astype(str) == "")).sum())
            if n_missing:
                miss_lines.append(f"  - `{col}`: {n_missing}/{len(rounds)} empty")
    miss_block = "\n".join(miss_lines) if miss_lines else "  - (no empty cells)"

    # Invariants on candidates.
    inv_ok = True
    inv_detail = []
    if not candidates.empty:
        grp = candidates.groupby(["user_id", "round_index"])
        chosen_per = grp["is_chosen"].sum()
        oracle_per = grp["is_oracle"].sum()
        bad_chosen = int((chosen_per != 1).sum())
        bad_oracle = int((oracle_per != 1).sum())
        inv_ok = (bad_chosen == 0 and bad_oracle == 0)
        inv_detail.append(f"  - (user,round) groups: {len(chosen_per)}")
        inv_detail.append(f"  - groups with !=1 is_chosen: {bad_chosen}")
        inv_detail.append(f"  - groups with !=1 is_oracle: {bad_oracle}")

    # QA gate flags (from the repo's named gates).
    qa = tables["qa_notes"]
    qa_types: dict[str, int] = {}
    for note in qa:
        t = str(note.get("issue_type", "unknown"))
        qa_types[t] = qa_types.get(t, 0) + 1
    missing_recommendation_labels = (
        not rounds.empty and (rounds["recommendation_source"].astype(str)
                              .replace("", "none").eq("none").all())
    )
    missing_timestamps = (
        not rounds.empty and int((rounds["timestamp_available"] == 0).sum()) or 0
    )
    completed_mismatch = qa_types.get("qa_completed_game_mismatch", 0)

    treatment_aware = bool(
        not rounds.empty
        and (rounds["recommendation_source"].astype(str).replace("", "none") != "none").any()
        and (rounds["shown_recommendation_bundle_ids"].astype(str)
             .replace("", "[]") != "[]").any()
    )

    completed = "—"
    partial = "—"
    if not participants.empty and "completed" in participants:
        comp_series = participants["completed"].astype(str)
        completed = int((comp_series == "1").sum())
        partial = int((comp_series == "0").sum())

    qa_lines = "\n".join(f"  - `{k}`: {v}" for k, v in sorted(qa_types.items())) or "  - (none)"

    banner = ("> **SAMPLE / baseline-only** — no live Firestore credentials were "
              "available, so this was built from the repo's `analytics_v1` test "
              "fixtures.\n\n" if meta.get("is_sample") else "")

    text = f"""# BundleGame Export — Quality Report

{banner}**Source:** `{meta.get('source')}`  |  **Snapshot id:** `{meta.get('dataset_snapshot_id')}`
**Generated:** {datetime.now(timezone.utc).isoformat(timespec='seconds')}

## Totals
| Table | Rows |
|---|---|
| rounds.csv | {len(rounds)} |
| candidates.csv | {len(candidates)} |
| scenarios.csv | {len(scenarios)} |
| participants.csv | {len(participants)} |
| orders.csv | {len(tables['orders'])} |
| stores.csv | {len(tables['stores'])} |
| travel_matrix.csv | {len(tables['travel_matrix'])} |

* **Participants:** {len(participants)}  (completed: {completed}, partial: {partial})
* **Participants with decision rows:** {n_decision_participants}
* **Decision rows (rounds):** {len(rounds)}

## Decision sources & coverage
* Source mix: {json.dumps(src_counts)}
* Round index range observed: {round_min}–{round_max}
* Overall `success` rate in export: {success_rate}

**Caveat:** {n_reconstructed} of {len(rounds)} rows are `action_summary_reconstructed`
(rebuilt from the compact `Action/orderSummary` logs for participants who predate
the timestamped `round_summary` schema). Per `DATA_SCHEMA.md`, these are **not
equivalent to timestamped rows**: the reconstruction only keeps rounds whose
success is confirmed, so reconstructed rows are all `success=1` and carry no
decision timestamp. For **failure-rate, temporal/learning, or recommendation**
analyses, filter to `decision_source == "round_summary"`. For excess-time
decomposition, per-worker bias logit, clustering, and routing analyses (which use
the modeled chosen/oracle components), both sources are usable.

## Rounds per phase
* From decision rows: {json.dumps(phase_counts)}
* From scenario menu (design coverage): {json.dumps(rounds_per_phase)}

## Design coverage — 2×2 (store-overlap × spatial-dispersion)
{coverage_block}
{coverage_note}

## Candidate invariants (exactly one chosen / one oracle per user×round)
{chr(10).join(inv_detail) if inv_detail else '  - (no candidate rows)'}
* **Invariant holds:** {"YES" if inv_ok else "NO"}

## Per-column missingness (rounds.csv)
{miss_block}

## Duplicates handled
* `get_latest_round_summaries` keeps the latest `round_summary` per (participant,
  round); duplicates are logged as `duplicate_round_summary`.
* candidates.csv keys (user_id, round_index, bundle_id) — duplicates: {0 if candidates.empty else int(candidates.duplicated(subset=['user_id','round_index','bundle_id']).sum())}

## Non-scoreable chosen bundles
* {noncomputable_chosen} round(s) have an empty chosen time-component / regret because
  the logged `chosen_orders` included an order id not present in the round's scenario
  menu (so the bundle is not scoreable under the reward model). `success` and
  `chosen_orders` are still recorded; the oracle and candidates for those rounds are
  unaffected.

## Repo QA gates
* `missing_recommendation_labels`: **{"PRESENT" if missing_recommendation_labels else "clear"}** — no recommendation labels on any row.
* `missing_timestamps`: {missing_timestamps} round(s) without a usable timestamp.
* `completed_game_mismatch`: {completed_mismatch} participant(s) flagged.

### Other QA notes
{qa_lines}

## Treatment-awareness
**Treatment-aware dataset (Phase B with real recommendations shown): {"PRESENT" if treatment_aware else "ABSENT"}.**
{"" if treatment_aware else "This is a **baseline / unaided-only** export: no rows carry a `policy_arm`, a non-`none` `recommendation_source`, or non-empty `shown_recommendation_bundle_ids`. Per `docs/current/EXPERIMENT_PROTOCOL.md`, do **not** make recommendation-treatment claims from this dataset. It is suitable for Phase-A unaided behavior, excess-time decomposition, per-worker bias logit, clustering, and order-level routing analysis."}
"""
    (out_dir / "QUALITY_REPORT.md").write_text(text, encoding="utf-8")


# --------------------------------------------------------------------------- #
# Main.                                                                       #
# --------------------------------------------------------------------------- #
def main() -> int:
    parser = argparse.ArgumentParser(description="BundleGame analysis export.")
    parser.add_argument("--source", choices=["auto", "firestore", "json", "fixtures"],
                        default="auto")
    parser.add_argument("--dataset-root", default="mainGame")
    parser.add_argument("--participants-json")
    parser.add_argument("--scenario-bundle-json")
    parser.add_argument("--cities-json")
    parser.add_argument("--stores-json")
    parser.add_argument("--out-dir", default=str(HERE))
    parser.add_argument("--salt", default=os.environ.get("BUNDLEGAME_PSEUDONYM_SALT",
                                                          DEFAULT_PSEUDONYM_SALT))
    args = parser.parse_args()
    if args.source == "fixtures":
        args.participants_json = None
        args.scenario_bundle_json = None

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    source = resolve_source(args)
    print(f"[info] data source: {source['meta']['source']} "
          f"(sample={source['meta']['is_sample']})")

    tables = build_tables(source, args.salt)

    write_csv(out_dir / "rounds.csv", ROUNDS_COLUMNS, tables["rounds"])
    write_csv(out_dir / "candidates.csv", CANDIDATES_COLUMNS, tables["candidates"])
    write_csv(out_dir / "scenarios.csv", SCENARIOS_COLUMNS, tables["scenarios"])
    write_csv(out_dir / "orders.csv", ORDERS_COLUMNS, tables["orders"])
    write_csv(out_dir / "stores.csv", STORES_COLUMNS, tables["stores"])
    write_csv(out_dir / "travel_matrix.csv", TRAVEL_COLUMNS, tables["travel_matrix"])
    write_csv(out_dir / "participants.csv", PARTICIPANTS_COLUMNS, tables["participants"])

    write_data_dictionary(out_dir, tables)
    write_quality_report(out_dir, tables)

    print(f"[info] wrote rounds={len(tables['rounds'])} "
          f"candidates={len(tables['candidates'])} "
          f"scenarios={len(tables['scenarios'])} "
          f"participants={len(tables['participants'])}")
    print(f"[info] output dir: {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
