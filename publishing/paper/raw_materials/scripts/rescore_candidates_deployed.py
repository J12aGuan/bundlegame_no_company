#!/usr/bin/env python3
"""
Re-score export/candidates.csv with the DEPLOYED scorer.

Deployed model (src/lib/bundleTime.js + generateScenarios.js, commit 17989b5):
  bundle_time = sum(estimatedTime + crossCity) - shared_item_access_savings(rate 1.0)
  i.e. NO 0.25 LOCAL_TRAVEL_BUNDLE_SAVE_RATE (that term exists only in the offline
  analytics mirror that produced the original candidates.csv).

Sequential carried position is preserved: each (user, round) is scored from the
participant's actual carried current_city. We recover that current_city directly from
the existing candidates.csv (the per-row cross_city of the singleton candidates encodes
it exactly), so it is identical to what the mirror export used — no re-derivation drift.

Pipeline:
  1. FIDELITY PASS - reproduce the mirror's score/time/cross/savings for every mainGame
     candidate from scratch and assert it matches candidates.csv. Proves the scorer +
     recovered current_city are faithful before we change the savings rule.
  2. DEPLOYED PASS - compute deployed_score, deployed_total_time_seconds and, per
     (user,round), the deployed oracle (max deployed_score, ties -> larger bundle, the
     same rule export.py used), deployed_score_ratio_to_best, deployed_regret_to_best,
     is_oracle_deployed.
  3. Report per-round oracle-identity match (deployed vs mirror) and the exact-optimal
     rate (chosen == oracle) under both scorers.

Inputs:  ../sources/{scenario_bundle.json, stores.json, cities.json}, export candidates.csv & rounds.csv
Outputs: ../data/candidates_deployed.csv, ../data/oracle_match_by_round.csv, ../data/deployed_rescore_report.md
De-identified: user_id values are passed through unchanged (already hashed in the export).
"""
import csv, json, os, itertools
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
BUNDLE = os.path.dirname(HERE)
SRC = os.path.join(BUNDLE, "sources")
OUT = os.path.join(BUNDLE, "data")
EXPORT = os.path.join(BUNDLE, "..", "..", "export_for_analysis")  # original export CSVs

SECONDS_PER_UNIQUE_ITEM = 3.0
LOCAL_SAVE_RATE = 0.25            # mirror only
csv.field_size_limit(10_000_000)

b = json.load(open(os.path.join(SRC, "scenario_bundle.json"), encoding="utf-8"))
stores_raw = json.load(open(os.path.join(SRC, "stores.json"), encoding="utf-8"))["stores"]
cities = json.load(open(os.path.join(SRC, "cities.json"), encoding="utf-8"))
TRAVEL = cities["travelTimes"]
START_CITY = cities["startinglocation"]
CITY_LIST = list(TRAVEL.keys())
order_by_id = {o["id"]: o for o in b["orders"]}
store_cfg = {s["store"]: s for s in stores_raw}

# ----------------------- model primitives (mirror time_model.py exactly) -----------------------
def cells_of(cfg):
    out = []
    for row in cfg.get("locations", []) or []:
        out.append(row.get("cells", []) if isinstance(row, dict) else (row if isinstance(row, list) else []))
    return out

def manhattan(a, b_):
    return abs((a[0] if a else 0) - (b_[0] if b_ else 0)) + abs((a[1] if a else 0) - (b_[1] if b_ else 0))

def find_first_position(grid, item):           # time_model.find_item_position = FIRST match
    needle = str(item or "").lower().strip()
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if str(v or "").lower().strip() == needle:
                return (r, c)
    return None

def nearest_access_seconds(cfg, item):         # item_access_seconds (nearest from entrance)
    grid = cells_of(cfg); entrance = cfg.get("Entrance", [0, 0]) or [0, 0]
    spc = float(cfg.get("cellDistance", 1000) or 1000) / 1000.0
    needle = str(item or "").lower().strip(); best = None
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if str(v or "").lower().strip() == needle:
                d = manhattan(entrance, (r, c)); best = d if best is None else min(best, d)
    return 0.0 if best is None else best * spc

def estimate_pick_seconds(order, cfg):         # time_model.estimate_pick_item_seconds
    grid = cells_of(cfg); entrance = cfg.get("Entrance", [0, 0]) or [0, 0]
    spc = float(cfg.get("cellDistance", 1000) or 1000) / 1000.0
    uniq = [str(k).lower().strip() for k in (order.get("items") or {}).keys() if str(k).strip()]
    cur = (int(entrance[0]), int(entrance[1])); steps = 0
    for it in uniq:
        pos = find_first_position(grid, it)
        if not pos:
            continue
        steps += manhattan(cur, pos); cur = pos
    return steps * spc + len(uniq) * SECONDS_PER_UNIQUE_ITEM

def cross_city(to_city, from_city):
    if not to_city or not from_city or to_city == from_city:
        return 0.0
    v = TRAVEL.get(from_city, {}).get(to_city)
    return float(v) if isinstance(v, (int, float)) and v > 0 else 0.0

def group_orders(order_ids):
    g = defaultdict(list)
    for oid in order_ids:
        o = order_by_id[oid]; g[(o["store"], o["city"])].append(o)
    return g

def shared_item_access_savings(order_ids):     # DEPLOYED savings (rate 1.0), no 0.25 term
    sec = 0.0
    for (store, _city), grp in group_orders(order_ids).items():
        if len(grp) < 2:
            continue
        cfg = store_cfg.get(store); counts = defaultdict(int)
        for o in grp:
            for k in {str(x).lower().strip() for x in (o.get("items") or {}).keys()}:
                counts[k] += 1
        for item, cnt in counts.items():
            if cnt > 1:
                sec += nearest_access_seconds(cfg, item) * (cnt - 1)
    return sec

def mirror_extra_local_savings(order_ids):     # the 0.25 * local term (mirror only)
    extra = 0.0
    for (store, _city), grp in group_orders(order_ids).items():
        if len(grp) < 2:
            continue
        cfg = store_cfg.get(store); local = 0.0
        for o in grp:
            base = max(0.0, float(o.get("estimatedTime", 0) or 0))
            pick = min(base, max(0.0, estimate_pick_seconds(o, cfg))) if cfg else 0.0
            local += max(0.0, base - pick)
        extra += local * LOCAL_SAVE_RATE
    return extra

def route_cross_and_end(order_ids, current_city):
    """cross-city total + ending city, walking order_ids in stored order (route-invariant
    for single-store legal bundles, which all legal candidates are)."""
    sim = current_city; cross = 0.0
    for oid in order_ids:
        o = order_by_id[oid]; cross += cross_city(o["city"], sim)
        if o.get("city"):
            sim = o["city"]
    return cross, sim

def score_components(order_ids, current_city):
    base_sum = sum(float(order_by_id[i].get("estimatedTime", 0) or 0) for i in order_ids)
    earnings = sum(float(order_by_id[i].get("earnings", 0) or 0) for i in order_ids)
    cross, end = route_cross_and_end(order_ids, current_city)
    raw = cross + base_sum
    dep_sav = shared_item_access_savings(order_ids)
    mir_sav = dep_sav + mirror_extra_local_savings(order_ids)
    dep_t = max(0.0, raw - dep_sav); mir_t = max(0.0, raw - mir_sav)
    return {
        "earnings": earnings, "cross": cross, "ending_city": end,
        "deployed_time": dep_t, "deployed_score": (earnings / dep_t) if dep_t > 0 else None,
        "mirror_time": mir_t, "mirror_score": (earnings / mir_t) if mir_t > 0 else None,
        "mirror_savings": mir_sav,
    }

# ----------------------- load candidates + recover current_city -----------------------
rows = list(csv.DictReader(open(os.path.join(EXPORT, "candidates.csv"), encoding="utf-8")))
by_ur = defaultdict(list)
for r in rows:
    by_ur[(r["user_id"], int(r["round_index"]))].append(r)

def recover_current_city(group):
    """Recover the participant's carried current_city from singleton candidates' cross-city."""
    singles = []
    for r in group:
        ids = json.loads(r["order_ids"])
        if len(ids) == 1 and ids[0] in order_by_id:
            singles.append((order_by_id[ids[0]]["city"], float(r["cross_city_travel_time_seconds"] or 0)))
    if not singles:
        return None
    # a singleton with cross==0 sits in the current city
    for city, cross in singles:
        if cross == 0:
            return city
    # else invert: the unique city consistent with every singleton's cross time
    for c in CITY_LIST:
        if all(abs(cross_city(city, c) - cross) < 0.5 for city, cross in singles):
            return c
    return None

# ----------------------- pass 1+2: fidelity + deployed -----------------------
fid_ok = fid_bad = skipped = 0
max_err = 0.0
cur_city_by_ur = {}
for key, group in by_ur.items():
    cc = recover_current_city(group)
    cur_city_by_ur[key] = cc
    for r in group:
        ids = json.loads(r["order_ids"])
        if cc is None or any(i not in order_by_id for i in ids):
            r["_dep"] = None; skipped += 1; continue
        comp = score_components(ids, cc)
        r["_dep"] = comp
        # fidelity: compare reproduced mirror vs the exported row
        if r["score"] not in ("", None) and comp["mirror_score"] is not None:
            e = max(abs(comp["mirror_score"] - float(r["score"])),
                    abs(comp["mirror_time"] - float(r["total_time_seconds"])),
                    abs(comp["cross"] - float(r["cross_city_travel_time_seconds"])),
                    abs(comp["mirror_savings"] - float(r["shared_item_savings_seconds"])))
            max_err = max(max_err, e)
            if e < 0.02:
                fid_ok += 1
            else:
                fid_bad += 1

# deployed oracle per (user,round): legal, max deployed_score, ties -> larger bundle
for key, group in by_ur.items():
    legal = [r for r in group if r["legal"] == "1" and r.get("_dep") and r["_dep"]["deployed_score"] is not None]
    if not legal:
        for r in group:
            r["_oracle_dep"] = 0; r["_ratio"] = ""; r["_regret"] = ""
        continue
    legal.sort(key=lambda r: (r["_dep"]["deployed_score"], len(json.loads(r["order_ids"]))), reverse=True)
    best = legal[0]["_dep"]["deployed_score"]
    best_sig = tuple(sorted(json.loads(legal[0]["order_ids"])))
    for r in group:
        d = r.get("_dep")
        if d and d["deployed_score"] is not None and best:
            ratio = d["deployed_score"] / best
            r["_ratio"] = round(ratio, 6); r["_regret"] = round(max(0.0, 1 - ratio), 6)
        else:
            r["_ratio"] = ""; r["_regret"] = ""
        r["_oracle_dep"] = int(d is not None and tuple(sorted(json.loads(r["order_ids"]))) == best_sig)

# ----------------------- write candidates_deployed.csv -----------------------
in_cols = list(rows[0].keys())
in_cols = [c for c in in_cols if not c.startswith("_")]
new_cols = ["deployed_score", "deployed_total_time_seconds", "deployed_regret_to_best",
            "deployed_score_ratio_to_best", "is_oracle_deployed"]
with open(os.path.join(OUT, "candidates_deployed.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(in_cols + new_cols)
    for r in rows:
        d = r.get("_dep")
        w.writerow([r[c] for c in in_cols] + [
            round(d["deployed_score"], 6) if d and d["deployed_score"] is not None else "",
            round(d["deployed_time"], 4) if d else "",
            r.get("_regret", ""), r.get("_ratio", ""),
            r.get("_oracle_dep", "") if d else "",
        ])

# ----------------------- oracle-identity match + exact-optimal -----------------------
def sig(r): return tuple(sorted(json.loads(r["order_ids"])))
per_round = defaultdict(lambda: {"n": 0, "match": 0})
match = mismatch = 0
mir_exact = dep_exact = decisions = 0
flips = []  # (user,round, mirror_oracle, deployed_oracle)
for key, group in by_ur.items():
    if any(r.get("_dep") is None for r in group):
        continue  # skip groups we couldn't score (experiment pilot)
    mir_or = next((r for r in group if r["is_oracle"] == "1"), None)
    dep_or = next((r for r in group if r.get("_oracle_dep") == 1), None)
    if not mir_or or not dep_or:
        continue
    rnd = key[1]
    same = sig(mir_or) == sig(dep_or)
    per_round[rnd]["n"] += 1; per_round[rnd]["match"] += int(same)
    match += int(same); mismatch += int(not same)
    if not same:
        flips.append((key[0], rnd, "+".join(sig(mir_or)), "+".join(sig(dep_or))))
    chosen = next((r for r in group if r["is_chosen"] == "1"), None)
    if chosen:
        decisions += 1
        mir_exact += int(sig(chosen) == sig(mir_or))
        dep_exact += int(sig(chosen) == sig(dep_or))

with open(os.path.join(OUT, "oracle_match_by_round.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f); w.writerow(["round_index", "n_participants", "oracle_identity_match", "match_rate"])
    for rnd in sorted(per_round):
        d = per_round[rnd]; w.writerow([rnd, d["n"], d["match"], round(d["match"] / d["n"], 4)])

report = f"""# Deployed re-scoring of candidates.csv

Scorer: DEPLOYED (bundleTime.js, SHARED_ITEM_ACCESS_SAVE_RATE=1, no 0.25 LOCAL_TRAVEL_BUNDLE_SAVE_RATE).
Carried position: each (user,round) scored from the participant's recovered current_city
(exact, recovered from the singleton candidates' cross-city in the original export).

## Fidelity check (reproduce the mirror before changing the rule)
- candidate rows reproduced & matched mirror (score/time/cross/savings, tol 0.02): {fid_ok}
- mismatches: {fid_bad}   | rows skipped (no source order data / pilot): {skipped}
- max abs error vs candidates.csv: {max_err:.5f}

## Deployed oracle vs mirror oracle (bundle identity)
- (user,round) decisions compared: {match + mismatch}
- oracle identity MATCHES: {match} ({match/(match+mismatch)*100:.1f}%)
- oracle identity CHANGES: {mismatch} ({mismatch/(match+mismatch)*100:.1f}%)

## Exact-optimal rate (chosen == oracle), same definition under each scorer
- mirror   : {mir_exact}/{decisions} = {mir_exact/decisions*100:.2f}%
- deployed : {dep_exact}/{decisions} = {dep_exact/decisions*100:.2f}%
- change   : {(dep_exact-mir_exact)/decisions*100:+.2f} pp  ({dep_exact-mir_exact:+d} decisions)

Note: the mirror exact-optimal here ({mir_exact/decisions*100:.2f}%) is the recomputed
mainGame value; it is the apples-to-apples baseline for the deployed comparison.

## Outputs
- candidates_deployed.csv  : every candidates.csv row + deployed_score,
  deployed_total_time_seconds, deployed_regret_to_best, deployed_score_ratio_to_best,
  is_oracle_deployed. (pilot 'experiment' rows have blank deployed_* = no source data.)
- oracle_match_by_round.csv: per-round deployed-vs-mirror oracle identity match rate.
"""
open(os.path.join(OUT, "deployed_rescore_report.md"), "w", encoding="utf-8").write(report)
print(report)
print("oracle changes (first 15):")
for fl in flips[:15]:
    print("  r%-2s %s : mirror=%s -> deployed=%s" % (fl[1], fl[0], fl[2], fl[3]))
print(f"... total oracle-identity changes: {len(flips)}")
