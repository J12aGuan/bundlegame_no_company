"""
addropswap.py  —  Stage 2 of the BundleGame simulation pipeline.

The empirical bridge between the pilot data and the model: for every non-oracle
choice, find the best single local correction (drop one order, add one order, or
swap one), measure how much regret it closes, and classify the mistake. This is
where the causal story gets its evidence, and where "we looked at everything"
becomes concrete.

Every reported share and distribution carries a participant-clustered bootstrap
confidence interval, because decisions are nested within participants and the
naive i.i.d. interval would overstate precision.

Reads the Menu objects from foundation.py. Produces:
  * per-decision correction records (drop/add/swap gains, regret closed, type)
  * mistake-type shares with cluster-bootstrap 95% CIs
  * a directional test: does over-inclusion significantly exceed under-inclusion?
  * payout-vs-time consequence of orders that should have been dropped
    (the heart of "people chase payout and underweight picking time")

Mistake taxonomy (per Nicholas's professor's spec)
--------------------------------------------------
  over_inclusion   : the best single move is to DROP an order  (bundled too much)
  under_inclusion  : the best single move is to ADD an order   (bundled too little)
  wrong_composition: the best single move is a one-for-one SWAP (right size, wrong mix)
  no_clean_onestep : even the best single move closes < THRESH of the regret gap

Frozen definition behind the paper's add/drop/swap table (do NOT change)
------------------------------------------------------------------------
  * one-step gains are in SCORE units: gain = neighbor.score - chosen_score,
    where score is the deployed rate ($ per second). Not regret, not $.
  * ties are broken DROP > ADD > SWAP (prefer the simplest correction).
  * a move is a "clean fix" only if it closes >= NO_CLEAN_ONESTEP_THRESHOLD
    (= 0.50) of the regret gap; otherwise the decision is no_clean_onestep.
    The 0.50 is an intended, frozen value, not a placeholder.
  * exceeds_oracle: on ~5 decisions a single move beats the STORED oracle
    (the stored oracle is the generation-time best_bundle_ids, not the
    per-decision argmax). This does NOT affect the reported shares, because
    classification uses the recomputed best neighbor (best_move), not the
    stored oracle.
  Reproduces: over_inclusion 47.2 / under 8.8 / wrong_composition 8.4 /
  no_clean_onestep 35.6; mean regret closed by a single move 66.4%.
"""

from __future__ import annotations
import math, random
from collections import defaultdict, Counter
from dataclasses import dataclass

# Fraction-of-regret-closed below which a mistake is "not a clean one-step fix".
NO_CLEAN_ONESTEP_THRESHOLD = 0.50
BOOTSTRAP_ITERS = 2000
random.seed(42)


@dataclass
class CorrectionRecord:
    participant: str
    round: int
    regret: float                 # official deployed percent regret of the choice
    regret_gap: float             # oracle_score - chosen_score (absolute, > 0)
    best_drop_gain: float         # absolute score gain from best single drop (>=0)
    best_add_gain: float
    best_swap_gain: float
    best_local_gain: float        # max of the three
    best_move: str                # 'drop' | 'add' | 'swap' | 'none'
    frac_regret_closed: float     # best_local_gain / regret_gap, clipped [0,1]
    mistake_type: str
    dropped_order_payout: float   # for over-inclusion: payout of the order best dropped
    dropped_order_time: float     # ... and its marginal time burden (score-consistent)
    exceeds_oracle: bool          # True if a single move scored above the stored oracle


def _ids(s):
    return frozenset(x for x in s.split("+") if x)


def analyze_menu(menu) -> CorrectionRecord | None:
    """Compute the best single local correction for one non-oracle decision."""
    chosen = menu.chosen
    if chosen is None:
        return None
    if menu.is_optimal_choice():
        return None  # nothing to correct

    C = _ids(chosen.ids)
    chosen_score = chosen.score
    oracle_score = menu.oracle.score if menu.oracle else menu.oracle_score
    regret_gap = oracle_score - chosen_score
    if regret_gap <= 0:
        return None  # defensive; non-oracle should have positive gap

    best_drop = best_add = best_swap = 0.0
    drop_target = None  # the feasible bundle reached by the best drop

    for b in menu.bundles:
        B = _ids(b.ids)
        if B == C:
            continue
        gain = b.score - chosen_score
        sym = C ^ B
        if B < C and len(C - B) == 1 and len(B) == len(C) - 1:
            # drop exactly one order
            if gain > best_drop:
                best_drop = gain; drop_target = b
        elif B > C and len(B - C) == 1 and len(B) == len(C) + 1:
            if gain > best_add:
                best_add = gain
        elif len(B) == len(C) and len(sym) == 2:
            if gain > best_swap:
                best_swap = gain

    best_drop = max(0.0, best_drop)
    best_add = max(0.0, best_add)
    best_swap = max(0.0, best_swap)
    best_local = max(best_drop, best_add, best_swap)

    # which move wins (ties broken drop > add > swap, i.e. prefer the simplest)
    if best_local <= 0:
        move = "none"
    elif best_drop == best_local:
        move = "drop"
    elif best_add == best_local:
        move = "add"
    else:
        move = "swap"

    frac = best_local / regret_gap if regret_gap > 0 else 0.0
    exceeds_oracle = frac > 1.0 + 1e-9
    frac = min(1.0, max(0.0, frac))

    # classify
    if best_local <= 0 or frac < NO_CLEAN_ONESTEP_THRESHOLD:
        mistake = "no_clean_onestep"
    elif move == "drop":
        mistake = "over_inclusion"
    elif move == "add":
        mistake = "under_inclusion"
    else:
        mistake = "wrong_composition"

    # consequence of the order that should have been dropped (over-inclusion story)
    d_payout = d_time = 0.0
    if drop_target is not None and move == "drop":
        dropped = C - _ids(drop_target.ids)            # the single removed order id
        # marginal payout = how much payout that order contributed to the chosen bundle
        d_payout = chosen.payout - drop_target.payout
        # marginal time = how much time it added (score-consistent: includes lost savings)
        d_time = chosen.total_time - drop_target.total_time

    return CorrectionRecord(
        participant=menu.participant, round=menu.round,
        regret=menu.percent_regret, regret_gap=regret_gap,
        best_drop_gain=best_drop, best_add_gain=best_add, best_swap_gain=best_swap,
        best_local_gain=best_local, best_move=move,
        frac_regret_closed=frac, mistake_type=mistake,
        dropped_order_payout=d_payout, dropped_order_time=d_time,
        exceeds_oracle=exceeds_oracle,
    )


def analyze_all(menus):
    recs = [r for r in (analyze_menu(m) for m in menus) if r is not None]
    return recs


# ----------------------------------------------------------------------------
# Participant-clustered bootstrap
# ----------------------------------------------------------------------------
def _cluster_bootstrap(recs, stat_fn, iters=BOOTSTRAP_ITERS):
    """Resample PARTICIPANTS with replacement; recompute stat_fn each time.
    Returns (point_estimate, lo95, hi95)."""
    by_p = defaultdict(list)
    for r in recs:
        by_p[r.participant].append(r)
    participants = list(by_p.keys())
    point = stat_fn(recs)
    draws = []
    for _ in range(iters):
        sample = []
        for _ in participants:
            p = random.choice(participants)
            sample.extend(by_p[p])
        if sample:
            draws.append(stat_fn(sample))
    draws.sort()
    lo = draws[int(0.025 * len(draws))]
    hi = draws[int(0.975 * len(draws))]
    return point, lo, hi


def mistake_share(recs, kind):
    n = len(recs)
    return sum(1 for r in recs if r.mistake_type == kind) / n if n else 0.0


def summarize(menus, verbose=True):
    recs = analyze_all(menus)
    n_dec = sum(1 for m in menus if m.chosen is not None)
    n_sub = len(recs)  # non-optimal decisions analyzed

    results = {"n_decisions": n_dec, "n_suboptimal": n_sub, "shares": {}, "tests": {}}

    kinds = ["over_inclusion", "under_inclusion", "wrong_composition", "no_clean_onestep"]
    for k in kinds:
        pt, lo, hi = _cluster_bootstrap(recs, lambda rr, k=k: mistake_share(rr, k))
        results["shares"][k] = (pt, lo, hi)

    # fraction of regret closed by the best single move (overall)
    frac_pt, frac_lo, frac_hi = _cluster_bootstrap(
        recs, lambda rr: sum(r.frac_regret_closed for r in rr) / len(rr) if rr else 0.0)
    results["mean_frac_regret_closed"] = (frac_pt, frac_lo, frac_hi)

    # DIRECTIONAL TEST: over-inclusion share minus under-inclusion share, with CI.
    diff_pt, diff_lo, diff_hi = _cluster_bootstrap(
        recs, lambda rr: mistake_share(rr, "over_inclusion") - mistake_share(rr, "under_inclusion"))
    results["tests"]["over_minus_under"] = (diff_pt, diff_lo, diff_hi)
    over_dominates = diff_lo > 0  # CI excludes 0 => over-inclusion significantly dominant

    # PAYOUT vs TIME of orders that should have been dropped (over-inclusion mechanism)
    oi = [r for r in recs if r.mistake_type == "over_inclusion" and r.best_move == "drop"]
    if oi:
        mp_pt, mp_lo, mp_hi = _cluster_bootstrap(oi, lambda rr: sum(r.dropped_order_payout for r in rr)/len(rr))
        mt_pt, mt_lo, mt_hi = _cluster_bootstrap(oi, lambda rr: sum(r.dropped_order_time for r in rr)/len(rr))
        results["dropped_order_payout"] = (mp_pt, mp_lo, mp_hi)
        results["dropped_order_time"] = (mt_pt, mt_lo, mt_hi)
        results["n_over_inclusion"] = len(oi)

    n_exceeds = sum(1 for r in recs if r.exceeds_oracle)
    results["n_single_move_beats_stored_oracle"] = n_exceeds

    if verbose:
        print("=" * 70)
        print("STAGE 2 — add / drop / swap empirical analysis")
        print("=" * 70)
        print(f"  decisions analyzed        {n_dec}")
        print(f"  suboptimal (corrected)    {n_sub}  ({n_sub/n_dec:.1%} of decisions)")
        print("-" * 70)
        print("  Mistake-type shares (participant-clustered bootstrap 95% CI):")
        for k in kinds:
            pt, lo, hi = results["shares"][k]
            print(f"    {k:18s}  {pt:6.1%}   [{lo:5.1%}, {hi:5.1%}]")
        print("-" * 70)
        pt, lo, hi = results["mean_frac_regret_closed"]
        print(f"  mean regret closed by a single move: {pt:.1%}  [{lo:.1%}, {hi:.1%}]")
        print("-" * 70)
        d, dlo, dhi = results["tests"]["over_minus_under"]
        verdict = "SIGNIFICANT (CI excludes 0)" if over_dominates else "not significant"
        print(f"  over-inclusion minus under-inclusion: {d:+.1%}  [{dlo:+.1%}, {dhi:+.1%}]  -> {verdict}")
        if oi:
            mp = results["dropped_order_payout"]; mt = results["dropped_order_time"]
            print("-" * 70)
            print(f"  orders that should have been dropped (n={len(oi)}):")
            print(f"    mean payout contributed   {mp[0]:6.2f}  [{mp[1]:.2f}, {mp[2]:.2f}]  (game-$)")
            print(f"    mean time burden added    {mt[0]:6.2f}  [{mt[1]:.2f}, {mt[2]:.2f}]  (seconds)")
            print(f"    -> people accept these orders' payout while paying disproportionate time")
        if n_exceeds:
            print("-" * 70)
            print(f"  note: a single move beats the STORED oracle on {n_exceeds} decisions")
            print(f"        (expected: stored oracle is generation-time best_bundle_ids, not argmax)")
        print("=" * 70)

    return results, recs


if __name__ == "__main__":
    import sys
    from foundation import load_frozen
    menu_csv = sys.argv[1] if len(sys.argv) > 1 else "frozen_bundle_menu_data.csv"
    dec_csv = sys.argv[2] if len(sys.argv) > 2 else "pilot_decisions_deployed.csv"
    strict = "--nostrict" not in sys.argv
    menus = load_frozen(menu_csv, dec_csv, strict=strict)
    summarize(menus)
