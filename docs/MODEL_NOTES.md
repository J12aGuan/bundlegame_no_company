# CHI diagnosis model — scope, identifiability, and the learning-index approximation

Notes on the model behind the dynamic counterfactual-feedback study. Scope: the
runtime diagnosis (`src/lib/chiDiagnosis.js`), the trap menus
(`src/lib/chiScenarioDesign.js`), and the span check (`src/lib/menuSpan.js`).
This documents three things a referee will probe: the feature/bias scope (P5), the
numeric identifiability of the menus (P4), and the learning-index approximation to
the v11 theorem (P4).

## 1. Feature vs. bias scope — local and savings are NUISANCE axes (P5)

The conditional logit fits weights over **five** standardized features:

| feature | role |
|---|---|
| `earnings` | value (the W3 axis) |
| `effective_pick_time_seconds` | cost — the W1 axis (over-bundling / pick neglect) |
| `cross_city_travel_time_seconds` | cost — the W2 axis (route / cross-city neglect) |
| `local_travel_time_seconds` | cost — **nuisance** (not a coached weakness) |
| `shared_item_savings_seconds` | cost offset — **nuisance** (not a coached weakness) |

The bias vocabulary has **three** axes (W1 pick, W2 cross, W3 earnings). `local` and
`shared_item_savings` are deliberately **nuisance axes**: real costs the participant
should respect, but NOT things we diagnose or coach. **Decision (P5): nuisance, not
bias axes.** Rationale:

- They are not separately actionable coaching targets the way "you over-bundle" or
  "you chase payout" are; folding them into the weakness vocabulary would add coached
  axes with no clear intervention message and dilute the three the study is about.
- A 5-feature / 3-bias model is only a silent gap if the *extra* cost axes can be
  **mistaken** for a bias axis. The risk is concrete: a participant who under-weights
  `local` takes the high-pay trap order H and, if earnings co-moves with `local` on
  every trap, is misread as payout-overweighting (W3).

We close that gap two ways rather than by promoting `local`/`savings` to bias axes:

1. **The traps do not lean on a single nuisance axis as the confound.** H is made
   sub-optimal via DIFFERENT cost axes across menus (slow-via-local, slow-via-cross,
   slow-via-pick — `TRAP_PAY_AXES`). Earnings is then the only signal consistent with
   always choosing H, so the logit attributes a single-axis cost neglect to that axis
   (which, being `local`/`cross`, is uncoachable) and NOT to W3. Because the logit fits
   `local` and `cross` as their own features, a local/cross neglecter loads those
   features, not `earnings`.
2. **Abstention.** When the dominant leak is an uncoachable axis (cross-city W2) that
   clearly exceeds the best coachable leak, or the best coachable leak is below a noise
   floor, `diagnose()` returns `learning_target = "none"` and the feedback falls back to
   the untargeted marginal move. So a `local`/`cross` neglecter is never coached on
   payout — it abstains.

`savings` is only non-zero for same-store bundles and is collinear-by-construction with
grouped pick; it is retained as a feature so the logit can net it out of the time
estimate, but it is never a diagnosis target.

## 2. Numeric identifiability of the menus (P4)

`src/lib/menuSpan.js` + `scripts/check-menu-span.mjs` compute, per block, the rank and
condition number of the standardized **one-step marginal-vector** matrix (each legal
candidate minus the menu optimum) over `{earnings, pick, local, cross}`. Rank = number
of jointly identifiable axes.

Result on the default set (`node scripts/check-menu-span.mjs`):

```
diagnostic (A)            rank 4/4  condition ~4
retention (re-tune)       rank 4/4  condition ~13   (cross weakest, still spanned)
diagnostic + retention    rank 4/4  condition ~4    <- the re-diagnosis input
traps only                rank 4/4  condition ~5
earnings x local (traps)  rank 2/2  condition ~2    <- W3 decoupled from local
earnings x cross (traps)  rank 2/2
earnings x pick  (traps)  rank 2/2
```

So the deployed menus **span** the earnings × {each cost axis} subspace: the
identifiability theorem's menu-span condition holds numerically, not by assertion.
Tested in `tests/js/chi-menu-span.test.mjs`.

**Stress test (`scripts/stress-chi-identifiability.mjs`, C1).** The span result above is
under near-argmax choices and the correct scorer. The stress test pressure-tests the two
conditions that span check does NOT cover — (a) **measurement noise** (finite logit
temperature + a uniform lapse rate) and (b) a **misspecified aggregation V** (the
participant's true value differs from `earnings / time`: convex/concave time, diminishing
returns on pay, or a non-ratio additive utility) — and reports where recovery degrades.
Findings (`node scripts/stress-chi-identifiability.mjs`, design-adequacy on planted biases,
NOT human evidence):

- **Identifiability is subspace-dependent — the headline.** At the clean + correctly
  specified corner the *naive pooled* estimator recovers a planted payout leak (W3) only
  ~40%, but restricting the read to the **spanning (payout-trap) subspace** recovers ~90%.
  The non-trap picking-stress menus inject a W1 confound (taking the high-pay slow bundle
  also over-bundles) and can even flip the earnings bias negative, so a uniform pool *loses*
  W3. The leak is still **observable where the menus span** (positive earnings strength,
  non-zero Fisher information): the loss is an **estimator/pooling** artifact, not
  unobservability. This is the empirical hook for the C2 observability formalisation (read
  the latent bias on the information-bearing subspace) and is the concrete form of the
  "picking-menu re-confound."
- **Noise** degrades trap-subspace W3 recovery ~90% → ~38% (clean → severe) and W1 recovery
  100% → ~76%. **Caveat for the C2 bound:** the *empirical* per-axis Fisher info RISES under
  noise (the Hessian inflates as the fitted weights shrink and choice probabilities flatten
  toward uniform), so the raw Hessian-diagonal proxy is **non-monotone** with recoverability
  — a sample-complexity bound must use information at a calibrated operating point (or
  hold-out recovery), not the inflated empirical Hessian.
- **Misspecification** is the worst case for *safety*: a non-ratio **additive** aggregation
  (or a strongly **concave-time** one) makes an *unbiased* participant's choices genuinely
  differ from the ratio oracle, so the diagnosis coaches them as biased up to ~88% of the
  time — a false positive the abstention gate cannot catch because the apparent leak is real
  relative to the deployed reward.

**Identifiability is V-relative (the ICML gate, `stress-chi-identifiability.mjs` Parts 3–5).**
Pressing the misspecification further (the spanning estimator + abstention evaluated under
each wrong `V`, then a boundary sweep, then a V-robust prototype) gives an honest, sharply
bounded result:

- **The SIGN of a genuine payout leak survives.** A planted W3 over-weighter's earnings-bias
  sign is recovered ≥98% by the spanning read even at a strong concave-time misspecification
  (rho 0.4). So "this person over-weights pay" is robust to a wrong `V`.
- **But false coaching of an UNBIASED participant explodes with the misspecification
  magnitude.** Spanning FP@none climbs ~48% (correct `V`) → ~78% (rho 0.8) → ~97% (rho 0.4);
  additive ~98%. The reason is a **confound**: under-penalising time (concave `V`) and
  over-weighting earnings BOTH manifest as "prefers the high-pay slow bundle," and the trap
  menus — which decouple earnings from each *cost axis* — do **not** decouple earnings from
  the *time-curvature* of `V`. So an unbiased-under-concave-`V` participant is observationally
  a payout-overweighter.
- **A V-robust read cannot escape the confound.** Re-estimating the earnings bias against a
  family of monotone `V` and abstaining on a sign-flip: a **wide** family cuts FP@none
  (~85%→~9%) but also abstains genuine leaks (well-specified recovery ~79%→~13%); a **narrow**
  (plausible-only) family keeps recovery (~91%) but no longer discriminates (FP ~89–97%). No
  V-family read achieves both. The bias is identifiable only for **near-correct `V`**
  (specifically, near-correct time-curvature); separating it from value-curvature would need
  menus that vary earnings and time *independently of each other's curvature*, which the
  current traps do not. This bounds the ICML claim: counterfactual feedback identifies *which
  cost axis* is misweighted under the deployed reward, but the payout/value-curvature axis is
  identifiable only when the value model is approximately right.

The human pilot is the real test of whether people carry separable leaks at all.

## 3. The learning index as a proxy for v11's G_ik (P4)

The deployed coaching target is the argmax over coachable axes of

```
G_W = effectiveWeight_W * max(0, leak_W)^2
```

where `leak_W` is the signed bias `dir(beta_participant) - dir(beta_oracle)` on axis W.
This is a deployable proxy for v11's diagnostic-exposure index
`G_ik(n) = W_k (a_k - h_ik,0)^2 [phi_k(n)^2 - phi_k(n+1)^2]`:

- `max(0, leak_W)^2` stands in for the squared current gap `(a_k - h)^2` (only positive
  = under-weighting leaks are teachable);
- `effectiveWeight_W` stands in for `W_k` (importance) **times** the exposure-driven
  identifiability term `[phi(n)^2 - phi(n+1)^2]`. Originally this was a fixed prior
  (`DEFAULT_LEARNING_WEIGHTS`, which guessed picking > payout on identifiability). It is
  now **measured**: `effectiveWeight_W = importance_W * (phi_W / max phi)` where
  `phi_W` is the per-axis Fisher information from the fitted logit Hessian diagonal
  (`behavioralBias().identifiability`). So a payout leak that the traps now identify well
  competes fairly with picking, instead of being permanently discounted.

**Approximation gaps (documented, not hidden):**

- The squared *current* bias replaces the *expected reduction* `phi(n)^2 - phi(n+1)^2`;
  we do not forward-simulate the next block's exposure. The fixed/measured weight absorbs
  the identifiability part but not the one-step look-ahead.
- `importance_W` (`DEFAULT_IMPORTANCE = {W1:1, W2:0.4, W3:1}`) is a realized-loss prior,
  not estimated per participant.
- The bias is a unit-normalized direction difference, so a large swing on one axis can
  shrink another's apparent magnitude; the abstention gate is the guard against acting on
  a low-confidence read rather than a full posterior over `a_k`.

These are acceptable for a deployable diagnostic, but the mapping to the exact theorem
should be stated (here) and the constants finalized on pilot data, not the sandbox.
