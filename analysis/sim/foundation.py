"""
foundation.py  —  Stage 1 of the BundleGame simulation pipeline.

Purpose
-------
Load the FROZEN, deployed-faithful inputs and verify they reproduce the locked
pilot statistics. Everything downstream (worker model, policies, figures) reads
the data structures this module exposes. Nothing else re-derives the scorer or
the oracle: the frozen files ARE the ground truth.

Inputs (committed by the agent, deployed scorer + recovered pilot grid/cities)
------------------------------------------------------------------------------
  frozen_bundle_menu_data.csv   one row per FEASIBLE BUNDLE in every pilot menu
      participant_token, round, scenario_id,
      bundle_ids, bundle_size,
      payout, picking_time, local_travel, cross_city_travel,
      overlap_savings, total_time, score,
      is_oracle, is_chosen
  pilot_decisions_deployed.csv  one row per DECISION (the chosen bundle + deployed oracle)
      participant_token, round, scenario_id,
      chosen_bundle, chosen_score_deployed,
      oracle_bundle_deployed, oracle_score_deployed,
      percent_regret_deployed, oracle_size_deployed,
      round_type (deployed), path-sensitivity flags

LOCKED expected statistics (from the 55/55-validated freeze)
------------------------------------------------------------
  optimal-choice rate  : 22.16 %
  mean percent regret  : 0.0965
  median percent regret: 0.0482
  bundle rate (size>=2): 89.75 %
  oracle size dist     : {1: 798, 2: 274, 3: 196}
  participants / rows  : 85 / 1268   (mean 14.9 rounds)

Key conventions (corrected per the agent's findings — do NOT change)
--------------------------------------------------------------------
  * ORACLE is the dataset's stored deployed oracle (best_bundle_ids scored per
    decision), NOT a per-decision argmax over feasible bundles. We read
    is_oracle / oracle_bundle_deployed; we never recompute argmax.
  * SCORE is deployed: earnings / modeled_time, modeled_time in SECONDS, with
    item-access shared-item savings already applied. Units: $ per second.
  * FEASIBLE = single-store, size 1..3, singles always feasible.
  * regret = max(0, (oracle_score - chosen_score) / oracle_score).
"""

from __future__ import annotations
import csv, math, os, sys
from collections import defaultdict, Counter
from dataclasses import dataclass, field

# Frozen data is committed in the repo (read-only ground truth). Resolve paths relative to THIS file so
# the pipeline runs from any working directory. A bare filename (the modules' default) maps into
# publishing/export_for_analysis/; the 35-round confirmatory set lives under publishing/experiments/.
_HERE = os.path.dirname(os.path.abspath(__file__))
FROZEN_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "publishing", "export_for_analysis"))
THIRTYFIVE_ROUND_JSON = os.path.normpath(os.path.join(
    _HERE, "..", "..", "publishing", "experiments", "2_june30_enriched_4order", "frozen", "chi_scenario_set_seed42.json"))

def resolve_frozen(path):
    """Map a bare frozen-data filename to publishing/export_for_analysis/; leave explicit paths alone."""
    return os.path.join(FROZEN_DIR, path) if path and not os.path.dirname(path) else path

# ----------------------------------------------------------------------------
# Locked expectations (the freeze must reproduce these; we assert on load)
# ----------------------------------------------------------------------------
EXPECT = dict(
    optimal_rate=0.2216, mean_regret=0.0965, median_regret=0.0482,
    bundle_rate=0.8975, oracle_size={1: 798, 2: 274, 3: 196},
    n_participants=85, n_rows=1268,
)
TOL = dict(rate=0.005, regret=0.003)  # tolerance for float / rounding drift

# Feature order used everywhere downstream. payout is positive-good;
# the three time components are burdens. overlap_savings is a *reducer* of time.
FEATURES = ("payout", "picking_time", "local_travel", "cross_city_travel")


@dataclass
class FeasibleBundle:
    ids: str
    size: int
    payout: float
    picking_time: float
    local_travel: float
    cross_city_travel: float
    overlap_savings: float
    total_time: float
    score: float
    is_oracle: bool
    is_chosen: bool

    def feature_vec(self):
        return [self.payout, self.picking_time, self.local_travel, self.cross_city_travel]


@dataclass
class Menu:
    """One decision: the participant, the round, and all feasible bundles."""
    participant: str
    round: int
    scenario_id: str
    bundles: list = field(default_factory=list)        # list[FeasibleBundle]
    chosen_ids: str = ""
    oracle_ids: str = ""
    chosen_score: float = 0.0
    oracle_score: float = 0.0
    percent_regret: float = 0.0
    oracle_size: int = 1
    round_type: str = ""

    @property
    def chosen(self):
        for b in self.bundles:
            if b.is_chosen:
                return b
        return None

    @property
    def oracle(self):
        for b in self.bundles:
            if b.is_oracle:
                return b
        return None

    def is_optimal_choice(self):
        return self.percent_regret <= 1e-9


def _f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def load_frozen(menu_csv: str, decisions_csv: str, strict: bool = True):
    """Load the two frozen files into a list[Menu], keyed and joined on (participant, round)."""
    menu_csv, decisions_csv = resolve_frozen(menu_csv), resolve_frozen(decisions_csv)
    # --- read feasible bundles, grouped by (participant, round) ---
    groups: dict = defaultdict(list)
    with open(menu_csv) as fh:
        for r in csv.DictReader(fh):
            key = (r["participant_token"], int(r["round"]))
            groups[key].append(FeasibleBundle(
                ids=r["bundle_ids"], size=int(r["bundle_size"]),
                payout=_f(r["payout"]), picking_time=_f(r["picking_time"]),
                local_travel=_f(r["local_travel"]), cross_city_travel=_f(r["cross_city_travel"]),
                overlap_savings=_f(r["overlap_savings"]), total_time=_f(r["total_time"]),
                score=_f(r["score"]),
                is_oracle=str(r["is_oracle"]) in ("1", "True", "true"),
                is_chosen=str(r["is_chosen"]) in ("1", "True", "true"),
            ))

    # --- read decisions and build Menu objects ---
    menus = []
    with open(decisions_csv) as fh:
        for r in csv.DictReader(fh):
            key = (r["participant_token"], int(r["round"]))
            bundles = groups.get(key, [])
            menus.append(Menu(
                participant=r["participant_token"], round=int(r["round"]),
                scenario_id=r.get("scenario_id", ""),
                bundles=bundles,
                chosen_ids=r.get("chosen_bundle", ""),
                oracle_ids=r.get("oracle_bundle_deployed", ""),
                chosen_score=_f(r.get("chosen_score_deployed")) or 0.0,
                oracle_score=_f(r.get("oracle_score_deployed")) or 0.0,
                percent_regret=_f(r.get("percent_regret_deployed")) or 0.0,
                oracle_size=int(_f(r.get("oracle_size_deployed")) or 1),
                round_type=r.get("round_type", ""),
            ))
    if strict:
        _verify(menus)
    return menus


def _verify(menus):
    """Assert the loaded data reproduces the locked pilot statistics."""
    n_rows = len(menus)
    parts = {m.participant for m in menus}
    regrets = [m.percent_regret for m in menus]
    opt = sum(1 for m in menus if m.is_optimal_choice()) / n_rows
    mean_r = sum(regrets) / n_rows
    srt = sorted(regrets)
    med_r = srt[n_rows // 2] if n_rows % 2 else (srt[n_rows//2 - 1] + srt[n_rows//2]) / 2
    bundle_rate = sum(1 for m in menus if m.chosen and m.chosen.size >= 2) / n_rows
    osize = Counter(m.oracle_size for m in menus)

    problems = []
    if abs(opt - EXPECT["optimal_rate"]) > TOL["rate"]:
        problems.append(f"optimal rate {opt:.4f} != {EXPECT['optimal_rate']} (+-{TOL['rate']})")
    if abs(mean_r - EXPECT["mean_regret"]) > TOL["regret"]:
        problems.append(f"mean regret {mean_r:.4f} != {EXPECT['mean_regret']}")
    if abs(med_r - EXPECT["median_regret"]) > TOL["regret"]:
        problems.append(f"median regret {med_r:.4f} != {EXPECT['median_regret']}")
    if abs(bundle_rate - EXPECT["bundle_rate"]) > TOL["rate"]:
        problems.append(f"bundle rate {bundle_rate:.4f} != {EXPECT['bundle_rate']}")
    if n_rows != EXPECT["n_rows"]:
        problems.append(f"n_rows {n_rows} != {EXPECT['n_rows']}")
    if len(parts) != EXPECT["n_participants"]:
        problems.append(f"participants {len(parts)} != {EXPECT['n_participants']}")
    # oracle size distribution (allow small drift)
    for k, v in EXPECT["oracle_size"].items():
        if abs(osize.get(k, 0) - v) > 5:
            problems.append(f"oracle_size[{k}] {osize.get(k,0)} != {v}")

    print("=" * 64)
    print("FROZEN FOUNDATION — verification against locked pilot statistics")
    print("=" * 64)
    print(f"  participants            {len(parts):>8}   (expect {EXPECT['n_participants']})")
    print(f"  decisions (rows)        {n_rows:>8}   (expect {EXPECT['n_rows']})")
    print(f"  optimal-choice rate     {opt:>8.4f}   (expect {EXPECT['optimal_rate']})")
    print(f"  mean percent regret     {mean_r:>8.4f}   (expect {EXPECT['mean_regret']})")
    print(f"  median percent regret   {med_r:>8.4f}   (expect {EXPECT['median_regret']})")
    print(f"  bundle rate (size>=2)   {bundle_rate:>8.4f}   (expect {EXPECT['bundle_rate']})")
    print(f"  oracle size dist        {dict(sorted(osize.items()))}   (expect {EXPECT['oracle_size']})")
    print("-" * 64)
    if problems:
        print("  FAIL — frozen inputs do not match locked statistics:")
        for p in problems:
            print("   *", p)
        raise SystemExit("Foundation verification FAILED; do not build on this artifact.")
    print("  PASS — frozen inputs reproduce the locked pilot statistics.")
    print("=" * 64)


# ----------------------------------------------------------------------------
# Convenience accessors used downstream
# ----------------------------------------------------------------------------
def by_participant(menus):
    d = defaultdict(list)
    for m in menus:
        d[m.participant].append(m)
    for p in d:
        d[p].sort(key=lambda m: m.round)
    return d


def headline_facts(menus):
    """The single most important descriptive fact for the pilot narrative:
    how often the optimal move is a TRIP, vs how often people actually bundle."""
    n = len(menus)
    opt_is_trip = sum(1 for m in menus if m.oracle_size == 1) / n
    people_bundle = sum(1 for m in menus if m.chosen and m.chosen.size >= 2) / n
    # the over-bundling gap, on menus whose optimum is a single order
    trip_menus = [m for m in menus if m.oracle_size == 1]
    bundled_when_trip = sum(1 for m in trip_menus if m.chosen and m.chosen.size >= 2) / len(trip_menus)
    return dict(
        optimal_is_trip=opt_is_trip,
        people_bundle=people_bundle,
        bundled_when_optimum_was_trip=bundled_when_trip,
        n_trip_optimum_menus=len(trip_menus),
    )


if __name__ == "__main__":
    # Run against the committed frozen files once they are in place.
    menu_csv = sys.argv[1] if len(sys.argv) > 1 else "frozen_bundle_menu_data.csv"
    dec_csv = sys.argv[2] if len(sys.argv) > 2 else "pilot_decisions_deployed.csv"
    menus = load_frozen(menu_csv, dec_csv, strict=True)
    f = headline_facts(menus)
    print("\nHEADLINE NARRATIVE FACT (the over-bundling gap):")
    print(f"  optimal move is a TRIP in           {f['optimal_is_trip']:.1%} of menus")
    print(f"  participants chose to BUNDLE in     {f['people_bundle']:.1%} of menus")
    print(f"  on the {f['n_trip_optimum_menus']} menus whose optimum WAS a trip,")
    print(f"     participants bundled anyway in   {f['bundled_when_optimum_was_trip']:.1%}")
    print("\nFoundation ready. Worker model (stage 3) and policies (stage 4) read these Menu objects.")
