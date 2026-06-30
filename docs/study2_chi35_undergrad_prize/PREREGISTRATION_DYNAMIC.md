# Pre-registration — BundleGame dynamic counterfactual-feedback study

**Status:** DRAFT to be registered BEFORE the marginal pilot. Build/validation only; no
human data collected yet. This locks the diagnosis constants and the primary outcome in
advance so the recency/abstention choices cannot be read as fit after the fact. It
supersedes `docs/study1_pilot_working_paper/PREREGISTRATION.md` (the older 30-round scaffolding design) for the
35-round dynamic study. The constants below are **simulation-calibrated** (design
adequacy on planted biases); the pilot CONFIRMS or RE-FITS them per §6.

## 1. Hypotheses
- **H1 (counterfactual teaches; primary).** Per-decision marginal-value-violation rate on
  the **unaided shifted transfer block (B4, rounds 31–35)** is lower for `marginal` than
  `control`, and lower than `oracle` (teaching beats answer-giving / deskilling).
- **H2 (counterfactual ≥ scalar).** `marginal` ≤ `aggregate` on the transfer block
  (per-attribute counterfactual beats a scalar rate).
- **H3 (personalization).** The initial diagnosis recovers the planted/observed dominant
  weakness; participants with different leaks get different coached targets.
- **H4 (dynamic re-targeting; secondary, exploratory).** For two-weakness participants,
  the re-diagnosis after the first ON block MOVES OFF the coached weakness — either a
  confident W1→W3 flip or a principled abstention — and never misdiagnoses a single-axis
  cost neglecter as payout.

## 2. Design (fixed)
- 35 rounds: **Phase A 1–15** unaided diagnostic battery; **B1 16–20 ON** (feedback);
  **B2 21–25 OFF** same-distribution retention (re-tune); **B3 26–30 ON** (re-targeted);
  **B4 31–35 OFF** shifted transfer (PRIMARY outcome window). Order fixed; Phase A order
  randomized per participant. Menus from `buildChiScenarioSet` (`scenarioSetVersionId =
  chi_dynamic_v1`), validated by `validateChiScenarioSet`.
- Arms (between-subjects): `marginal`, `component`, `aggregate`, `oracle`, `control`. The
  pilot runs `marginal` only (it renders per-choice counterfactuals and does not depend on
  the diagnosis being correct); the full arm set is added after the go/no-go gate.
- Menus include heterogeneous **payout-trap** menus (max-earnings bundle ≠ optimal; H made
  slow via rotating cost axes) so payout-overweighting (W3) is identifiable independent of
  any single cost-axis neglect (numerically verified: `scripts/check-menu-span.mjs`,
  rank 4/4 over {earnings, pick, local, cross}).

## 3. Diagnosis — FIXED constants (pre-registered)
From `chiDiagnosis.js` / `chiStudyRuntime.js`:

| constant | value | meaning |
|---|---|---|
| ridge | 1.0 | conditional-logit L2 |
| initial prior weight | 0.5 | survey fusion weight at the r15 read |
| retune prior weight | 0.20 | survey weight at r25/r35 (stale survey down-weighted) |
| recency half-life | 3 rounds | re-diagnosis weights recent unaided rounds |
| importance | W1 1.0, W2 0.4, W3 1.0 | realized-loss prior in the learning index |
| learning weight | importance × measured identifiability | per-axis exposure-driven weight |
| abstain noise floor | 0.20 | min fused leak worth coaching |
| abstain dominance margin | 1.5 | uncoachable dominant must exceed best coachable by this to abstain |
| coachable axes | {W1, W3} | W2 (cross) reported but never coached |

Initial diagnosis: uniform over Phase A + full survey. Re-diagnoses: recency-weighted +
down-weighted survey + identifiability-weighted index + abstention. These are FIXED for
the confirmatory study; §6 governs any pilot re-fit.

## 4. Primary outcome + analysis
- **Primary:** per-decision marginal-value-violation rate (a sub-optimal one-step move
  exists) on B4 (rounds 31–35), unaided. Compare `marginal` vs `control` (H1), `marginal`
  vs `oracle` (H1), `marginal` vs `aggregate` (H2). Mixed-effects logistic regression with
  a participant random intercept; arm as fixed effect; pre-registered contrasts above.
- **Secondary:** initial-diagnosis recovery rate (H3); re-targeting/abstention behavior of
  the re-diagnosis (H4, descriptive — fractions that flip W1→W3 vs abstain vs stay).
- **Exclusions:** incomplete sessions; participants with < the minimum unaided rounds for a
  diagnosis (`minRounds = 3`). Analysis on completed 35-round sessions.

## 5. Go/no-go pilot gate (marginal arm)
20–40 participants, marginal arm. Proceed to the full study iff: the feedback string
renders correctly per choice; the initial diagnosis is sensible (recovers a leak on the
unaided battery); and there is any unaided-transfer improvement signal. This gate does NOT
test the dynamic re-targeting (that needs the control/oracle arms).

## 6. What the pilot FINALIZES (the real gap)
Everything above is sim-calibrated. The pilot is the first measurement of:
- the real distribution of W1/W3 and whether humans carry **separable** leaks at all;
- whether the recency half-life (3) and retune prior (0.20) hold on real noise, or need a
  one-time re-fit. **Any re-fit happens once, on the pilot, and is reported**; the
  confirmatory study then freezes them. The sensitivity sweep
  (`scripts/sweep-chi-rediagnosis.mjs`) shows the qualitative result (move-off-W1 with
  conservative abstention) holds across a contiguous region of these constants, so the
  claim does not hinge on one hand-tuned cell.

## 7. Honesty / scope
The sandboxes and span check are **design-adequacy** results on planted biases: they show
the menus + diagnosis CAN separate W1 from W3 (and from single-axis cost neglect) in
simulation, and that the system re-targets-or-abstains rather than misfires. They are NOT
evidence the intervention changes human behavior — that is exactly what this study tests.
The identifiability-theorem framing (ICML) additionally requires the noise / misspecified-V
stress tests noted in `docs/study2_chi35_undergrad_prize/MODEL_NOTES.md §2` before it is committed.
