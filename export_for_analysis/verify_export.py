#!/usr/bin/env python3
"""Load-check the export: shapes, heads, dtypes, invariants, phase distribution."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
FILES = ["rounds.csv", "candidates.csv", "scenarios.csv", "participants.csv",
         "orders.csv", "stores.csv", "travel_matrix.csv"]

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 60)

frames: dict[str, pd.DataFrame] = {}
for name in FILES:
    df = pd.read_csv(HERE / name)
    frames[name] = df
    print(f"\n===== {name} =====")
    print("shape:", df.shape)
    print("dtypes:")
    print(df.dtypes.to_string())
    print("head:")
    print(df.head(6).to_string(index=False))

# Invariant: exactly one is_chosen==1 and one is_oracle==1 per (user, round).
cand = frames["candidates.csv"]
grp = cand.groupby(["user_id", "round_index"])
chosen = grp["is_chosen"].sum()
oracle = grp["is_oracle"].sum()
assert (chosen == 1).all(), f"is_chosen invariant violated:\n{chosen[chosen != 1]}"
assert (oracle == 1).all(), f"is_oracle invariant violated:\n{oracle[oracle != 1]}"
print("\n[OK] candidates invariant: exactly one is_chosen==1 and one is_oracle==1 per (user, round).")

# Time-component identity on candidates (where the split is populated).
ident_checked = 0
for _, r in cand.iterrows():
    parts = [r["effective_pick_time_seconds"], r["local_travel_time_seconds"],
             r["cross_city_travel_time_seconds"], r["total_time_seconds"]]
    if any(pd.isna(p) for p in parts):
        continue
    recomposed = (r["effective_pick_time_seconds"] + r["local_travel_time_seconds"]
                  + r["cross_city_travel_time_seconds"])
    assert abs(recomposed - r["total_time_seconds"]) < 1e-3, (
        f"identity broken for {r['bundle_id']}: {recomposed} vs {r['total_time_seconds']}")
    ident_checked += 1
print(f"[OK] time identity total==effective_pick+local_travel+cross_city on {ident_checked} candidate rows.")

# Phase distribution.
print("\nPhase distribution (rounds.csv):")
print(frames["rounds.csv"]["phase"].value_counts().to_string())
print("\nPhase distribution (scenarios.csv menu):")
print(frames["scenarios.csv"]["phase"].value_counts().to_string())

# 2x2 coverage (overlap x dispersion).
sc = frames["scenarios.csv"]
print("\n2x2 store-overlap x dispersion coverage (scenarios):")
print(sc.groupby(["store_overlap_flag", "dispersion_flag"]).size().to_string())

# Target-schema fields that are present-but-empty, with reasons.
print("\nTarget-schema fields not populated (and why):")
rounds = frames["rounds.csv"]
reasons = {
    "policy_arm": "no treatment-arm labels recorded (baseline/unaided data; no Phase-B arms run)",
    "recommendation_source": "recommendations not shown (baseline); remaining rows are 'none'",
    "shown_recommendation_bundle_ids": "no recommendation bundles were shown to participants",
}
for col, why in reasons.items():
    empty = int((rounds[col].isna() | (rounds[col].astype(str).isin(["", "[]"]))).sum())
    print(f"  - rounds.{col}: {empty}/{len(rounds)} empty  -> {why}")
sc_empty = int((sc["score_gap"].isna()).sum())
if sc_empty:
    print(f"  - scenarios.score_gap/relative_gap: {sc_empty}/{len(sc)} empty  -> "
          "no scoreable legal bundles for those scenarios")
else:
    print(f"  - scenarios.score_gap/relative_gap: populated for all {len(sc)} scenarios "
          "(derived by scoring legal bundles at the starting location)")

print("\n[VERIFY OK] all load-checks and invariants passed.")
