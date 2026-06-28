"""
reconcile.py  —  reconcile two findings that look contradictory:
  (A) the worker model (fit on rounds 1-10) UNDER-predicts late-round optimal
      rate: people do BETTER late than their early behavior predicts.
  (B) the decay finding: over-bundling regret WORSENS within session.

Hypothesis: improvement is concentrated on EASY (trip-optimal) menus, while
over-bundling persists or worsens on TEMPTING (bundle-feasible) menus. If so,
both are true because they measure different things, and that is a clean,
publishable reconciliation.

Also re-verifies the decay finding on the DEPLOYED scorer (the original decay
result was on the old recomputed scorer; the foundation changed, so it must be
re-checked).
"""
import sys
import numpy as np
from scipy import stats
from collections import defaultdict
from foundation import load_frozen, by_participant

SPLIT = 10  # rounds <=SPLIT are "early", >SPLIT are "late" (matches worker_model)


def overbundled(m):
    """Chose a bigger bundle than the optimum (the over-bundling error)."""
    return m.chosen is not None and m.chosen.size > m.oracle_size


def menu_metrics(ms):
    n = len(ms)
    if n == 0:
        return None
    return dict(
        n=n,
        opt=sum(m.is_optimal_choice() for m in ms) / n,
        reg=float(np.mean([m.percent_regret for m in ms])),
        ob=sum(1 for m in ms if overbundled(m)) / n,
        size=float(np.mean([m.chosen.size for m in ms if m.chosen])),
    )


def decay_recheck(byp):
    """Within-participant slope of over-bundling regret vs round, deployed scorer."""
    print("=" * 70)
    print("RE-VERIFY DECAY on the DEPLOYED scorer")
    print("=" * 70)
    # (a) regret on OVER-BUNDLED decisions vs round position
    slopes = []
    for p, ms in byp.items():
        ob = [m for m in ms if overbundled(m)]
        if len(ob) < 6:
            continue
        x = np.array([m.round for m in ob], float)
        y = np.array([m.percent_regret for m in ob], float)
        if x.std() == 0:
            continue
        slopes.append(np.polyfit(x, y, 1)[0])
    slopes = np.array(slopes)
    t = stats.ttest_1samp(slopes, 0)
    print(f"  over-bundling regret vs round (within participant):")
    print(f"    participants            {len(slopes)}")
    print(f"    mean slope              {slopes.mean():+.5f} per round")
    print(f"    t / p                   t={t.statistic:.2f}, p={t.pvalue:.4f}")
    print(f"    share worsening         {(slopes > 0).mean():.1%}")

    # (b) over-bundling RATE vs round (do they over-bundle more often over time?)
    rate_slopes = []
    for p, ms in byp.items():
        ms = sorted(ms, key=lambda m: m.round)
        if len(ms) < 8:
            continue
        x = np.array([m.round for m in ms], float)
        y = np.array([1.0 if overbundled(m) else 0.0 for m in ms], float)
        if x.std() == 0:
            continue
        rate_slopes.append(np.polyfit(x, y, 1)[0])
    rate_slopes = np.array(rate_slopes)
    t2 = stats.ttest_1samp(rate_slopes, 0)
    print(f"  over-bundling RATE vs round (within participant):")
    print(f"    mean slope              {rate_slopes.mean():+.5f} per round")
    print(f"    t / p                   t={t2.statistic:.2f}, p={t2.pvalue:.4f}")
    print(f"    share increasing        {(rate_slopes > 0).mean():.1%}")
    print()
    return slopes, rate_slopes


def menu_type_split(menus, byp):
    print("=" * 70)
    print("MENU-TYPE SPLIT: early (r<=10) vs late (r>10)")
    print("=" * 70)
    types = [
        ("TRIP-optimal  (oracle size = 1, 'easy')", lambda m: m.oracle_size == 1),
        ("BUNDLE-optimal (oracle size >= 2, 'hard')", lambda m: m.oracle_size >= 2),
    ]
    pooled = {}
    for label, pred in types:
        early = [m for m in menus if pred(m) and m.round <= SPLIT]
        late = [m for m in menus if pred(m) and m.round > SPLIT]
        me, ml = menu_metrics(early), menu_metrics(late)
        pooled[label] = (me, ml)
        print(f"\n  {label}")
        print(f"    {'metric':18s} {'early':>10s} {'late':>10s} {'change':>10s}")
        for k, name in [("opt", "optimal rate"), ("reg", "mean regret"),
                        ("ob", "over-bundle rate"), ("size", "mean size")]:
            print(f"    {name:18s} {me[k]:>10.3f} {ml[k]:>10.3f} {ml[k]-me[k]:>+10.3f}")

    # DiD: is the early->late optimal-rate change DIFFERENT between trip and bundle menus?
    # within-participant, paired
    print("\n" + "-" * 70)
    print("  DIFFERENCE-IN-DIFFERENCES (within participant, paired):")
    d_trip = []  # late-early optimal rate on trip-optimal menus, per participant
    d_bundle = []
    ob_trip_change = []  # late-early over-bundle rate on trip menus
    ob_bundle_change = []
    for p, ms in byp.items():
        for store, dlist, oblist in [(1, d_trip, ob_trip_change), (2, d_bundle, ob_bundle_change)]:
            if store == 1:
                sub = [m for m in ms if m.oracle_size == 1]
            else:
                sub = [m for m in ms if m.oracle_size >= 2]
            e = [m for m in sub if m.round <= SPLIT]
            l = [m for m in sub if m.round > SPLIT]
            if len(e) >= 2 and len(l) >= 2:
                de = sum(m.is_optimal_choice() for m in e) / len(e)
                dl = sum(m.is_optimal_choice() for m in l) / len(l)
                dlist.append(dl - de)
                obe = sum(1 for m in e if overbundled(m)) / len(e)
                obl = sum(1 for m in l if overbundled(m)) / len(l)
                oblist.append(obl - obe)
    d_trip = np.array(d_trip); d_bundle = np.array(d_bundle)
    print(f"    optimal-rate change on TRIP-optimal menus:   {d_trip.mean():+.3f}  (n={len(d_trip)})")
    print(f"    optimal-rate change on BUNDLE-optimal menus: {d_bundle.mean():+.3f}  (n={len(d_bundle)})")
    tt = stats.ttest_1samp(d_trip, 0)
    print(f"      trip change vs 0:   t={tt.statistic:.2f}, p={tt.pvalue:.4f}")
    tb = stats.ttest_1samp(d_bundle, 0)
    print(f"      bundle change vs 0: t={tb.statistic:.2f}, p={tb.pvalue:.4f}")

    ob_trip_change = np.array(ob_trip_change); ob_bundle_change = np.array(ob_bundle_change)
    print(f"\n    over-bundle-rate change on TRIP-optimal menus:   {ob_trip_change.mean():+.3f}")
    print(f"    over-bundle-rate change on BUNDLE-optimal menus: {ob_bundle_change.mean():+.3f}")
    to = stats.ttest_1samp(ob_trip_change, 0)
    print(f"      trip over-bundle change vs 0:   t={to.statistic:.2f}, p={to.pvalue:.4f}")

    print("\n" + "-" * 70)
    print("  READING:")
    if d_trip.mean() > d_bundle.mean() and tt.pvalue < 0.05:
        print("  Improvement concentrates on EASY (trip-optimal) menus: people learn to")
        print("  stop bundling when bundling is clearly wrong. This explains the worker")
        print("  model's late-round optimal-rate gain.")
    else:
        print("  Improvement is NOT cleanly concentrated on trip-optimal menus; the")
        print("  reconciliation is more complex and needs a closer look.")
    if ob_trip_change.mean() < 0:
        print("  Over-bundling on trip-optimal menus FALLS over the session (they stop")
        print("  taking obviously-wrong bundles), consistent with the easy-menu learning.")
    print("=" * 70)


if __name__ == "__main__":
    menu_csv = sys.argv[1] if len(sys.argv) > 1 else "frozen_bundle_menu_data.csv"
    dec_csv = sys.argv[2] if len(sys.argv) > 2 else "pilot_decisions_deployed.csv"
    menus = load_frozen(menu_csv, dec_csv, strict=False)
    byp = by_participant(menus)
    decay_recheck(byp)
    menu_type_split(menus, byp)
