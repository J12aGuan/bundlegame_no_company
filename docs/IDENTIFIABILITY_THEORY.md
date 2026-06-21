# Feedback identifiability as observability and control

This note states the identifiability claim behind the dynamic counterfactual-feedback
study as a control-theoretic **observability and controllability** result, and grounds
each object in the deployed code. The thesis of the three-paper line is *feedback
identifiability*: scalar / outcome feedback cannot tell **which** attribute a participant
misweights, while per-attribute counterfactual feedback over a spanning menu set can. Here
that thesis becomes a theorem about a latent state and two observation channels, with a
sample-complexity bound from the Fisher information the diagnosis already computes.

Scope and honesty. The statements below hold in the **linear-logit choice model** the
diagnosis assumes (`src/lib/chiDiagnosis.js`). They are *design-adequacy* results about
the menus and the estimator on **planted** biases in simulation, not evidence about
people. Where the model is wrong (choice noise, a misspecified value function) the
recovery degrades; that degradation is measured in `scripts/stress-chi-identifiability.mjs`
(documented in `docs/MODEL_NOTES.md` §2). The human pilot is the only test of whether
people carry separable leaks at all.

## 1. The model and the latent state

Each round `n` presents a menu `M_n` of legal bundles. Bundle `x` has a standardized
feature vector `φ(x) ∈ R^K` over the `K = 5` columns the diagnosis reads
(`FEATURE_COLUMNS`): `earnings`, `effective_pick_time_seconds`,
`cross_city_travel_time_seconds`, `local_travel_time_seconds`,
`shared_item_savings_seconds`. The deployed reward (and the oracle) ranks bundles by
`score = earnings / time`; let `β* ∈ R^K` be the local weight vector of that reward in
feature space (earnings positive, costs negative).

A participant chooses by a conditional (McFadden) logit with weights `β = β* + a`:

    P(x | M_n) ∝ exp(β · φ(x)),     β = β* + a.

The vector `a ∈ R^K` is the **latent bias state**. Its components on the three coachable
axes are the study's weaknesses:

| state component | axis | weakness |
|---|---|---|
| `a` on `earnings` | W3 | payout overweighting |
| `a` on `effective_pick_time_seconds` | W1 | over-bundling / pick neglect |
| `a` on `cross_city_travel_time_seconds` | W2 | route / cross-city neglect |

The diagnosis estimates `a` by fitting `β` (participant) and `β*` (oracle) with the same
ridge logit and reading the direction difference `dir(β) − dir(β*)` per axis
(`behavioralBias` in `chiDiagnosis.js`). Diagnosing `a` is the act of **observing the
latent state**; feedback that changes `a` is the act of **controlling** it.

## 2. The two observation channels

A round yields different observations depending on the feedback channel.

**Counterfactual channel (per-attribute).** The feedback exposes, for the chosen bundle
versus each one-step alternative `x'`, the per-attribute marginal `Δφ = φ(x') − φ(x)` (each
coordinate separately). Stacked over a menu set, the rows are the marginal vectors
(`marginalVectorsForMenu`). The information the choices carry about `a` is the
conditional-logit Fisher information

    I = Σ_n Σ_x P(x | M_n) (φ(x) − φ̄_n)(φ(x) − φ̄_n)^T,   φ̄_n = Σ_x P(x|M_n) φ(x),

which is exactly the per-menu Hessian accumulated in `fitConditionalLogit`
(`chiDiagnosis.js`, the `H[i][j] += p[a]·X[a][i]·X[a][j] − meanX[i]·meanX[j]` term). Its
restriction to the coachable axes is the **observability Gramian** of this channel.

**Scalar / regret channel (outcome).** The feedback exposes only a single number per
round: the realized value gap (regret) `r_n = score(oracle) − score(x_n)`. To first order
`score(x) ≈ ∇score · φ(x)`, so the scalar observation of a marginal is the **projection of
`Δφ` onto the one reward direction** `∇score ∝ β*`:

    s_n = ⟨Δφ_n, β*⟩ / ‖β*‖.

The observation map is rank 1: it sees only the component of `a` along `β*` and is blind to
every direction orthogonal to it.

## 3. Proposition 1 (observability): scalar is blind, counterfactual sees

Let `G_C` be the Gramian of the counterfactual map and `G_S` that of the scalar map, both
restricted to the `d ≥ 2` coachable axes (`gramSpectrum` / `observabilityGramian` in
`src/lib/menuSpan.js`). The latent state `a` is **locally observable** on a subspace iff
the Gramian is positive definite there (`λ_min(G) > 0`).

1. **Scalar channel is unobservable.** `G_S` is a rank-1 projection onto a single direction,
   so `λ_min(G_S) = 0` over any `d ≥ 2` axes. An entire `(d−1)`-dimensional subspace of
   biases produces identical regret sequences: outcome feedback cannot identify which axis
   is misweighted. (`observabilityGramian(traps, { projectOnto: reward }) → rank 1`.)

2. **Counterfactual channel is observable under the menu-span condition.** `G_C` is full
   rank, `λ_min(G_C) > 0`, **iff** the menus' marginal vectors span the coachable axes:
   the payout traps are constructed so earnings is decoupled from each cost axis (H is made
   suboptimal via a *rotating* slow axis, `TRAP_PAY_AXES`), giving `rank 2` on every
   `earnings × {pick, local, cross}` pair and `rank 4` over `{earnings, pick, local,
   cross}`. (`scripts/check-menu-span.mjs`; `tests/js/chi-observability.test.mjs`.)

This is the menu-span theorem restated: spanning menus are exactly the observability
condition for the bias state, and per-attribute feedback is exactly the observation that
realizes it.

**Empirical face (it is not academic).** Tune a pick-neglecter (W1) and a
payout-overweighter (W3) to the *same* mean regret. Outcome feedback then cannot separate
them (separability `d' ≈ 0.15`, a coin flip), while the counterfactual read on the spanning
subspace classifies them at ~84%. (`scripts/demo-observability.mjs`, block 2.) Same regret,
opposite bias: the scalar channel's null space is real.

## 4. Proposition 2 (controllability): the dual

Feedback is the control input that updates `a`. Per-attribute counterfactual feedback can
target any single axis (it shows the true one-step move on that attribute), so the control
matrix is full rank on the observable subspace and the state is **reachable component-wise**:
feedback can drive the coached axis's bias to zero. Scalar feedback can only push the
aggregate value direction `β*`, so it can lower realized regret **without** zeroing (or even
revealing) the specific bias.

Observability is therefore **necessary for verifiable correction**: on the scalar channel a
participant can reach low regret while an uncorrected axis bias persists, masked by
compensating behavior, and the learner cannot tell. The empirical drive-to-zero of a coached
axis (and the re-targeting once it is fixed) is in `scripts/simulate-chi-dynamic.mjs`.

## 5. Sample-complexity bound

On the observable (spanning) subspace, estimating `a` to accuracy `ε` with confidence
`1 − δ` from `n` rounds requires

    n  ≳  C · (1 / λ_min(Ī)) · (1 / ε²) · log(d / δ),

where `Ī = I / n` is the per-round (operating-point) Fisher information and `λ_min(Ī)` is the
observability margin from §3. This is the standard M-estimator / Cramér-Rao rate
(`Var(â) ≥ [I^{-1}]`), specialized to the logit Hessian the code already forms. Two
empirical checks (`scripts/demo-observability.mjs`, block 3):

- the standard error of the recovered payout bias decays at the `1/√n` Fisher rate
  (`stderr · √n` is flat across `n = 11 … 88` trap rounds);
- `λ_min(Ī)` on the spanning subspace is the finite constant the bound needs; on the scalar
  channel it is zero, so the bound is vacuous (no `n` suffices), recovering Proposition 1.

**Caveat for the constant (from the stress test).** The *empirical* per-axis Fisher info
(the Hessian diagonal) **rises** as choice noise increases, because the Hessian inflates as
the fitted weights shrink and the choice probabilities flatten toward uniform. So the raw
empirical Hessian is **non-monotone** with recoverability and must not be used directly as
`λ_min` in the bound; use the information at a calibrated operating point, or a held-out
recovery estimate. (`scripts/stress-chi-identifiability.mjs`.)

## 6. Corollary (the picking re-confound): observability is an estimator question, not a menu question

A participant who over-takes the high-pay bundle on a **picking-stress** (non-trap) menu
*also* over-bundles, so on those menus the earnings bias is collinear with the pick bias.
Pooling such menus into the diagnosis re-confounds W3 with W1. The stress test makes the
size of this precise: under correct V and clean choices, the deployed direction-difference
estimator recovers a planted W3 only ~40% on the uniform pool but ~90% on the spanning
(trap) subspace (`scripts/stress-chi-identifiability.mjs`, Part 2).

Crucially this is **not** an information loss. The per-menu Cramér-Rao earnings variance is
the *same* on the pooled and the spanning set (`demo-observability.mjs`, block 3): pooling
does not reduce the Fisher information about earnings. The confound is **estimator bias**:
the deployed `dir(β) − dir(β*)` heuristic is pulled by the non-trap menus even though the
information to separate the axes is present. The fix the theory prescribes is therefore an
**estimator**, not more menus: read the latent state on the observable (spanning) subspace,
or weight each menu's evidence by its per-axis information. The runtime's recency weighting
(`CHI_REDIAGNOSIS`, half-life 3) and abstention gate are crude versions of this; a
principled information-weighted read is the cleanest closure.

## 7. What is proved, and what the pilot must still show

- **Proved (in the linear-logit model):** scalar feedback cannot observe the bias axis
  (rank-1 null space); counterfactual feedback over the spanning menus can (full-rank
  Gramian); the dual gives per-axis controllability; the estimation rate is `1/√n` with the
  Fisher constant; the picking-confound is estimator bias, not information loss.
- **Assumed:** the participant is a (near-)logit chooser whose value is `earnings / time`.
  The stress test quantifies how observability degrades when those assumptions break
  (measurement noise, a misspecified additive / curved value function); additive value in
  particular makes an unbiased participant look biased, a failure the abstention gate does
  not catch.
- **Not addressed here:** whether real people carry stable, separable per-attribute leaks at
  all. That is the marginal-arm pilot's job (`docs/PREREGISTRATION_DYNAMIC.md`), and it is
  the only thing that turns this theorem about a simulated learner into a claim about humans.

## Reproduce

    node scripts/demo-observability.mjs          # the three claims, numerically
    node scripts/check-menu-span.mjs             # the span / observability condition
    node scripts/stress-chi-identifiability.mjs  # where observability degrades (noise + misspec V)
    node --test tests/js/chi-observability.test.mjs tests/js/chi-menu-span.test.mjs

## Code map

| object in the theory | code |
|---|---|
| feature map `φ`, latent state `a` | `FEATURE_COLUMNS`, `behavioralBias` (`chiDiagnosis.js`) |
| Fisher information `I` | the Hessian in `fitConditionalLogit` (`chiDiagnosis.js`) |
| observability Gramian, `λ_min`, rank | `gramSpectrum`, `observabilityGramian` (`menuSpan.js`) |
| menu-span / observability condition | `spanDiagnostics`, `scripts/check-menu-span.mjs` |
| counterfactual vs scalar channel, sample complexity | `scripts/demo-observability.mjs` |
| degradation under noise + misspecified V | `scripts/stress-chi-identifiability.mjs` |
| controllability (drive-to-zero, re-target) | `scripts/simulate-chi-dynamic.mjs` |
