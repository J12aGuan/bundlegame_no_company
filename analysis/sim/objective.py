"""
objective.py  —  principled objective weights via OLS local prices (Lemma local-prices),
replacing the scale-arbitrary logit fit that caused the cross-environment artifact.
Also builds per-bot initial beliefs mu0 on the SAME scale, anchored on payout (which
workers perceive ~correctly per the model), so the bias lives in the time weights.
"""
import numpy as np
import policies as P
from scipy.optimize import minimize
import math


def ols_objective(menus, mu, sd):
    """a* = best linear predictor of true Δscore from Δ(standardized features)."""
    Z, Y = [], []
    for m in menus:
        X = P.xstd(m, mu, sd); s = np.array([b.score for b in m.bundles]); n = len(X)
        for i in range(n):
            for j in range(n):
                if i != j:
                    Z.append(X[i] - X[j]); Y.append(s[i] - s[j])
    Z, Y = np.array(Z), np.array(Y)
    a, *_ = np.linalg.lstsq(Z, Y, rcond=None)
    return a


def bot_beliefs(menus, mu, sd, a_star):
    """Per-bot mu0 on a_star's scale: fit each bot's choice ratios (logit), then rescale
    so the payout component equals a_star's payout (workers get payout ~right)."""
    d = len(P.FEATS)
    from collections import defaultdict
    byp = defaultdict(list)
    for m in menus:
        byp[m.participant].append(m)
    mu0 = {}
    for p, ms in byp.items():
        rows = []
        for m in ms:
            Fs = P.xstd(m, mu, sd)
            ci = next((j for j, b in enumerate(m.bundles) if b.is_chosen), None)
            if ci is not None and Fs.shape[0] >= 2:
                rows.append((Fs, ci))
        w = P._fit(rows, 1e-2, np.zeros(d)) if rows else np.zeros(d)
        if abs(w[0]) > 1e-6:
            w = w * (a_star[0] / w[0])      # rescale so payout matches a_star
        else:
            w = a_star.copy()
        mu0[p] = w
    return mu0


def true_dscore(m, j, ci):
    """The platform's revealed objective marginal value: true score difference."""
    return m.bundles[j].score - m.bundles[ci].score
