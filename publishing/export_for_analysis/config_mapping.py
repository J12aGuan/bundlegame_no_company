"""
Drop-in column mapping for the downstream BundleGame analysis script.

These dicts map the downstream script's expected logical keys to the actual
column names produced by ``export.py`` in this folder. They are populated so the
downstream needs zero edits: point it at ``rounds.csv`` / ``candidates.csv`` and
read columns via ``COL`` / ``TIME_COMPONENTS`` / ``CHOICE_FEATURES``.

All time-component columns are in **seconds**. The chosen/oracle time split obeys
``total = travel + effective_pick`` and ``travel = local_travel + cross_city``;
``shared_savings`` is the overlap reduction netted out (gross = total + savings).
"""

# rounds.csv scalar columns ------------------------------------------------- #
COL = {
    "user": "user_id",
    "round": "round_index",
    "phase": "phase",
    "chosen": "chosen_orders",          # JSON list of chosen order ids
    "success": "success",               # binary on-time/complete outcome (0/1)
    "earnings": "earnings",
    "latency": "duration",              # decision latency, seconds
    "regret": "regret_to_best",
    "score_ratio": "score_ratio_to_best",
    # handy extras the downstream may want:
    "bundle_size": "bundle_size",
    "exact_optimal": "exact_optimal",
    "scenario": "scenario_id",
    "policy_arm": "policy_arm",
    "recommendation_source": "recommendation_source",
    "shown_recommendation_bundle_ids": "shown_recommendation_bundle_ids",
}

# Excess-time decomposition: label -> (chosen_col, oracle_col) in rounds.csv -- #
TIME_COMPONENTS = {
    "total": ("chosen_total_time_seconds", "oracle_total_time_seconds"),
    "travel": ("chosen_travel_time_seconds", "oracle_travel_time_seconds"),
    "cross_city": ("chosen_cross_city_travel_time_seconds",
                   "oracle_cross_city_travel_time_seconds"),
    "local_travel": ("chosen_local_travel_time_seconds",
                     "oracle_local_travel_time_seconds"),
    "pick": ("chosen_effective_pick_time_seconds",
             "oracle_effective_pick_time_seconds"),
    "shared_savings": ("chosen_shared_item_savings_seconds",
                       "oracle_shared_item_savings_seconds"),
}

# Per-bundle attribute columns in candidates.csv for the conditional/MNL logit. #
CHOICE_FEATURES = [
    "earnings",
    "travel_time_seconds",
    "cross_city_travel_time_seconds",
    "effective_pick_time_seconds",
    "shared_item_savings_seconds",
]

# candidates.csv key/flag columns ------------------------------------------- #
CANDIDATE_COL = {
    "user": "user_id",
    "round": "round_index",
    "phase": "phase",
    "scenario": "scenario_id",
    "bundle_id": "bundle_id",
    "order_ids": "order_ids",
    "is_chosen": "is_chosen",
    "is_oracle": "is_oracle",
    "legal": "legal",
    "score": "score",
    "regret": "regret_to_best",
    "score_ratio": "score_ratio_to_best",
    "ending_city": "ending_city",
}

# scenarios.csv columns for the 2x2 (overlap x dispersion) coverage check ---- #
SCENARIO_COL = {
    "round": "round_index",
    "scenario": "scenario_id",
    "phase": "phase",
    "order_ids": "order_ids",
    "classification": "classification",
    "score_gap": "score_gap",
    "relative_gap": "relative_gap",
    "n_orders": "n_orders",
    "n_distinct_stores": "n_distinct_stores",
    "n_distinct_cities": "n_distinct_cities",
    "store_overlap_flag": "store_overlap_flag",
    "dispersion_flag": "dispersion_flag",
}

# participants.csv columns -------------------------------------------------- #
PARTICIPANT_COL = {
    "user": "user_id",
    "arm": "arm",
    "completed": "completed",
    "n_rounds_completed": "n_rounds_completed",
    "dataset_snapshot_id": "dataset_snapshot_id",
}

# Phase A is the unaided window used for behavioral-archetype clustering.
PHASE_UNAIDED = "A"
PHASES = ["A", "B", "C"]

# Companion files emitted alongside the four core tables.
COMPANION_FILES = {
    "orders": "orders.csv",
    "stores": "stores.csv",
    "travel_matrix": "travel_matrix.csv",
}
