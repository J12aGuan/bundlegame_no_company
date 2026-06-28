"""
shifted_transfer.py  —  Stage 4b: same-distribution vs SHIFTED transfer.

The pilot is entirely picking-dominated (no routing-stressed menus exist; a true
cross-component shift is what the confirmatory 35-round design supplies). The pilot
DOES support a within-picking intensity shift: trap menus range from MILD (small
picking contrast, modest payout lure) to SHARP (large picking contrast, big lure,
the menus built to fool). We test:

  same-distribution : coach and transfer drawn from the SAME intensity pool.
  shifted           : coach on MILD traps, transfer to SHARP traps.

Model prediction (relevance argument + MCT forward-looking selection):
  Under the shift, policies that teach what is salient in the MILD coaching menus
  (current_loss greedy on current gain; scalar along chosen-bundle span) should
  degrade on SHARP transfer menus, while MCT, which selects contrasts by future
  teaching value V_t(z;nu) computed from the SHARP transfer distribution, should
  hold up better. This isolates the value of teaching the future-relevant contrast.
"""
import sys
import numpy as np
from scipy import stats
from foundation import load_frozen
import policies as P   # reuse the faithful Bayesian machinery

PICK_SD_TERCILE_LO = 7.4    # <= mild
PICK_SD_TERCILE_HI = 8.4    # >= sharp


def pick_sd(m):
    return float(np.std([b.picking_time for b in m.bundles]))


def split_pools(menus):
    seen = {}
    for m in menus:
        seen.setdefault(m.scenario_id, m)
    traps = [m for m in seen.values()
             if m.oracle and max(m.bundles, key=lambda b: b.payout).ids != m.oracle.ids
             and max(m.bundles, key=lambda b: b.payout).size > m.oracle.size]
    mild = [m for m in traps if pick_sd(m) <= PICK_SD_TERCILE_LO]
    sharp = [m for m in traps if pick_sd(m) >= PICK_SD_TERCILE_HI]
    mid = [m for m in traps if PICK_SD_TERCILE_LO < pick_sd(m) < PICK_SD_TERCILE_HI]
    return traps, mild, mid, sharp


def run_condition(label, coach, transfer, mu0, a, Sig0, mu, sd, s2_grid):
    Wnu = P.future_relevance(transfer, mu, sd)
    names = ["no_feedback", "scalar", "oracle", "current_loss", "mct"]
    out = {}
    for s2 in s2_grid:
        out[s2] = {}
        for nm in names:
            _, treg = P.run_policy(nm, mu0, a, Sig0, coach, transfer, mu, sd, Wnu, s2)
            out[s2][nm] = treg
    return out


def main():
    mc = sys.argv[1] if len(sys.argv) > 1 else "frozen_bundle_menu_data.csv"
    dc = sys.argv[2] if len(sys.argv) > 2 else "pilot_decisions_deployed.csv"
    menus = load_frozen(mc, dc, strict=False)
    mu, sd = P.standardizer(menus)
    mu0, pooled, a = P.fit_beliefs(menus, mu, sd)
    Sig0 = P.SIGMA0 * np.eye(len(P.FEATS))
    rng = np.random.default_rng(P.SEED)

    traps, mild, mid, sharp = split_pools(menus)
    print("=" * 80)
    print("STAGE 4b — same-distribution vs SHIFTED transfer (within-picking intensity)")
    print("=" * 80)
    print(f"  trap scenarios {len(traps)}  | mild {len(mild)}  mid {len(mid)}  sharp {len(sharp)}")
    print(f"  mild  pick_sd <= {PICK_SD_TERCILE_LO}   sharp pick_sd >= {PICK_SD_TERCILE_HI}")

    s2_grid = [0.1, 0.3, 1.0]
    names = ["no_feedback", "scalar", "oracle", "current_loss", "mct"]

    # SAME-DISTRIBUTION: split the SHARP pool in half (coach sharp, transfer sharp)
    sharp_sh = sharp[:]; rng.shuffle(sharp_sh)
    h = len(sharp_sh) // 2
    same_coach, same_transfer = sharp_sh[:h] + mid[:2], sharp_sh[h:]
    same = run_condition("same", same_coach, same_transfer, mu0, a, Sig0, mu, sd, s2_grid)

    # SHIFTED: coach on MILD (+mid), transfer to SHARP
    shifted = run_condition("shifted", mild + mid, sharp, mu0, a, Sig0, mu, sd, s2_grid)

    def tbl(res, title):
        print(f"\n  {title} — transfer regret (lower=better):")
        print(f"    {'policy':14s}" + "".join(f"  s2={s:<4}" for s in s2_grid))
        for nm in names:
            print(f"    {nm:14s}" + "".join(f"  {res[s][nm].mean():7.4f}" for s in s2_grid))

    tbl(same, "SAME-DISTRIBUTION transfer (coach sharp -> transfer sharp)")
    tbl(shifted, "SHIFTED transfer (coach MILD -> transfer SHARP)")

    # the key test: does MCT's advantage over current_loss GROW under the shift?
    print("\n  KEY — MCT vs current_loss, same vs shifted (paired t across bots):")
    print(f"    {'s2':5s}  {'same: mct-cl':>14s}  {'shifted: mct-cl':>16s}   shift widens gap?")
    for s in s2_grid:
        ds = same[s]["mct"] - same[s]["current_loss"]
        dsh = shifted[s]["mct"] - shifted[s]["current_loss"]
        ts = stats.ttest_rel(same[s]["mct"], same[s]["current_loss"])
        tsh = stats.ttest_rel(shifted[s]["mct"], shifted[s]["current_loss"])
        widens = "YES" if (dsh.mean() < ds.mean()) else "no"
        print(f"    {s:<5}  {ds.mean():+8.4f} (p={ts.pvalue:.2g})  {dsh.mean():+8.4f} (p={tsh.pvalue:.2g})   {widens}")

    # also: how much does EACH policy degrade going from same to shifted (transfer regret rise)?
    print("\n  Degradation under shift (shifted transfer regret − same transfer regret), s2=0.3:")
    s = 0.3
    for nm in names:
        deg = shifted[s][nm].mean() - same[s][nm].mean()
        print(f"    {nm:14s}  {deg:+.4f}")
    print("  (a policy that learned the transferable contrast degrades LESS under the shift)")
    print("=" * 80)


if __name__ == "__main__":
    main()
