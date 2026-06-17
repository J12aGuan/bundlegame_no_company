# Pre-Registration — BundleGame: Diagnosis-Matched Scaffolding and Durable Transfer

**Status:** draft pre-registration for the CHI confirmatory study. Build/validation
only; no data collected yet. The pilot referenced below is the verified unaided
dataset exported under `publishing/export_for_analysis/`.

## 1. Background and motivation
Gig delivery workers systematically **under-weight time costs** when bundling
orders. In our unaided pilot (N≈86 workers with decision rows), revealed-preference
conditional-logit weight-gaps vs. the oracle were largest on **pick time** and
**cross-city travel**; the dominant realized error was **over-bundling** (~21%
time inflation over optimal, ~77% of it excess pick time), and in ~54% of rounds
the chosen bundle out-earned the optimal one (payout-chasing). We target three
diagnosable weaknesses:

- **W1 — over-bundling / pick-time neglect**
- **W2 — route-dispersion / cross-city neglect**
- **W3 — payout-overweighting**

We test whether an explanation whose **form is matched to the worker's diagnosed
weakness** — while the **recommended bundle is held fixed** — produces **durable,
unaided re-weighting** on a shifted, harder transfer phase. Framing:
**remediation (teach the rule) vs. accommodation (adjust the recommendation).**

## 2. Design
- **Task:** BundleGame, 30 rounds (configurable), three phases:
  **A 1–10 unaided** (diagnosis), **B 11–20 scaffolded** (treatment),
  **C 21–30 unaided shifted transfer** (primary outcome window).
- **Phase C is a labeled distribution shift** (novel store/city combinations,
  longer cross-city routes, heavier pick loads; `shift_flag=1`). Phase-C order
  ids are disjoint from A/B, so "repeat the last AI bundle" cannot transfer —
  only genuine re-weighting does.
- **Menus** span the 2×2 of `store_overlap_flag × dispersion_flag` in A and B
  (≥2 menus per cell), with calibrated `score_gap` and a unique computable
  oracle (`src/lib/chiScenarioDesign.js`, validated by
  `tests/js/scenario-design.test.mjs`).
- **Arms (4, between-subjects):** `no_ai`, `generic`, `matched`, `mismatched`.
  Assignment is participant-level, stable, recorded before gameplay
  (`assignScaffoldArm`). **The recommended bundle is identical across
  `generic`/`matched`/`mismatched`** for any given round (one fixed policy,
  `oracle_optimal`); only the explanation FORM differs (`src/lib/scaffolding.js`).
  - `generic`: recommended bundle + generic rationale.
  - `matched`: contrastive/counterfactual explanation targeting the worker's
    **diagnosed** neglected attribute.
  - `mismatched`: the **same** contrastive style targeting a deterministically
    chosen **non-diagnosed** attribute (the critical control isolating *targeting*
    from *mere explanation*).
- **Diagnosis** is computed from each worker's Phase-A choices **before Phase B**
  (`analytics/diagnosis.py::diagnose_worker`) and fed into slate resolution for
  `matched`/`mismatched`.

## 3. Hypotheses
| ID | Hypothesis | Direction |
|---|---|---|
| **H1** | `matched` < `generic` on **Phase-C unaided regret** | matched lower |
| **H2** | `matched` < `mismatched` on Phase-C unaided regret | matched lower |
| **H3** | Under `matched`, the **diagnosed** attribute's weight-gap shrinks (Phase A→C) **more** than non-diagnosed attributes and more than under other arms (mechanistic transfer) | larger shrinkage |
| **H4** | **Dose-response:** the `matched` benefit increases with diagnosed **bias strength** (bias×arm interaction) | negative interaction on regret |
| **H5** | **Deskilling check:** `generic` is **not better than** `no_ai` on Phase-C transfer (and not significantly worse) | generic ≈ no_ai |

## 4. Outcomes
- **Primary:** mean **Phase-C regret-to-best** (`1 − chosen_score/oracle_score`)
  per worker, restricted to **successful, unaided** Phase-C rounds. Primary
  contrasts: **H1** and **H2**.
- **Secondary:** H3 (per-attribute weight-gap correction), H4 (dose-response),
  H5 (deskilling), exact-optimal rate, over-bundling rate, cross-city excess time,
  Phase-C failure rate, decision latency.

## 5. Statistical analysis plan
Implemented end-to-end against synthetic-shaped fixtures in
`publishing/analysis/confirmatory_plan.py` (run before real data exists).

- **H1, H2:** mixed-effects model `regret_C ~ arm + diagnosed_bias_strength +
  (1 | worker)`; pre-planned contrasts matched−generic and matched−mismatched,
  one-sided at α=.05, Holm-corrected across the two primary contrasts. (The
  fixture stub uses participant-mean Welch t-tests as a dependency-light stand-in.)
- **H3:** for each worker compute Δgap = gap_PhaseA − gap_PhaseC on the diagnosed
  attribute vs. a non-diagnosed attribute; test arm × attribute interaction
  (matched shows larger diagnosed-attribute correction).
- **H4:** `regret_C ~ diagnosed_bias_strength * I(arm=matched)`; the interaction
  coefficient tests dose-response (expected negative).
- **H5:** equivalence/non-inferiority of `generic` vs `no_ai` on Phase-C regret
  (TOST, margin = 0.33×pilot SD); flag if generic is significantly worse.
- **Multiplicity:** two primary contrasts Holm-corrected; secondary tests
  reported with BH-FDR. **Covariates:** diagnosed weakness, bias strength,
  Phase-A baseline regret.

## 6. Sample size / power
`publishing/analysis/power_analysis.py` (uses pilot regret variability). With a Phase-C
within-subjects design (10 rounds, ICC≈0.5) and an assumed matched-vs-mismatched
effect of 30% of pilot mean regret (d≈0.32): **~155/arm** powers H2 at .80; the
**bias×arm interaction (H4) is the binding constraint at ~620/arm**. Registered
target: re-run with the realized pilot effect size; recruit per-arm N at the larger
of the two, padded for ~15% attrition/exclusions. Report the exact recommended N
from the script output at submission time.

## 7. Exclusion criteria (pre-specified)
- Workers with **< 5 valid Phase-A rounds** (diagnosis unreliable) → excluded from
  matched/mismatched analyses; reported separately.
- Workers who **do not reach Phase C** (no transfer measurement).
- Rounds with **non-computable oracle/score** or chosen orders not in the menu.
- Attention/manipulation-check failures (to be defined in the IRB protocol).
- **Phase-C only** rounds enter the primary outcome; Phase-A/B used for diagnosis,
  treatment delivery, and covariates.

## 8. Instrumentation / data quality gate
A snapshot is labeled **treatment-aware** only if `evaluate_treatment_aware_gate`
(`analytics/qa/treatment_gate.py`) passes: arms + `scaffold_type` populated,
decision timestamps present (fixes pilot missing-timestamps), binary `success`
present on every round (fixes pilot success-censoring), and ≥1 Phase-B treated
round actually showed a recommendation. The pilot is **baseline/unaided-only**
and is **not** treatment-aware by this gate.

## 9. Ethics / IRB
- The **`mismatched`** arm intentionally targets a non-diagnosed attribute. It is
  **not deceptive about the recommended bundle** (the bundle is the fixed strong
  policy, identical to other treated arms); only the explanation's emphasis is
  off-target. Risk is minimal (no worse than a generic explanation), but it
  requires an **IRB amendment** describing the arm and a **debrief** explaining
  that all participants received a strong recommendation and that explanation
  emphasis varied for scientific control.
- No PII is analyzed; participant ids are pseudonymized in all exports. No payment
  is contingent on choosing the recommended bundle.

## 10. Reproducibility artifacts
- Diagnosis: `publishing/data_analysis/analytics_v1/analytics/diagnosis.py` (+ tests).
- Scaffolding: `src/lib/scaffolding.js`; arms/protocol: `src/lib/researchStudy.js`
  (`buildChiStudyProtocol`, `validateChiStudyProtocol`).
- Scenario design: `src/lib/chiScenarioDesign.js` (+ `tests/js/scenario-design.test.mjs`).
- Power: `publishing/analysis/power_analysis.py`; confirmatory plan: `publishing/analysis/confirmatory_plan.py`.
- Gate: `analytics/qa/treatment_gate.py`. Decisions/assumptions: `DESIGN_NOTES.md`.

*Any deviation from this plan will be reported with justification in the paper.*
