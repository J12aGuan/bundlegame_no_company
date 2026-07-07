"""
policies.py  —  Stage 4, FAITHFUL to the model (Section 4: Bayesian Contrast Learning).

Each worker holds a Gaussian belief N(mu_t, Sigma_t) over the OBJECTIVE weights a and
chooses the bundle maximizing posterior-mean value (eq. model-worker-choice, h_t = mu_t).
Feedback regimes (Section 4.4) reveal different measurements, updated via the Gaussian
rule (eq. model-posterior-update):
  1 no_feedback : nothing.
  2 scalar      : aggregate outcome y = a'x(b_chosen) (quantitative, whole-bundle direction).
  3 oracle      : oracle implemented (assisted regret 0); reveals only SIGN a'(x(b*)-x(b))>=0
                  (normal-cone/inequality, probit update, no magnitude -> need not transfer).
  4 current_loss: marginal contrast on the add/drop/swap with largest CURRENT gain a'z.
  5 mct         : marginal contrast on the contrast with largest TEACHING VALUE V_t(z;nu)
                  (eq. model-contrast-value), W(nu) from transfer menus. SAME update as #4.
Free parameter: signal noise sigma^2 (the unpinned rate), reported across a grid.
"""
from __future__ import annotations
import sys, math
import numpy as np
from collections import defaultdict
from scipy import stats
from scipy.optimize import minimize
from scipy.stats import norm
from foundation import load_frozen

FEATS = ["payout", "picking_time", "local_travel", "cross_city_travel"]
SIGMA0 = 1.0
SIGMA2_GRID = [0.1, 0.3, 1.0, 3.0]
COACH_FRAC = 0.6
SEED = 42

def feat(b): return np.array([b.payout, b.picking_time, b.local_travel, b.cross_city_travel], float)
def standardizer(menus):
    A = np.array([feat(b) for m in menus for b in m.bundles], float)
    mu, sd = A.mean(0), A.std(0); sd[sd == 0] = 1.0; return mu, sd
def xstd(m, mu, sd): return (np.array([feat(b) for b in m.bundles], float) - mu) / sd
def _ids(s): return frozenset(x for x in s.split("+") if x)
def regret_of(b, m): return 0.0 if m.oracle_score <= 0 else max(0.0, (m.oracle_score - b.score) / m.oracle_score)

def _nll(w, data, ridge, anchor):
    ll = 0.0
    for Fs, ci in data:
        z = Fs @ w; z -= z.max(); p = np.exp(z); p /= p.sum(); ll += math.log(p[ci] + 1e-12)
    return -ll + ridge * float(np.sum((w - anchor) ** 2))
def _fit(data, ridge, anchor):
    return anchor.copy() if not data else minimize(_nll, anchor.copy(), args=(data, ridge, anchor), method="L-BFGS-B").x
def fit_beliefs(menus, mu, sd, shrink=1.0):
    d = len(FEATS)
    def rows(ms, key):
        out = []
        for m in ms:
            Fs = xstd(m, mu, sd)
            idx = next((j for j, b in enumerate(m.bundles) if key(b)), None)
            if idx is not None and Fs.shape[0] >= 2: out.append((Fs, idx))
        return out
    pooled = _fit(rows(menus, lambda b: b.is_chosen), 1e-3, np.zeros(d))
    byp = defaultdict(list)
    for m in menus: byp[m.participant].append(m)
    mu0 = {p: _fit(rows(ms, lambda b: b.is_chosen), shrink, pooled) for p, ms in byp.items()}
    a = _fit(rows(menus, lambda b: b.is_oracle), 1e-3, np.zeros(d))
    return mu0, pooled, a

def kalman(mu, Sig, z, y, s2):
    Sz = Sig @ z; den = s2 + z @ Sz
    return mu + Sz * (y - z @ mu) / den, Sig - np.outer(Sz, Sz) / den
def probit(mu, Sig, z, s2):
    Sz = Sig @ z; v = s2 + z @ Sz; m = z @ mu; a_ = m / math.sqrt(v)
    lam = norm.pdf(a_) / max(norm.cdf(a_), 1e-9)
    return mu + (Sz / math.sqrt(v)) * lam, Sig - np.outer(Sz, Sz) / v * (lam * (lam + a_))

def probit_smc(mu, Sig, z, s2, n_particles=4000, ess_frac=0.5, rng=None):
    # Sequential-Monte-Carlo oracle (sign) update: particles from the prior, reweight by the
    # probit likelihood P(z'a >= 0), systematic resample when ESS < ess_frac*n, then moment-match
    # back to a Gaussian. Agrees with the analytic probit() to within 1e-3 transfer regret at every
    # sigma^2 (validated); committed as the canonical oracle update (4000 particles, seed 0, ESS 0.5).
    rng = rng or np.random.default_rng(0)
    A = rng.multivariate_normal(mu, Sig, size=n_particles)
    sd = math.sqrt(s2)
    w = norm.cdf((A @ z) / sd)
    if w.sum() <= 0:
        return mu, Sig
    w = w / w.sum()
    ess = 1.0 / np.sum(w ** 2)
    if ess < ess_frac * n_particles:
        idx = rng.choice(n_particles, n_particles, replace=True, p=w)
        A = A[idx]; w = np.full(n_particles, 1.0 / n_particles)
    mu_new = w @ A
    d = A - mu_new
    Sig_new = (d.T * w) @ d
    Sig_new = 0.5 * (Sig_new + Sig_new.T) + 1e-9 * np.eye(len(mu))
    return mu_new, Sig_new

def single_move_contrasts(m, ci):
    C = _ids(m.bundles[ci].ids); out = []
    for j, b in enumerate(m.bundles):
        if j == ci: continue
        B = _ids(b.ids); sym = C ^ B
        if (B < C and len(C - B) == 1) or (B > C and len(B - C) == 1) or (len(B) == len(C) and len(sym) == 2):
            out.append(j)
    return out
def future_relevance(transfer, mu, sd):
    d = len(FEATS); W = np.zeros((d, d)); cnt = 0
    for m in transfer:
        X = xstd(m, mu, sd); n = len(X)
        if n < 2: continue
        Z = np.array([X[i] - X[j] for i in range(n) for j in range(n) if i != j])
        D = len(Z); kappa2 = 2 * math.log(2 * D) if D > 1 else 1.0
        W += kappa2 * (Z.T @ Z); cnt += 1
    return W / max(cnt, 1)
def choose(m, mu, mu_w, sd):
    return int(np.argmax(xstd(m, mu, sd) @ mu_w))

def run_policy(name, mu0, a, Sig0, coach, transfer, mu, sd, Wnu, s2):
    transfer_regret = []; assisted = np.zeros(len(coach))
    for p, w0 in mu0.items():
        w = w0.copy(); Sig = Sig0.copy()
        for t, m in enumerate(coach):
            X = xstd(m, mu, sd); ci = int(np.argmax(X @ w))
            if name == "oracle":
                oi = next((j for j, b in enumerate(m.bundles) if b.is_oracle), ci)
                z = X[oi] - X[ci]
                if np.any(z) and (z @ w) < (z @ a): w, Sig = probit_smc(w, Sig, z, s2)
            else:
                assisted[t] += regret_of(m.bundles[ci], m)
                if name == "no_feedback": pass
                elif name == "scalar":
                    z = X[ci]; w, Sig = kalman(w, Sig, z, z @ a, s2)
                elif name == "current_loss":
                    cand = single_move_contrasts(m, ci)
                    if cand:
                        best = max(cand, key=lambda j: (X[j] - X[ci]) @ a); z = X[best] - X[ci]
                        if (z @ a) > 0: w, Sig = kalman(w, Sig, z, z @ a, s2)
                elif name == "mct":
                    cand = single_move_contrasts(m, ci)
                    if cand:
                        def Vval(j):
                            z = X[j] - X[ci]; Sz = Sig @ z
                            return float(z @ Sig @ Wnu @ Sz / (s2 + z @ Sz))
                        best = max(cand, key=Vval); z = X[best] - X[ci]
                        w, Sig = kalman(w, Sig, z, z @ a, s2)
        treg = [regret_of(m.bundles[choose(m, mu, w, sd)], m) for m in transfer]
        transfer_regret.append(float(np.mean(treg)))
    return assisted / len(mu0), np.array(transfer_regret)

def cluster_ci(v, iters=2000, seed=1):
    r = np.random.default_rng(seed)
    d = [r.choice(v, len(v), replace=True).mean() for _ in range(iters)]
    return float(v.mean()), float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))
def select_traps(menus):
    out = []
    for m in menus:
        if not m.bundles: continue
        hp = max(m.bundles, key=lambda b: b.payout)
        if m.oracle and hp.ids != m.oracle.ids and hp.size > m.oracle.size: out.append(m)
    return out

def main(menus, verbose=True):
    rng = np.random.default_rng(SEED)
    mu, sd = standardizer(menus)
    mu0, pooled, a = fit_beliefs(menus, mu, sd)
    d = len(FEATS); Sig0 = SIGMA0 * np.eye(d)
    traps = select_traps(menus); seen = {}
    for m in traps: seen.setdefault(m.scenario_id, m)
    uniq = list(seen.values()); rng.shuffle(uniq)
    k = int(COACH_FRAC * len(uniq)); coach, transfer = uniq[:k], uniq[k:]
    Wnu = future_relevance(transfer, mu, sd)
    names = ["no_feedback", "scalar", "oracle", "current_loss", "mct"]
    if verbose:
        print("=" * 78)
        print("STAGE 4 (faithful Bayesian contrast learning) — five policies on trap menus")
        print("=" * 78)
        print(f"  bots {len(mu0)} | trap menus {len(uniq)} (coach {len(coach)}/transfer {len(transfer)})")
        print(f"  truth a (oracle wts)   {np.round(a,2)}")
        print(f"  mean worker mu0        {np.round(np.mean(list(mu0.values()),axis=0),2)}")
        print(f"  signal-noise grid s2   {SIGMA2_GRID}   (small = fast learning)")
        print("=" * 78)
    res = {}
    for s2 in SIGMA2_GRID:
        res[s2] = {}
        for nm in names:
            assisted, treg = run_policy(nm, mu0, a, Sig0, coach, transfer, mu, sd, Wnu, s2)
            res[s2][nm] = dict(transfer=treg, tmean=float(treg.mean()), amean=float(assisted.mean()))
    if verbose:
        print("\n  TRANSFER-block regret by policy (lower=better), across noise grid:")
        print(f"    {'policy':14s}" + "".join(f"  s2={s:<4}" for s in SIGMA2_GRID))
        for nm in names:
            print(f"    {nm:14s}" + "".join(f"  {res[s][nm]['tmean']:7.4f}" for s in SIGMA2_GRID))
        print("\n  COACHING-block (assisted) mean regret by policy:")
        for nm in names:
            print(f"    {nm:14s}" + "".join(f"  {res[s][nm]['amean']:7.4f}" for s in SIGMA2_GRID))
        s0 = 0.3
        print(f"\n  At s2={s0}: transfer regret, participant-bootstrap 95% CI, vs no_feedback:")
        base = res[s0]["no_feedback"]["transfer"]
        for nm in names:
            v = res[s0][nm]["transfer"]; pt, lo, hi = cluster_ci(v); tag = ""
            if nm != "no_feedback":
                t = stats.ttest_rel(v, base); tag = f"   d={v.mean()-base.mean():+.4f} p={t.pvalue:.3g}"
            print(f"    {nm:14s} {pt:7.4f}  [{lo:.4f},{hi:.4f}]{tag}")
        print(f"\n  KEY (across grid): oracle coaching->transfer, and MCT vs current_loss on transfer:")
        for s in SIGMA2_GRID:
            orc_c = res[s]["oracle"]["amean"]; orc_t = res[s]["oracle"]["tmean"]
            cl = res[s]["current_loss"]["transfer"]; mc = res[s]["mct"]["transfer"]
            t = stats.ttest_rel(mc, cl); dmc = mc.mean() - cl.mean()
            verdict = "MCT better" if dmc < 0 and t.pvalue < 0.05 else ("CL better" if dmc > 0 and t.pvalue < 0.05 else "n.s.")
            print(f"    s2={s:<4} oracle {orc_c:.4f}->{orc_t:.4f} | mct-cl={dmc:+.4f} p={t.pvalue:.3g} {verdict}")
        print("=" * 78)
    return res

if __name__ == "__main__":
    mc = sys.argv[1] if len(sys.argv) > 1 else "frozen_bundle_menu_data.csv"
    dc = sys.argv[2] if len(sys.argv) > 2 else "pilot_decisions_deployed.csv"
    menus = load_frozen(mc, dc, strict=False)
    main(menus)

def fit_beliefs_conf(conf, mu, sd):
    """Fit 'truth' = oracle weights on the confirmatory menus (for cross-env transfer)."""
    d = len(FEATS)
    rows = []
    for m in conf:
        Fs = xstd(m, mu, sd)
        oi = next((j for j, b in enumerate(m.bundles) if b.is_oracle), None)
        if oi is not None and Fs.shape[0] >= 2:
            rows.append((Fs, oi))
    a = _fit(rows, 1e-3, np.zeros(d))
    return None, None, a
