# BundleGame documentation

Documentation is organized by **study**. Each study maps to one INFORMS BEST submission. Cross-study
infrastructure lives in `shared/`, local setup in `setup/`, and superseded material in `archive/`.

Project overview: [../README.md](../README.md). Root reviewer artifacts: [../ARTIFACTS.md](../ARTIFACTS.md),
[../DATA_SCHEMA.md](../DATA_SCHEMA.md).

## Studies and papers

| Study | Folder | Paper |
| --- | --- | --- |
| Study 1 (Pilot): 50-round A/B/C recommendation on the `mainGame` task; the only study with real participant data. | [study1_pilot_working_paper/](study1_pilot_working_paper/README.md) | INFORMS Best Working Paper submission |
| Study 2 (CHI 35-round): dynamic counterfactual-feedback on the 35-round `buildChiScenarioSet` (seed 42) menus; diagnosis-driven. | [study2_chi35_undergrad_prize/](study2_chi35_undergrad_prize/README.md) | INFORMS Best Undergraduate Research Prize |

The repo carries three experiment configurations operationally (Study 2 spans the "enriched 4-order"
and "CHI personalization" lineage); the engineering map is [shared/EXPERIMENTS.md](shared/EXPERIMENTS.md).

## Study 1: pilot (working paper)

Folder: [study1_pilot_working_paper/](study1_pilot_working_paper/README.md)

| Document | Purpose |
| --- | --- |
| [EXPERIMENT_PROTOCOL.md](study1_pilot_working_paper/EXPERIMENT_PROTOCOL.md) | Canonical 50-round A/B/C protocol, randomization, Qualtrics linkage, claim gates |
| [EXPERIMENT_DESIGN.md](study1_pilot_working_paper/EXPERIMENT_DESIGN.md) | Human-readable design summary |
| [PREREGISTRATION.md](study1_pilot_working_paper/PREREGISTRATION.md) | Pilot pre-registration |
| [RESEARCH_PLAYBOOK.md](study1_pilot_working_paper/RESEARCH_PLAYBOOK.md) | How to use the data without overstating claims |
| [PAPER_ANALYSIS_WORKFLOW.md](study1_pilot_working_paper/PAPER_ANALYSIS_WORKFLOW.md) | Analysis workflow checklist |
| [FULL_PAPER_READY_STUDY_ROADMAP.md](study1_pilot_working_paper/FULL_PAPER_READY_STUDY_ROADMAP.md) | Readiness path from pilot data to full study package |

## Study 2: CHI 35-round (undergraduate research prize)

Folder: [study2_chi35_undergrad_prize/](study2_chi35_undergrad_prize/README.md)

| Document | Purpose |
| --- | --- |
| [PREREGISTRATION_DYNAMIC.md](study2_chi35_undergrad_prize/PREREGISTRATION_DYNAMIC.md) | Pre-registration for the dynamic counterfactual-feedback study |
| [MODEL_NOTES.md](study2_chi35_undergrad_prize/MODEL_NOTES.md) | The diagnosis model: scope, identifiability, learning-index approximation |
| [IDENTIFIABILITY_THEORY.md](study2_chi35_undergrad_prize/IDENTIFIABILITY_THEORY.md) | Formal identifiability statements behind the diagnosis |
| [LIVE_CHI_DYNAMIC_V2_VERIFICATION.md](study2_chi35_undergrad_prize/LIVE_CHI_DYNAMIC_V2_VERIFICATION.md) | Live deployment verification of the dynamic v2 protocol |

## Shared (cross-study infrastructure)

| Document | Purpose |
| --- | --- |
| [shared/EXPERIMENTS.md](shared/EXPERIMENTS.md) | Engineering map: the three experiment configurations and how they map to the two studies |
| [shared/ARCHITECTURE.md](shared/ARCHITECTURE.md) | Runtime structure, round flow, timing model |
| [shared/CODEMAP.md](shared/CODEMAP.md) | What each directory and module does |
| [shared/CONFIG_AND_DATASETS.md](shared/CONFIG_AND_DATASETS.md) | Firestore source of truth, dataset shape, Cities matrix, admin behavior |
| [shared/MODELS.md](shared/MODELS.md) | Recommendation resolver, model registry, baseline ladder, offline-RL artifact rules |
| [shared/ANALYTICS_AND_RL_EXPORTS.md](shared/ANALYTICS_AND_RL_EXPORTS.md) | Admin analytics dashboard, modeled-time interpretation, RL export contract |
| [shared/DATA_GOVERNANCE.md](shared/DATA_GOVERNANCE.md) | Human-subjects data categories, anonymization, sharing checklist |
| [shared/REPRODUCIBILITY.md](shared/REPRODUCIBILITY.md) | Clean build, CI, fixture reproduction, snapshot discipline |
| [shared/DEPLOY.md](shared/DEPLOY.md) | Deployment and seeding safety |
| [shared/EMULATOR_SMOKE.md](shared/EMULATOR_SMOKE.md) | Local Firestore emulator smoke-test |
| [shared/WIRING_TASKS.md](shared/WIRING_TASKS.md) | Engineering wiring tasks |
| [shared/DESIGN_NOTES.md](shared/DESIGN_NOTES.md) | Cross-study design decisions and assumptions |
| [shared/RELEASING.md](shared/RELEASING.md) | Release process |

## Setup

| Document | Purpose |
| --- | --- |
| [setup/QUICKSTART.md](setup/QUICKSTART.md) | Fast local setup |
| [setup/ENVIRONMENT.md](setup/ENVIRONMENT.md) | Environment variable detail |

## Archive

Historical material lives under [archive/README.md](archive/README.md). Treat anything there as
historical reference unless a current doc links to it explicitly.

## Maintenance rules

- Put study-specific docs in the matching study folder; put cross-study infrastructure in `shared/`.
- Update the relevant doc whenever runtime behavior changes; do not duplicate explanations across files.
- Keep links relative so they work both locally and on GitHub.
- If a document conflicts with the current code, update it or move it under `archive/` with a note.
