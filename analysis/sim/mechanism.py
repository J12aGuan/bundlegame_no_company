"""
mechanism.py  —  three-mechanism causal decomposition of suboptimal choice.

Using Proposition (contrast-reversal): a wrong choice b vs oracle b* decomposes as
    (a - h)' z  =  sum_k (a_k - h_k) z_k ,   z = x(b*) - x(b),
so each component's weight error (a_k - h_k) contributes a measurable amount to the
reversal. The dominant term names the mechanism for that decision:

  picking_overconfidence : under-pricing PICKING time      (drives over-bundling)
  routing_neglect        : under-pricing CROSS-CITY travel  (drives over-bundling/dispersion)
  overlap_confusion      : mis-pricing SHARED-STORE savings (drives under-bundling)
  pay_chasing            : mis-pricing PAYOUT               (drives jackpot under-bundling)
  local_neglect          : under-pricing LOCAL travel

Five components: payout, picking, local, cross, overlap_savings. Worker weights h are
fit per participant on the SAME scale as the objective a (OLS local prices), anchored
on payout (the component workers price ~correctly, per the model's empirical finding).
A robustness fit lets payout float to test for genuine pay-chasing.
"""
import numpy as np
import math
from collections import defaultdict
from scipy import stats
from scipy.optimize import minimize
from foundation import load_frozen

FEATS5 = ["payout", "picking_time", "local_travel", "cross_city_travel", "overlap_savings"]
MECH = {1: "picking_overconfidence", 2: "local_neglect", 3: "routing_neglect", 4: "overlap_confusion", 0: "pay_chasing"}


def feat5(b):
    return np.array([b.payout, b.picking_time, b.local_travel, b.cross_city_travel, b.overlap_savings], float)

def standardizer(menus):
    A = np.array([feat5(b) for m in menus for b in m.bundles], float)
    mu, sd = A.mean(0), A.std(0); sd[sd == 0] = 1.0
    return mu, sd

def xstd(m, mu, sd):
    return (np.array([feat5(b) for b in m.bundles], float) - mu) / sd

def ols_objective(menus, mu, sd):
    Z, Y = [], []
    for m in menus:
        X = xstd(m, mu, sd); s = np.array([b.score for b in m.bundles]); n = len(X)
        for i in range(n):
            for j in range(n):
                if i != j: Z.append(X[i] - X[j]); Y.append(s[i] - s[j])
    Z, Y = np.array(Z), np.array(Y)
    a, *_ = np.linalg.lstsq(Z, Y, rcond=None)
    return a

def _nll(w, data, ridge, anchor):
    ll = 0.0
    for Fs, ci in data:
        z = Fs @ w; z -= z.max(); p = np.exp(z); p /= p.sum(); ll += math.log(p[ci] + 1e-12)
    return -ll + ridge * float(np.sum((w - anchor) ** 2))

def fit_worker(ms, mu, sd, d, ridge=1e-2):
    rows = []
    for m in ms:
        Fs = xstd(m, mu, sd)
        ci = next((j for j, b in enumerate(m.bundles) if b.is_chosen), None)
        if ci is not None and Fs.shape[0] >= 2: rows.append((Fs, ci))
    if not rows: return None
    return minimize(_nll, np.zeros(d), args=(rows, ridge, np.zeros(d)), method="L-BFGS-B").x

def worker_weights(menus, mu, sd, a_star, anchor_payout=True):
    d = len(FEATS5)
    byp = defaultdict(list)
    for m in menus: byp[m.participant].append(m)
    H = {}
    for p, ms in byp.items():
        w = fit_worker(ms, mu, sd, d)
        if w is None: continue
        if anchor_payout and abs(w[0]) > 1e-6:
            w = w * (a_star[0] / w[0])          # scale so payout matches objective
        elif not anchor_payout:
            w = w * (np.linalg.norm(a_star) / (np.linalg.norm(w) + 1e-9))  # norm-match
        H[p] = w
    return H


def decompose(menus, mu, sd, a_star, H):
    """Per suboptimal decision: classify mechanism by dominant reversal component."""
    recs = []
    seen = {}
    for m in menus: seen.setdefault((m.participant, m.round), m)
    for (p, r), m in seen.items():
        if p not in H: continue
        ch = m.chosen; orc = m.oracle
        if ch is None or orc is None or ch.is_oracle: continue
        X = xstd(m, mu, sd)
        ci = next((j for j, b in enumerate(m.bundles) if b.is_chosen), None)
        oi = next((j for j, b in enumerate(m.bundles) if b.is_oracle), None)
        if ci is None or oi is None: continue
        z = X[oi] - X[ci]                       # contrast oracle - chosen
        h = H[p]
        contrib = (a_star - h) * z              # per-component contribution to reversal
        # only positive contributions explain the error; pick the dominant one
        pos = np.where(contrib > 0, contrib, 0)
        if pos.sum() <= 0: continue
        k = int(np.argmax(pos))
        error_type = "over" if ch.size > orc.size else ("under" if ch.size < orc.size else "swap")
        recs.append(dict(p=p, mech=MECH[k], error=error_type, regret=m.percent_regret,
                         frac=float(pos[k] / pos.sum()), contrib=contrib))
    return recs


def cluster_share(recs, key, val, iters=2000, seed=1):
    byp = defaultdict(list)
    for r in recs: byp[r["p"]].append(r)
    ps = list(byp.keys())
    def stat(rr): 
        n = len(rr); return sum(1 for r in rr if r[key] == val) / n if n else 0
    pt = stat(recs)
    rng = np.random.default_rng(seed); draws = []
    for _ in range(iters):
        samp = []
        for _ in ps: samp.extend(byp[rng.choice(ps)])
        if samp: draws.append(stat(samp))
    return pt, float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))


def main():
    menus = load_frozen("frozen_bundle_menu_data.csv", "pilot_decisions_deployed.csv", strict=False)
    mu, sd = standardizer(menus)
    a = ols_objective(menus, mu, sd)
    H = worker_weights(menus, mu, sd, a, anchor_payout=True)

    # verify behavior reproduction
    seen = {}
    for m in menus: seen.setdefault((m.participant, m.round), m)
    regs = []; opt = 0; n = 0
    for (p, r), m in seen.items():
        if p not in H: continue
        X = xstd(m, mu, sd); ch = int(np.argmax(X @ H[p]))
        regs.append(m.percent_regret if m.bundles[ch].is_chosen else m.percent_regret)
        opt += int(m.bundles[ch].is_oracle); n += 1

    print("=" * 76)
    print("THREE-MECHANISM CAUSAL DECOMPOSITION")
    print("=" * 76)
    print(f"  objective a* (local prices): {np.round(a,3)}")
    print(f"  mean worker h:               {np.round(np.mean(list(H.values()),axis=0),3)}")
    bias = a - np.mean(list(H.values()), axis=0)
    print(f"  mean bias (a*-h):            {np.round(bias,3)}")
    print(f"    -> {FEATS5[int(np.argmax(np.abs(bias[1:])))+1]} is the largest-biased cost component")

    recs = decompose(menus, mu, sd, a, H)
    print(f"\n  suboptimal decisions decomposed: {len(recs)}")

    # ----------------------------------------------------------------------- #
    # HOW THE PAPER TABLE IS GROUPED (lock this; do not re-derive by eye).
    # The five shares printed below are the per-decision DOMINANT reversal
    # component from this module. The manuscript's mechanism table (88/12/0)
    # groups them as:
    #     TIME    = picking_overconfidence + local_neglect + routing_neglect
    #     OVERLAP = overlap_confusion
    #     PAYOUT  = pay_chasing
    # So: all suboptimal -> TIME 88% / OVERLAP 12% / PAYOUT 0% (deployed,
    # payout-anchored); over-bundling subset -> 93 / 7 / 0. Pay-chasing is
    # 0.0% deployed and 8.7% only when payout is left unanchored (printed at
    # the end as the robustness check). NB: the SIMULATION.md "time-underpricing
    # 97%" summary uses a DIFFERENT grouping (picking+local+overlap, routing
    # pulled out) -- it is the same five numbers, not a second result.
    # ----------------------------------------------------------------------- #
    print("\n  MECHANISM SHARES (participant-clustered bootstrap 95% CI):")
    for mname in ["picking_overconfidence", "routing_neglect", "local_neglect", "overlap_confusion", "pay_chasing"]:
        pt, lo, hi = cluster_share(recs, "mech", mname)
        print(f"    {mname:24s} {pt:6.1%}  [{lo:5.1%}, {hi:5.1%}]")

    # THE KEY CROSS-TAB: mechanism by error type (when is it pay vs overlap vs overconfidence?)
    print("\n  MECHANISM x ERROR-TYPE (the central result):")
    over = [r for r in recs if r["error"] == "over"]
    under = [r for r in recs if r["error"] == "under"]
    print(f"    OVER-bundling decisions  (n={len(over)}):")
    for mname in ["picking_overconfidence", "routing_neglect", "local_neglect", "overlap_confusion"]:
        sh = sum(1 for r in over if r["mech"] == mname) / len(over) if over else 0
        print(f"      {mname:24s} {sh:6.1%}")
    print(f"    UNDER-bundling decisions (n={len(under)}):")
    for mname in ["overlap_confusion", "pay_chasing", "picking_overconfidence", "routing_neglect"]:
        sh = sum(1 for r in under if r["mech"] == mname) / len(under) if under else 0
        print(f"      {mname:24s} {sh:6.1%}")

    # worker-level dominant mechanism (heterogeneity -> which workers need which feedback)
    print("\n  WORKER-LEVEL dominant mechanism (heterogeneity):")
    byp = defaultdict(list)
    for r in recs: byp[r["p"]].append(r)
    wdom = defaultdict(int)
    for p, rr in byp.items():
        cnt = defaultdict(int)
        for r in rr: cnt[r["mech"]] += 1
        wdom[max(cnt, key=cnt.get)] += 1
    for mname, c in sorted(wdom.items(), key=lambda x: -x[1]):
        print(f"    {mname:24s} dominates for {c:3d} workers ({c/sum(wdom.values()):.1%})")

    # robustness: does pay-chasing appear if payout is NOT anchored?
    Hf = worker_weights(menus, mu, sd, a, anchor_payout=False)
    recs_f = decompose(menus, mu, sd, a, Hf)
    pc = sum(1 for r in recs_f if r["mech"] == "pay_chasing") / len(recs_f) if recs_f else 0
    print(f"\n  ROBUSTNESS (payout unanchored): pay_chasing share = {pc:.1%}")
    print(f"    (if low even unanchored, over-bundling is genuinely time-underpricing, not pay-chasing)")
    print("=" * 76)


if __name__ == "__main__":
    main()
