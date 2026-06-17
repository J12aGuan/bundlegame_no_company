#!/usr/bin/env python3
"""
Build paper raw-materials artifacts from the DEPLOYED game data.

Source of truth (authoritative, deployed mainGame 50-round set):
  - publishing/export_for_analysis/_raw_pull/stores.json          (store grids / layouts)
  - publishing/export_for_analysis/_raw_pull/cities.json          (travelTimes + startinglocation)
  - publishing/export_for_analysis/_raw_pull/scenario_bundle.json (orders, scenarios, optimal, metadata)
  - publishing/export_for_analysis/scenario_design.csv            (per-round generator design flags)

Scoring is recomputed faithfully from the DEPLOYED server-side model
(src/lib/bundleTime.js + src/lib/scripts/generateScenarios.js, commit 17989b5):
  per-order time   = crossCity(from->orderCity) + localTravelTime + (estimatedTime - localTravelTime)
                   = crossCity + estimatedTime
  shared savings   = sum over (store,city) groups with >=2 orders, for each item in >=2 orders:
                        itemAccessSeconds * (count-1) * SHARED_ITEM_ACCESS_SAVE_RATE   (rate = 1.0)
  bundle time      = sum(per-order time over route) - shared savings   (floored at 0)
  score            = total earnings / bundle time
  legal bundles    = single-store subsets of size 1..maxBundle(=3)
  route            = best-scoring permutation of the bundle
  oracle/2nd       = sort by (score desc, size asc, id-join asc)
NOTE: the deployed model uses rate 1.0 and NO 0.25x local-travel reduction. The 0.25x
rule (LOCAL_TRAVEL_BUNDLE_SAVE_RATE) exists only in the offline analytics mirror
(time_model.py) and the (non-deployed) CHI redesign, and is recorded in time_model.json
as an alternate variant for reference.
"""
import csv, json, itertools, os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))   # .../raw_materials/scripts
BUNDLE = os.path.dirname(SCRIPT_DIR)                       # .../raw_materials
RAW = os.path.join(BUNDLE, "sources")                     # bundled exact inputs
OUT = os.path.join(BUNDLE, "data")                        # CSV/JSON outputs

SHARED_ITEM_ACCESS_SAVE_RATE = 1.0          # deployed (bundleTime.js)
LOCAL_TRAVEL_BUNDLE_SAVE_RATE = 0.25        # analytics mirror / CHI only (NOT deployed)
SECONDS_PER_UNIQUE_ITEM_DEFAULT = 3.0
MAX_BUNDLE = 3

stores_raw = json.load(open(os.path.join(RAW, "stores.json"), encoding="utf-8"))["stores"]
cities = json.load(open(os.path.join(RAW, "cities.json"), encoding="utf-8"))
bundle = json.load(open(os.path.join(RAW, "scenario_bundle.json"), encoding="utf-8"))
travel = cities["travelTimes"]
START_CITY = cities["startinglocation"]

orders_by_id = {o["id"]: o for o in bundle["orders"]}
scenarios = sorted(bundle["scenarios"], key=lambda s: s["round"])
optimal_by_sid = {o["scenario_id"]: o for o in bundle["optimal"]}

store_cfg = {s["store"]: s for s in stores_raw}

# ---- design flags from scenario_design.csv ----
design = {}
with open(os.path.join(RAW, "scenario_design.csv"), encoding="utf-8") as f:
    for row in csv.DictReader(f):
        design[int(row["round_index"])] = row

# ---- phase plan (researchStudy.js BUNDLEGAME_STUDY_PHASES, 50-round protocol) ----
PHASES = [
    {"id": "A", "start": 1,  "end": 15, "rec": False},
    {"id": "B", "start": 16, "end": 35, "rec": True},
    {"id": "C", "start": 36, "end": 50, "rec": False},
]
def phase_for(r):
    for p in PHASES:
        if p["start"] <= r <= p["end"]:
            return p
    return None

# ---------------- deployed time/score model ----------------
def cells_of(cfg):
    rows = cfg.get("locations", []) or []
    out = []
    for row in rows:
        if isinstance(row, dict):
            out.append(row.get("cells", []) or [])
        elif isinstance(row, list):
            out.append(row)
        else:
            out.append([])
    return out

def manhattan(a, b):
    return abs((a[0] if a else 0) - (b[0] if b else 0)) + abs((a[1] if a else 0) - (b[1] if b else 0))

def item_access_seconds(cfg, item):
    if not cfg:
        return 0.0
    grid = cells_of(cfg)
    entrance = cfg.get("Entrance", [0, 0]) or [0, 0]
    spc = (float(cfg.get("cellDistance", 1000) or 1000)) / 1000.0
    needle = str(item or "").lower().strip()
    best = None
    for r, row in enumerate(grid):
        for c, val in enumerate(row):
            if str(val or "").lower().strip() == needle:
                d = manhattan(entrance, [r, c])
                best = d if best is None else min(best, d)
    return 0.0 if best is None else best * spc

def cross_city(to_city, from_city):
    if not to_city or not from_city or to_city == from_city:
        return 0.0
    v = travel.get(from_city, {}).get(to_city)
    return float(v) if isinstance(v, (int, float)) and v > 0 else 0.0

def shared_item_savings(order_ids):
    groups = {}
    for oid in order_ids:
        o = orders_by_id[oid]
        groups.setdefault((o["store"], o["city"]), []).append(o)
    sec = 0.0
    for (store, _city), grp in groups.items():
        if len(grp) < 2:
            continue
        cfg = store_cfg.get(store)
        counts = {}
        for o in grp:
            for k in {str(x).lower().strip() for x in (o.get("items") or {}).keys()}:
                counts[k] = counts.get(k, 0) + 1
        for item, cnt in counts.items():
            if cnt > 1:
                sec += item_access_seconds(cfg, item) * (cnt - 1) * SHARED_ITEM_ACCESS_SAVE_RATE
    return sec

def score_sequence(seq_ids, current_city):
    sim = current_city
    earnings = 0.0
    raw = 0.0
    for oid in seq_ids:
        o = orders_by_id[oid]
        earnings += float(o.get("earnings", 0) or 0)
        raw += cross_city(o["city"], sim) + float(o.get("estimatedTime", 0) or 0)
        if o.get("city"):
            sim = o["city"]
    savings = shared_item_savings(seq_ids)
    t = max(0.0, raw - savings)
    score = earnings / (t if t > 0 else 1e-9)
    return {"score": score, "earnings": earnings, "time": t, "savings": savings, "ending_city": sim}

def score_bundle_best_seq(bundle_ids, current_city):
    best = None
    for perm in itertools.permutations(bundle_ids):
        s = score_sequence(list(perm), current_city)
        if best is None or s["score"] > best["score"]:
            best = s
    best["bundle_ids"] = list(bundle_ids)
    return best

def legal_bundles(order_ids):
    out = []
    for k in range(1, min(MAX_BUNDLE, len(order_ids)) + 1):
        for combo in itertools.combinations(order_ids, k):
            if len({orders_by_id[i]["store"] for i in combo}) == 1:  # single-store legality
                out.append(list(combo))
    return out

def solve(order_ids, current_city):
    cands = [score_bundle_best_seq(b, current_city) for b in legal_bundles(order_ids)]
    cands.sort(key=lambda c: (-c["score"], len(c["bundle_ids"]), "+".join(c["bundle_ids"])))
    return cands

# ---------------- iterate rounds (chain current city via oracle ending) ----------------
round_rows = []
verify_best = verify_second = 0
current_city = START_CITY
for sc in scenarios:
    r = sc["round"]
    sid = sc["scenario_id"]
    oids = sc["order_ids"]
    cands = solve(oids, current_city)
    best, second = cands[0], (cands[1] if len(cands) > 1 else None)

    # payout trap: highest-earning legal bundle (tie-break highest score), vs oracle
    maxpay = max(cands, key=lambda c: (c["earnings"], c["score"]))
    trap = set(maxpay["bundle_ids"]) != set(best["bundle_ids"])
    max_overlap = max((c["savings"] for c in cands), default=0.0)

    dep = optimal_by_sid.get(sid, {})
    dep_best = dep.get("best_bundle_ids", [])
    dep_second = dep.get("second_best_bundle_ids", [])
    match_best = set(dep_best) == set(best["bundle_ids"])
    match_second = (second is not None) and set(dep_second) == set(second["bundle_ids"])
    verify_best += match_best
    verify_second += match_second

    dsg = design.get(r, {})
    orders_detail = [{"id": i, "store": orders_by_id[i]["store"], "city": orders_by_id[i]["city"],
                      "earnings": orders_by_id[i]["earnings"],
                      "n_unique_items": len(orders_by_id[i].get("items") or {})} for i in oids]
    n_stores = len({orders_by_id[i]["store"] for i in oids})
    n_cities = len({orders_by_id[i]["city"] for i in oids})
    store_counts = {}
    for i in oids:
        store_counts[orders_by_id[i]["store"]] = store_counts.get(orders_by_id[i]["store"], 0) + 1
    overlap_realized = 1 if any(v >= 2 for v in store_counts.values()) else 0

    score_gap = best["score"] - (second["score"] if second else 0.0)
    rel_gap = score_gap / best["score"] if best["score"] > 0 else 0.0
    ph = phase_for(r)

    round_rows.append({
        "round_index": r,
        "phase": sc.get("phase") or (ph["id"] if ph else ""),
        # ACTUAL RUN: every round was unaided (no recommendations shown) per study lead.
        "recommendations_shown_in_run": False,
        # PROTOCOL design intent (researchStudy.js): Phase B (16-35) was rec-eligible.
        "phase_recommendations_eligible": ph["rec"] if ph else "",
        "scenario_id": sid,
        "starting_city_for_round": current_city,
        "n_orders": len(oids),
        "order_ids": json.dumps(oids),
        "orders_detail": json.dumps(orders_detail),
        "n_distinct_stores": n_stores,
        "n_distinct_cities": n_cities,
        "menu_layout": "compact" if n_cities == 1 else "dispersed",
        "max_bundle": sc.get("max_bundle", MAX_BUNDLE),
        "store_overlap_realized": overlap_realized,
        # generator design labels (verbatim from scenario_design.csv)
        "generator_city_rule": dsg.get("generator_city_rule", ""),
        "dispersion_designed": dsg.get("dispersion_designed", ""),
        "overlap_designed": dsg.get("overlap_designed", ""),
        "trap_designed": dsg.get("trap_designed", ""),
        "trap_target_amount": dsg.get("trap_target_amount", ""),
        "intended_difficulty": dsg.get("intended_difficulty", ""),
        # oracle / second-best (recomputed, deployed model)
        "oracle_bundle_ids": json.dumps(best["bundle_ids"]),
        "oracle_bundle_size": len(best["bundle_ids"]),
        "oracle_score": round(best["score"], 6),
        "oracle_earnings": round(best["earnings"], 2),
        "oracle_time_s": round(best["time"], 4),
        "oracle_ending_city": best["ending_city"],
        "second_best_bundle_ids": json.dumps(second["bundle_ids"]) if second else "",
        "second_best_bundle_size": len(second["bundle_ids"]) if second else 0,
        "second_best_score": round(second["score"], 6) if second else "",
        "second_best_earnings": round(second["earnings"], 2) if second else "",
        "score_gap": round(score_gap, 6),
        "relative_gap": round(rel_gap, 6),
        # overlap savings available
        "max_overlap_savings_s": round(max_overlap, 4),
        # computed payout trap (NOT a generator-designed trap; trap_designed=False everywhere)
        "maxpay_bundle_ids": json.dumps(maxpay["bundle_ids"]),
        "maxpay_bundle_size": len(maxpay["bundle_ids"]),
        "maxpay_earnings": round(maxpay["earnings"], 2),
        "maxpay_score": round(maxpay["score"], 6),
        "payout_trap_present": trap,
        "trap_overpay_amount": round(maxpay["earnings"] - best["earnings"], 2) if trap else 0,
        "trap_score_shortfall": round(best["score"] - maxpay["score"], 6) if trap else 0,
        "trap_relative_shortfall": round((best["score"] - maxpay["score"]) / best["score"], 6) if trap and best["score"] > 0 else 0,
        # verification vs deployed optimal doc
        "deployed_best_bundle_ids": json.dumps(dep_best),
        "recompute_matches_deployed_best": match_best,
        "recompute_matches_deployed_second": match_second,
    })
    # chain to next round using deployed oracle ending city (matches generator threading)
    current_city = dep.get("ending_city_best") or best["ending_city"]

# ---------------- write round_design.csv ----------------
cols = list(round_rows[0].keys())
with open(os.path.join(OUT, "round_design.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(round_rows)

# ---------------- write stores.csv ----------------
with open(os.path.join(OUT, "stores.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["store_id", "store_name", "city", "entrance_rc", "cell_distance_ms",
                "seconds_per_cell", "grid_rows", "grid_cols", "n_items", "items"])
    for idx, s in enumerate(stores_raw):
        grid = cells_of(s)
        rows = len(grid)
        colsn = max((len(r) for r in grid), default=0)
        w.writerow([s["store"], s["store"], s["city"], json.dumps(s.get("Entrance", [0, 0])),
                    s.get("cellDistance", ""), (float(s.get("cellDistance", 1000) or 1000) / 1000.0),
                    rows, colsn, len(s.get("items", [])), json.dumps(sorted(s.get("items", [])))])

# ---------------- write time_model.json ----------------
def store_layout(s):
    grid = cells_of(s)
    entrance = s.get("Entrance", [0, 0])
    spc = float(s.get("cellDistance", 1000) or 1000) / 1000.0
    # per-item nearest access (seconds) so layout differences are visible
    items = {}
    pos = {}
    for r, row in enumerate(grid):
        for c, val in enumerate(row):
            name = str(val or "").strip()
            if name and name.lower() != "entrance":
                pos.setdefault(name.lower(), []).append([r, c])
    for it in sorted({str(x).lower() for x in s.get("items", [])} | set(pos.keys())):
        positions = pos.get(it, [])
        if positions:
            d = min(manhattan(entrance, p) for p in positions)
            items[it] = {"positions_rc": positions, "nearest_manhattan_cells": d,
                         "nearest_access_seconds": round(d * spc, 4)}
        else:
            items[it] = {"positions_rc": [], "nearest_manhattan_cells": None,
                         "nearest_access_seconds": None}
    access_vals = [v["nearest_access_seconds"] for v in items.values() if v["nearest_access_seconds"] is not None]
    return {
        "store": s["store"], "city": s["city"],
        "entrance_rc": entrance, "cell_distance_ms": s.get("cellDistance"),
        "seconds_per_cell": spc,
        "grid_rows": len(grid), "grid_cols": max((len(r) for r in grid), default=0),
        "grid": grid,
        "item_access": items,
        "layout_spread": {
            "n_items": len(items),
            "mean_access_seconds": round(sum(access_vals) / len(access_vals), 4) if access_vals else None,
            "max_access_seconds": round(max(access_vals), 4) if access_vals else None,
        },
    }

time_model = {
    "provenance": {
        "deployed_scenario_set": bundle["metadata"].get("scenarioSetVersionId"),
        "source_commit": "17989b5",
        "sources": ["src/lib/bundleTime.js", "src/lib/scripts/scenarioTime.js",
                    "src/lib/scripts/generateScenarios.js",
                    "publishing/data_analysis/analytics_v1/analytics/model/time_model.py (offline mirror)"],
        "raw_data": ["publishing/export_for_analysis/_raw_pull/stores.json",
                     "publishing/export_for_analysis/_raw_pull/cities.json"],
    },
    "constants": {
        "SECONDS_PER_UNIQUE_ITEM_DEFAULT": SECONDS_PER_UNIQUE_ITEM_DEFAULT,
        "seconds_per_cell_formula": "store.cellDistance / 1000",
        "distance_metric": "manhattan (grid cells)",
        "max_bundle_size": MAX_BUNDLE,
        "legal_bundle_rule": "single-store subsets only (same_store_multi_order_v1)",
    },
    "pick_time_model": {
        "per_order_pick_seconds": "sum over items in listed order of manhattan(curr->nearest position)*seconds_per_cell, "
                                  "then + n_unique_items * SECONDS_PER_UNIQUE_ITEM_DEFAULT; walker starts at Entrance",
        "note": "Deployed orders store estimatedTime (= localTravel + pick); scoring uses pick = estimatedTime - localTravel.",
    },
    "local_travel_model": {
        "per_order_local_seconds": "stored field order.localTravelTime",
        "generator_distribution": "uniform integer 2..6 seconds (estimateLocalTravelTime)",
    },
    "cross_city_model": {
        "rule": "crossCityExtraTime(orderCity, currentCity) = travelTimes[currentCity][orderCity]; 0 if same city or no route",
        "starting_city": START_CITY,
        "travel_times_seconds": travel,
        "is_symmetric": all(travel.get(a, {}).get(b) == travel.get(b, {}).get(a)
                            for a in travel for b in travel.get(a, {})),
    },
    "overlap_savings_rule": {
        "DEPLOYED": {
            "name": "shared_item_access_savings",
            "rate_constant": SHARED_ITEM_ACCESS_SAVE_RATE,
            "formula": "for each (store,city) group with >=2 orders, for each item present in >=2 of those orders: "
                       "nearest_access_seconds(item) * (count-1) * 1.0; summed; subtracted from raw bundle time",
            "applies_to": "redundant item-access (pick-walk) only",
            "note": "This is what produced the deployed oracle/second-best. NO 0.25x local-travel reduction here.",
        },
        "ALT_analytics_mirror_NOT_deployed": {
            "name": "shared_item_access + local_travel_fraction",
            "extra_rule": "additionally subtracts sum(local_travel_per_order_in_group) * LOCAL_TRAVEL_BUNDLE_SAVE_RATE",
            "LOCAL_TRAVEL_BUNDLE_SAVE_RATE": LOCAL_TRAVEL_BUNDLE_SAVE_RATE,
            "source": "publishing/data_analysis/analytics_v1/analytics/model/time_model.py + config.py",
        },
        "ALT_chi_redesign_NOT_deployed": {
            "name": "shared_store_pick_save",
            "rule": "for each store hosting >=2 orders: sum(order.pick) * 0.25",
            "source": "src/lib/chiScenarioDesign.js (SHARED_STORE_PICK_SAVE_RATE)",
        },
    },
    "stores": [store_layout(s) for s in stores_raw],
}
json.dump(time_model, open(os.path.join(OUT, "time_model.json"), "w", encoding="utf-8"), indent=2)

# ---------------- verification + summary ----------------
n = len(round_rows)
traps = sum(1 for r in round_rows if r["payout_trap_present"])
dispersed = sum(1 for r in round_rows if r["menu_layout"] == "dispersed")
overlap = sum(1 for r in round_rows if r["store_overlap_realized"] == 1)
with_savings = sum(1 for r in round_rows if r["max_overlap_savings_s"] > 0)
print(f"rounds={n}")
print(f"VERIFY recomputed oracle == deployed best_bundle_ids : {verify_best}/{n}")
print(f"VERIFY recomputed 2nd    == deployed second_best     : {verify_second}/{n}")
print(f"menu_layout dispersed={dispersed} compact={n-dispersed}")
print(f"store_overlap_realized rounds={overlap}; rounds with >0 overlap savings available={with_savings}")
print(f"computed payout_trap_present rounds={traps}")
print(f"distinct stores={len({s['store'] for s in stores_raw})} distinct cities={len({s['city'] for s in stores_raw})} start={START_CITY}")
print("wrote:", os.path.join(OUT, "stores.csv"))
print("wrote:", os.path.join(OUT, "time_model.json"))
print("wrote:", os.path.join(OUT, "round_design.csv"))
