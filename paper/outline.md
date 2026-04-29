# BundleGame Paper Outlines

This planning pack separates a primary CHI-style human decision-support paper from a RecSys follow-on built around benchmark/resource value, off-policy evaluation, and model comparison. Claims are marked by evidence status so the draft does not overstate what the current repository supports.

## Core Contribution Statement

BundleGame is an interactive delivery-bundling study platform and reproducible analysis pipeline for studying how people make multi-order delivery decisions under time, route, and recommendation constraints. It contributes:

1. A controlled 50-round delivery-bundling task with route-aware legal action sets and oracle comparisons.
2. A human decision-quality measurement pipeline covering score ratio, regret, exact/near optimality, timing, completion, and survey-linked experience.
3. A recommendation-exposure and model-evaluation workflow that keeps human evidence, offline policy evaluation, and simulator/model artifacts separate.
4. A publication-safe export and artifact pipeline for regenerating paper tables, figures, and model appendices.

## Claim Status Legend

| Status | Meaning |
| --- | --- |
| Supported now | Can be supported by current benchmark/pilot exports if the snapshot passes the relevant QA gate. |
| Supported after new study | Requires a treatment-aware dataset with Phase B arm labels, timestamps, and survey linkage. |
| Appendix/model only | Belongs in model/resource appendix, not as a human causal claim. |
| Do not claim yet | Not supported until new data or model artifacts exist. |

## Primary CHI-Style Outline

Working framing: human decision support for delivery bundling, with emphasis on behavior, burden, trust, and transfer.

### 1. Introduction

Claim direction:

- Delivery bundling requires repeated tradeoffs among reward, route, effort, and time.
- Recommendation systems can support decisions, but human uptake and burden matter as much as raw optimization.
- BundleGame provides a controlled task and reproducible pipeline for measuring these decisions.

Evidence mapping:

| Evidence | Source | Status |
| --- | --- | --- |
| Task protocol and route-aware action space | `docs/current/EXPERIMENT_PROTOCOL.md`, `DATA_SCHEMA.md` | Supported now |
| Reproducible artifact pipeline | `ARTIFACTS.md`, `paper_artifacts/` | Supported now |
| Treatment effect of recommendations | `study_randomization.csv`, `human_policy_eval.csv` | Supported after new study |

### 2. System And Study Task

Include:

- 50-round A/B/C structure.
- Phase A baseline, Phase B recommendation exposure by arm, Phase C transfer/retention.
- Same-store legal bundle mask and route-aware candidate bundles.
- Outcome metrics: score ratio, regret, exact/near optimality, completion, timing.

Evidence mapping:

| Evidence | Source | Status |
| --- | --- | --- |
| Canonical protocol | `src/lib/researchStudy.js`, `docs/current/EXPERIMENT_PROTOCOL.md` | Supported now |
| Candidate bundle metadata | `optimal[].candidate_bundles[]`, `DATA_SCHEMA.md` | Supported now for generated datasets |
| Protocol validation | JS tests under `tests/js/` | Supported now |

### 3. Study Design And Data Collection

Include:

- Participant flow and consent.
- Arm assignment policy.
- Qualtrics linkage fields.
- Exclusion and QA gates.
- Data-governance boundary between raw and publication exports.

Evidence mapping:

| Evidence | Source | Status |
| --- | --- | --- |
| Survey linkage | `QualtricsResponses`, `participant_survey.csv` | Supported after survey sync |
| QA blockers | `dataset_snapshot.json` | Supported now |
| Consent/IRB/course approval | Study records outside repo | Must be completed before submission |

### 4. Human Decision Findings

Prioritize:

- Completion/drop-off across rounds.
- Phase A/B/C decision quality.
- Regret and score-ratio patterns.
- Exact and near optimality.
- Timing/burden patterns.
- Transfer from Phase B to Phase C.

Evidence mapping:

| Finding | Source | Figure/Table | Status |
| --- | --- | --- | --- |
| Participant completion/drop-off | `analysis_master.csv`, publication `participant_summary.csv` | `participant_completion_dropoff.svg` | Supported now |
| Phase A/B/C decision quality | `analysis_master.csv` | `phase_decision_quality.svg`, `phase_decision_quality.csv` | Supported now for descriptive claims |
| Timing/burden | `kpi_timing_*.csv`, `analysis_master.csv` | Timing table/appendix | Supported when timing rows pass QA |
| Transfer after recommendation phase | Phase C vs Phase A/B rows | Phase comparison figure | Supported after timestamped treatment-aware study |

### 5. Recommendation Adoption And Experience

Prioritize:

- Adoption by arm and recommendation quality.
- Survey trust/usefulness/workload by arm.
- Burden and completion-linked survey signals.
- Cases where recommendation labels are missing or incomplete.

Evidence mapping:

| Finding | Source | Figure/Table | Status |
| --- | --- | --- | --- |
| Recommendation adoption by arm/quality | `recommendation_exposure.csv`, `analysis_master.csv` | `recommendation_adoption.svg` | Supported after Phase B labels are complete |
| Trust/usefulness/workload | `participant_survey.csv`, `human_policy_eval.csv` | Survey table | Supported after survey rows are matched |
| Treatment effect | `study_randomization.csv`, `human_policy_eval.csv` | Arm comparison table | Supported after new study |

### 6. Discussion

Organize around:

- How people adapt to decision support.
- When recommendations help or become ignored.
- Burden and trust as design constraints.
- Transfer from supported to unsupported phases.
- Implications for delivery-work decision support.

Avoid:

- Claiming deployed-worker behavior without appropriate participant/sample context.
- Claiming recommendation-treatment effects from historical benchmark rows with missing recommendation labels.
- Treating simulator-only outcomes as human outcomes.

### 7. Limitations, Ethics, And Reproducibility

Use [limitations_ethics.md](limitations_ethics.md) as the source checklist.

### CHI Abstract Skeleton

BundleGame studies how people make repeated delivery-bundling decisions under route, time, and recommendation constraints. We present a controlled 50-round task, a route-aware oracle and legal action space, and a reproducible analysis pipeline linking gameplay, recommendation exposure, and survey responses. The paper focuses on human decision quality, completion, burden, trust, and transfer across unsupported and recommendation-supported phases. We report decomposed decision metrics rather than a single composite score and separate human evidence from model and simulator outputs.

## RecSys Follow-On Outline

Working framing: BundleGame as a benchmark/resource for interactive recommendation, logged human choices, OPE, and masked discrete-action policy comparison.

### 1. Introduction

Claim direction:

- Delivery bundling is a structured slate/action recommendation problem.
- BundleGame provides logged choices, legal action masks, oracle bundles, and route-aware candidate metadata.
- The resource supports behavior cloning, reward modeling, contextual bandits, offline-RL baselines, and OPE.

Evidence mapping:

| Evidence | Source | Status |
| --- | --- | --- |
| Legal action masks and candidate bundles | `policy_training.csv`, `optimal[].candidate_bundles[]` | Supported for generated datasets |
| Publication-safe benchmark tables | `publication_export` | Supported now |
| CQL/IQL trained artifacts | `offline_rl/` outputs | Appendix/model only until full training run |

### 2. Benchmark Dataset And Schema

Include:

- State/action/reward tuple design.
- Participant-level splits.
- Legal action masks.
- Recommendation exposure fields.
- Publication-safe export and non-shareable fields.

Evidence mapping:

| Evidence | Source | Status |
| --- | --- | --- |
| Export schema | `DATA_SCHEMA.md` | Supported now |
| Tuple validation | Python analytics tests, offline-RL schema validation | Supported now |
| Artifact manifest | `output_manifest.json`, `paper_manifest.json` | Supported now |

### 3. Baselines And Models

Prioritize:

- Historical human.
- Oracle optimal.
- Heuristic route-score baseline.
- Behavior cloning.
- Reward model.
- Contextual bandit.
- CQL/IQL offline-RL baselines with trained artifacts.

Evidence mapping:

| Model Family | Source | Status |
| --- | --- | --- |
| Historical/oracle/heuristic | `policy_comparison.csv` | Supported now |
| Linear behavior/reward/contextual baselines | `policy_comparison.csv`, `recommendation_workbench.csv` | Supported now as baselines |
| CQL/IQL | `offline_rl/` artifact directories | Appendix/model only until trained on frozen snapshot |

### 4. Off-Policy Evaluation

Include:

- IPS, SNIPS, doubly robust, direct method, FQE-style proxy where appropriate.
- Effective sample size and match rate.
- Confidence intervals.
- Caveats about propensity assumptions and sparse support.

Evidence mapping:

| Evidence | Source | Figure/Table | Status |
| --- | --- | --- | --- |
| OPE table | `ope_summary.csv`, model artifact `ope_summary.csv` | `ope_comparison.csv` | Supported now as model table |
| ESS and CI columns | `paper_artifacts/generate.py` | OPE appendix table | Supported now |

### 5. Ablations And Resource Discussion

Include:

- Simulator-only ablations, clearly labeled.
- Candidate-mask and route-aware metadata value.
- Dataset limitations and recommended future collection.

Evidence mapping:

| Evidence | Source | Status |
| --- | --- | --- |
| Ablation table | `sandbox_summary.csv`, model `evaluation_summary.json` | Appendix/model only |
| Model registry/snapshot manifest | `paper_manifest.json`, model configs | Supported now |

### RecSys Abstract Skeleton

BundleGame is a reproducible benchmark for route-aware delivery-bundling recommendation. It provides logged human choices, legal action masks, oracle candidate bundles, route-aware reward metadata, participant-level splits, publication-safe exports, and baseline/model artifact generation. We report benchmark tables for historical human behavior, heuristic and learned baselines, OPE estimators, and offline-RL artifacts while keeping simulator-only and human-evidence tables separate.

## Claim Boundary Table

| Potential Claim | Use In CHI | Use In RecSys | Current Status |
| --- | --- | --- | --- |
| BundleGame captures repeated human delivery-bundling decisions | Main claim | Dataset/task claim | Supported now |
| Participants improve or transfer learning across phases | Main claim if QA passes | Secondary | Requires clean timestamped rows |
| Recommendations causally improve human decisions | Only after new randomized study | Optional | Do not claim yet for historical data |
| Trust/usefulness/workload moderate adoption | Main human-experience claim | Secondary metadata claim | Requires matched survey rows |
| BundleGame supports masked discrete-action OPE | Methods/appendix | Main technical claim | Supported now |
| CQL/IQL outperform baselines | Not central | Main model claim if trained | Requires trained artifacts and frozen snapshot |
| Simulator ablations demonstrate real human effects | Do not claim | Do not claim | Unsupported; label simulation-only |
