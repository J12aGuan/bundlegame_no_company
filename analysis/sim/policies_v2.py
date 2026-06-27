"""
policies_v2.py  —  faithful Bayesian contrast learning, CORRECTED:
  * objective = OLS local prices a* (meaningful scale), NOT scale-arbitrary logit.
  * feedback reveals the TRUE objective marginal value (true Δscore), per the model.
  * mu0 on a*'s scale (payout-anchored), so learning pulls time weights toward truth.
A policy can only teach a contrast that EXISTS in its coaching menus (relevance).
"""
import math
import numpy as np
from scipy import stats
from scipy.stats import norm
import policies as P
from objective import ols_objective, bot_beliefs


def kalman_to(mu, Sig, z, y, s2):
    """Update belief mu so mu'z predicts observed objective value y (true Δscore)."""
    Sz = Sig @ z; den = s2 + z @ Sz
    return mu + Sz * (y - z @ mu) / den, Sig - np.outer(Sz, Sz) / den


def probit_sign(mu, Sig, z, s2):
    Sz = Sig @ z; v = s2 + z @ Sz; m = z @ mu; a_ = m / math.sqrt(v)
    lam = norm.pdf(a_) / max(norm.cdf(a_), 1e-9)
    return mu + (Sz / math.sqrt(v)) * lam, Sig - np.outer(Sz, Sz) / v * (lam * (lam + a_))


def run_policy(name, mu0, Sig0, coach, transfer, mu, sd, Wnu, s2):
    """One policy: coach (update belief) then frozen transfer (measure true regret)."""
    treg_out = []; assisted = np.zeros(len(coach))
    for p, w0 in mu0.items():
        w = w0.copy(); Sig = Sig0.copy()
        for t, m in enumerate(coach):
            X = P.xstd(m, mu, sd); s = np.array([b.score for b in m.bundles])
            ci = int(np.argmax(X @ w))
            if name == "oracle":
                oi = next((j for j, b in enumerate(m.bundles) if b.is_oracle), ci)
                z = X[oi] - X[ci]
                # oracle reveals only the SIGN that b* >= chosen (true score higher)
                if np.any(z) and s[oi] > s[ci] and (z @ w) < 0:
                    w, Sig = probit_sign(w, Sig, z, s2)
            else:
                assisted[t] += P.regret_of(m.bundles[ci], m)
                if name == "no_feedback":
                    pass
                elif name == "scalar":
                    # aggregate outcome: reveal the TRUE score of the chosen bundle,
                    # measured along the chosen-bundle direction (centered)
                    z = X[ci] - X.mean(0)
                    y = s[ci] - s.mean()
                    w, Sig = kalman_to(w, Sig, z, y, s2)
                elif name == "current_loss":
                    cand = P.single_move_contrasts(m, ci)
                    if cand:
                        best = max(cand, key=lambda j: s[j] - s[ci])   # largest TRUE current gain
                        if s[best] > s[ci]:
                            z = X[best] - X[ci]; w, Sig = kalman_to(w, Sig, z, s[best] - s[ci], s2)
                elif name == "mct":
                    cand = P.single_move_contrasts(m, ci)
                    if cand:
                        def V(j):
                            z = X[j] - X[ci]; Sz = Sig @ z
                            return float(z @ Sig @ Wnu @ Sz / (s2 + z @ Sz))
                        best = max(cand, key=V)                          # largest TEACHING VALUE
                        z = X[best] - X[ci]
                        if s[best] != s[ci]:
                            w, Sig = kalman_to(w, Sig, z, s[best] - s[ci], s2)
        treg = [P.regret_of(m.bundles[int(np.argmax(P.xstd(m, mu, sd) @ w))], m) for m in transfer]
        treg_out.append(float(np.mean(treg)))
    return assisted / len(mu0), np.array(treg_out)


def cluster_ci(v, iters=2000, seed=1):
    r = np.random.default_rng(seed)
    d = [r.choice(v, len(v), replace=True).mean() for _ in range(iters)]
    return float(v.mean()), float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))
