# CHI Main-Study Build — Design Notes & Status

> **SUPERSEDED (historical).** This documents the original 30-round A/B/C
> "diagnosis + tailored scaffolding" design with arms `no_ai/generic/matched/
> mismatched`. That design has been **dropped** in favor of the **dynamic
> counterfactual-feedback** study: a 35-round protocol (15 unaided + Phase B
> blocked ON/OFF/ON/OFF) with arms `marginal/component/oracle/aggregate/control`.
> The old `src/lib/scaffolding.js` and its test were removed; render-time feedback
> is now `src/lib/marginalFeedback.js` (`feedbackForArm`) and the diagnosis is
> `src/lib/chiDiagnosis.js`. See `BUILD_AND_STUDY_PLAN.md` and the live code
> (`researchStudy.js`, `chiScenarioDesign.js`) for the current design. Kept for
> history of the decisions below.

Decisions, assumptions, and per–Definition-of-Done status for the CHI
"diagnosis + tailored scaffolding + transfer" build. The repo code is the source
of truth; **no participant data was collected or fabricated** — only build +
unit tests, using the verified pilot export and clearly-labeled synthetic fixtures.

## Key decisions (made where the spec was ambiguous)
1. **30-round protocol as an additive variant, not an in-place edit.** The
   canonical `bundlegame_abc_50_round_v1` and its strict validators/tests are left
   intact. The CHI study is a new, *configurable* protocol
   (`bundlegame_chi_diagnose_30_round_v1`, default A10/B10/C10) with its own
   validator. Rationale: the existing 50-round dataset and protocol tests must keep
   passing; round counts are configurable per A4.
2. **Multi-store-per-city layout for the menus.** The pilot coupled overlap with
   dispersion because it had one store per city. CHI uses ≥2 stores per A/B city so
   `store_overlap_flag` and `dispersion_flag` vary independently → W1 and W2 are
   separately identifiable.
3. **Bias vector = unit-normalized direction gap (worker − oracle).** Independently
   fit worker/oracle conditional logits differ in overall scale (decisiveness);
   comparing *directions* isolates relative attribute emphasis (cost-blindness).
   Confidence = bootstrap stability of the dominant label.
4. **Bundle invariance enforced two ways:** (a) at the protocol level — all treated
   arms share one `fixed_recommendation_policy` (`oracle_optimal`), checked by
   `validateChiStudyProtocol`; (b) at render time — `buildScaffold` takes the fixed
   recommended bundle and never alters it; tests assert the recommended ids are
   identical across `generic/matched/mismatched`.
5. **Mismatched is deterministic:** non-diagnosed attribute chosen by a fixed
   preference order; gated to never equal the diagnosed attribute.
6. **Diagnosis gating / degradation:** if a `matched`/`mismatched` worker has no
   usable diagnosis (`none`), the render degrades to `generic` and logs
   `degraded_to_generic` — **without** changing the recommended bundle.
7. **scaffold_type == arm id** for the four arms, so randomization
   (`assignScaffoldArm`) and logging share one stable label.

## Status by Definition-of-Done item
| Item | What | Status | Where | Verified |
|---|---|---|---|---|
| A1 | Span 2×2 overlap×dispersion in A/B | **Done** | `src/lib/chiScenarioDesign.js` | `scenario-design.test.mjs` (≥2/cell) |
| A2 | Stress neglected axes + calibrated `score_gap` | **Done** | same | unique oracle + non-trivial gap asserted |
| A3 | Phase C = labeled shift (novel stores/longer routes/heavier pick) | **Done** | same | `shift_flag`, novelty, disjoint ids, harder cross-city asserted |
| A4 | Reach Phase C / configurable+validated round counts | **Done** | `buildChiStudyProtocol`, `buildChiScenarioSet` | 30 default + custom counts tested |
| A5 | Scenario-validation test | **Done** | `tests/js/scenario-design.test.mjs`, `validateChiScenarioSet` | runs under `node --test` |
| B6 | `diagnose_worker()` signed bias → W1/W2/W3 + confidence; persist | **Done** | `analytics/diagnosis.py` | recovery tests + run on pilot |
| B7 | Reliability on pilot (split-half) | **Done** | `split_half_reliability` | pilot κ=0.30, 65% agreement |
| C8 | `scaffold_type` + templated explanation renderer; fixed bundle; log all | **Done (module)** | `src/lib/scaffolding.js` | `scaffolding.test.mjs` |
| C9 | Tests: bundle invariant; matched targets diagnosed, mismatched doesn't | **Done** | `scaffolding.test.mjs` | `node --test` |
| D10 | Four between-subjects arms; pre-gameplay stable assignment; diagnosis→slate | **Done** | `researchStudy.js` (`BUNDLEGAME_CHI_SCAFFOLD_ARMS`, `assignScaffoldArm`) | `scaffolding.test.mjs` |
| E11 | Logging fields + snapshot gate blocking "treatment-aware" | **Done** | `analytics/qa/treatment_gate.py` (+ scaffold log record) | `test_treatment_gate.py` |
| F12 | Pre-registration | **Done** | `docs/PREREGISTRATION.md` | doc |
| F13 | Power analysis from pilot effect sizes | **Done** | `publishing/analysis/power_analysis.py` | runs on pilot export |
| F14 | Confirmatory H1–H5 on fixtures | **Done** | `publishing/analysis/confirmatory_plan.py` | 5/5 planted effects recovered |

## Partial / deferred (honest scope)
- **Runtime wiring into `src/routes/bundlegame.svelte`** (rendering the explanation
  and writing the per-round `scaffold_type` / explanation / diagnosis / reliance to
  Firestore) is **not** done. The scaffolding logic, arm assignment, protocol, and
  the QA gate that *enforces* those fields exist and are tested at the module level;
  hooking them into the Svelte gameplay loop + `resolveRecommendationSlate` call
  site is the next integration step. The data **schema/labels** the gate requires
  are specified in `PREREGISTRATION.md` §8 and `treatment_gate.py`.
- **Generator integration:** the menu redesign is a dedicated, self-contained module
  (`chiScenarioDesign.js`) rather than a retrofit of the 45 KB
  `generateScenarios.js`. It produces a complete validated 30-round set; persisting
  it into `MasterData/datasets` is a one-call follow-up.
- **Mixed-effects models:** `confirmatory_plan.py` uses participant-level
  contrasts/OLS as a dependency-light stand-in for the registered
  `lmer`-style models (statsmodels not installed here); the contrasts and outputs
  are identical in intent.

## Environment notes
- Python analytics/analysis modules are **run and verified** here (numpy/scipy/pandas).
- JS modules are pure ESM (no external imports), so `node --test` runs the new
  tests **without `npm ci`**. Node was installed during this session to execute them;
  if running elsewhere: `node --test tests/js/scaffolding.test.mjs tests/js/scenario-design.test.mjs`.
