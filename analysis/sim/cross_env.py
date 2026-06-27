"""
cross_env.py  —  cross-DISTRIBUTION shifted transfer: coach on PILOT menus
(picking-dominated), transfer to the 35-round CONFIRMATORY menus (which add
routing-stressed menus the pilot lacks). This is the true cross-component shift.

Handles the geometry difference (the confirmatory cities matrix is ~1.3x the
pilot's) with a POOLED standardizer, so the bots' weights are on one consistent
standardized scale across both environments.
"""
import sys, json, math
import numpy as np
from scipy import stats
from foundation import load_frozen, Menu, FeasibleBundle, THIRTYFIVE_ROUND_JSON
import policies as P


def load_confirmatory(path):
    """Load the 35-round frozen set into Menu objects matching the pilot schema."""
    d = json.load(open(path))
    menus = []
    for s in d["scenarios"]:
        bundles = []
        oid = set(s["oracle_bundle_ids"])
        for cb in s["candidate_bundles"]:
            ids = "+".join(cb["bundle_ids"])
            bundles.append(FeasibleBundle(
                ids=ids, size=len(cb["bundle_ids"]),
                payout=float(cb["earnings"]),
                picking_time=float(cb["effective_pick_time_seconds"]),
                local_travel=float(cb["local_travel_time_seconds"]),
                cross_city_travel=float(cb["cross_city_travel_time_seconds"]),
                overlap_savings=0.0, total_time=0.0, score=float(cb["score"]),
                is_oracle=(set(cb["bundle_ids"]) == oid),
                is_chosen=False,
            ))
        orc = next((b for b in bundles if b.is_oracle), None)
        menus.append(Menu(
            participant="conf", round=int(s["round"]), scenario_id=f"conf{s['round']}",
            bundles=bundles, chosen_ids="", oracle_ids="+".join(sorted(oid)),
            chosen_score=0.0, oracle_score=(orc.score if orc else 0.0),
            percent_regret=0.0, oracle_size=(orc.size if orc else 1), round_type="",
        ))
    return menus


def pooled_standardizer(pilot, conf):
    A = np.array([P.feat(b) for m in (pilot + conf) for b in m.bundles], float)
    mu, sd = A.mean(0), A.std(0); sd[sd == 0] = 1.0
    return mu, sd


def trap_pilot(menus):
    seen = {}
    for m in menus:
        seen.setdefault(m.scenario_id, m)
    return [m for m in seen.values()
            if m.oracle and max(m.bundles, key=lambda b: b.payout).ids != m.oracle.ids
            and max(m.bundles, key=lambda b: b.payout).size > m.oracle.size]


def cross_dominated(conf):
    """Confirmatory menus where cross-city is the dominant contrast (routing-stressed)."""
    out = []
    for m in conf:
        P_ = np.std([b.picking_time for b in m.bundles])
        C_ = np.std([b.cross_city_travel for b in m.bundles])
        if C_ >= P_ and C_ > 1.5:
            out.append(m)
    return out


def main():
    pilot = load_frozen("frozen_bundle_menu_data.csv", "pilot_decisions_deployed.csv", strict=False)
    conf = load_confirmatory(THIRTYFIVE_ROUND_JSON)
    mu, sd = pooled_standardizer(pilot, conf)

    # fit bots on pilot (their reward weights), pooled-standardized
    mu0, pooled, a_pilot = P.fit_beliefs(pilot, mu, sd)
    # the TRUTH on the confirmatory environment = oracle weights fit on confirmatory menus
    _, _, a_conf = P.fit_beliefs_conf(conf, mu, sd) if hasattr(P, "fit_beliefs_conf") else (None, None, None)
    Sig0 = P.SIGMA0 * np.eye(len(P.FEATS))

    coach = trap_pilot(pilot)                 # coach on pilot picking traps
    transfer_all = conf                       # transfer to ALL 35-round menus
    transfer_routing = cross_dominated(conf)  # transfer to routing-stressed subset

    print("=" * 80)
    print("CROSS-ENVIRONMENT shifted transfer: pilot coaching -> 35-round transfer")
    print("=" * 80)
    print(f"  coach (pilot traps) {len(coach)} | transfer-all {len(transfer_all)} | transfer-routing {len(transfer_routing)}")
    print(f"  pilot oracle wts a   {np.round(a_pilot,2)}")

    names = ["no_feedback", "scalar", "oracle", "current_loss", "mct"]
    s2_grid = [0.1, 0.3, 1.0]

    def run(transfer, truth):
        Wnu = P.future_relevance(transfer, mu, sd)
        out = {}
        for s2 in s2_grid:
            out[s2] = {}
            for nm in names:
                _, treg = P.run_policy(nm, mu0, truth, Sig0, coach, transfer, mu, sd, Wnu, s2)
                out[s2][nm] = treg
        return out

    # truth for confirmatory transfer = confirmatory oracle weights (best available)
    truth = a_conf if a_conf is not None else a_pilot
    res_all = run(transfer_all, truth)
    res_routing = run(transfer_routing, truth)

    def tbl(res, title):
        print(f"\n  {title}:")
        print(f"    {'policy':14s}" + "".join(f"  s2={s:<4}" for s in s2_grid))
        for nm in names:
            print(f"    {nm:14s}" + "".join(f"  {res[s][nm].mean():7.4f}" for s in s2_grid))

    tbl(res_all, "Transfer to ALL 35-round menus")
    tbl(res_routing, "Transfer to ROUTING-stressed 35-round menus (the cross-component shift)")

    print("\n  KEY — scalar & current_loss vs MCT on ROUTING transfer (where pilot taught nothing):")
    s = 0.3
    base = res_routing[s]["no_feedback"]
    for nm in ["scalar", "current_loss", "mct"]:
        v = res_routing[s][nm]; t = stats.ttest_rel(v, base)
        print(f"    {nm:14s} regret {v.mean():.4f}  vs no_feedback d={v.mean()-base.mean():+.4f} p={t.pvalue:.2g}")
    mc = res_routing[s]["mct"]; cl = res_routing[s]["current_loss"]; sc = res_routing[s]["scalar"]
    print(f"    mct vs current_loss: d={mc.mean()-cl.mean():+.4f} p={stats.ttest_rel(mc,cl).pvalue:.2g}")
    print(f"    mct vs scalar:       d={mc.mean()-sc.mean():+.4f} p={stats.ttest_rel(mc,sc).pvalue:.2g}")
    print("=" * 80)

    # save for the figure
    np.savez("cross_env_results.npz",
             names=names, s2_grid=s2_grid,
             all_means={f"{s}_{nm}": res_all[s][nm].mean() for s in s2_grid for nm in names},
             routing_means={f"{s}_{nm}": res_routing[s][nm].mean() for s in s2_grid for nm in names})


if __name__ == "__main__":
    main()
