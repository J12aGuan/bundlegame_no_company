"""
describe_simulation.py — prints exactly what the simulation does and at what scale.
Run this for a one-screen summary of the bots, the menus, and the policy experiment.
No figures, no side effects; reads the frozen data and reports.

    python analysis/sim/describe_simulation.py
"""
import numpy as np
from foundation import load_frozen, by_participant
import policies as P

def main():
    m = load_frozen('frozen_bundle_menu_data.csv', 'pilot_decisions_deployed.csv', strict=False)
    byp = by_participant(m)
    n_bots = len(byp)
    n_dec = sum(len(v) for v in byp.values())
    per = [len(v) for v in byp.values()]

    print("=" * 70)
    print("BUNDLEGAME SIMULATION — what runs, and at what scale")
    print("=" * 70)
    print("\nPART 1: THE BOTS (worker model)")
    print(f"  bots (one per pilot participant): {n_bots}")
    print(f"  decisions behind them: {n_dec} (per bot: min {min(per)}, max {max(per)}, mean {n_dec/n_bots:.1f})")
    print(f"  each bot: 4 subjective weights (payout, picking, local, cross-city)")
    print(f"  estimator: conditional logit with shrinkage (partial pooling, strength chosen on held-out data)")
    print(f"  validation: TEMPORAL — fit on rounds 1-10, predict rounds 11+")

    # menus and the coaching/transfer split actually used
    seen = {}
    for mm in m: seen.setdefault(mm.scenario_id, mm)
    traps = [mm for mm in seen.values()
             if mm.oracle and max(mm.bundles, key=lambda b: b.payout).ids != mm.oracle.ids
             and max(mm.bundles, key=lambda b: b.payout).size > mm.oracle.size]
    k = int(P.COACH_FRAC * len(traps))
    print("\nPART 2: THE FEEDBACK EXPERIMENT (policies)")
    print(f"  trap menus used: {len(traps)} (split {P.COACH_FRAC:.0%} coaching / {1-P.COACH_FRAC:.0%} transfer)")
    print(f"    -> coaching menus: {k}, transfer menus: {len(traps)-k}")
    print(f"  policies (5): no_feedback, scalar, oracle, current_loss, mct")
    print(f"  learning-rate grid (the one free parameter): {P.SIGMA2_GRID}")
    print(f"  seed: {P.SEED} (fully deterministic)")
    total = n_bots * 5 * len(P.SIGMA2_GRID)
    print(f"\n  TOTAL POLICY RUNS: {n_bots} bots x 5 policies x {len(P.SIGMA2_GRID)} rates = {total} bot-policy-rate runs")
    print("\n  Each run: bot updates a belief on coaching menus, then is scored (no feedback)")
    print("  on transfer menus. current_loss and mct share an update rule and differ only in")
    print("  which contrast is taught, so their gap is the value of teaching the transferable one.")
    print("=" * 70)
    print("Caveat: bots assume the model's weighting structure, so this tests the model's")
    print("predictions faithfully but does not prove humans learn this way (that is the 35-round study).")
    print("=" * 70)

if __name__ == "__main__":
    main()
