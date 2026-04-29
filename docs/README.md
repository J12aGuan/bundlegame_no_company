# BundleGame Documentation

This directory is the documentation index for the current BundleGame codebase. Root-level reviewer artifacts live in [../ARTIFACTS.md](../ARTIFACTS.md) and [../DATA_SCHEMA.md](../DATA_SCHEMA.md).

## Start Here

- Project overview: [../README.md](../README.md)
- Reproducible artifacts: [../ARTIFACTS.md](../ARTIFACTS.md)
- Data schema and governance summary: [../DATA_SCHEMA.md](../DATA_SCHEMA.md)
- Local setup: [setup/QUICKSTART.md](setup/QUICKSTART.md)

## Current Docs

These files describe the live app and should stay aligned with the current codebase.

| Document | Purpose |
| --- | --- |
| [current/ARCHITECTURE.md](current/ARCHITECTURE.md) | Runtime structure, round flow, and timing model |
| [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) | Firestore source of truth, dataset shape, Cities matrix, and admin behavior |
| [current/EXPERIMENT_PROTOCOL.md](current/EXPERIMENT_PROTOCOL.md) | Canonical 50-round protocol, randomization, Qualtrics linkage, and claim gates |
| [current/ANALYTICS_AND_RL_EXPORTS.md](current/ANALYTICS_AND_RL_EXPORTS.md) | Admin analytics dashboard, modeled-time interpretation, and RL export contract |
| [current/MODELS.md](current/MODELS.md) | Recommendation resolver, model registry, baseline ladder, and offline-RL artifact rules |
| [current/REPRODUCIBILITY.md](current/REPRODUCIBILITY.md) | Clean build, CI, fixture reproduction, and snapshot discipline |
| [current/DATA_GOVERNANCE.md](current/DATA_GOVERNANCE.md) | Human-subjects data categories, anonymization, and sharing checklist |
| [current/FULL_PAPER_READY_STUDY_ROADMAP.md](current/FULL_PAPER_READY_STUDY_ROADMAP.md) | Step-by-step readiness path from pilot data to full study package |
| [current/PAPER_ANALYSIS_WORKFLOW.md](current/PAPER_ANALYSIS_WORKFLOW.md) | Analysis workflow notes; use [../ARTIFACTS.md](../ARTIFACTS.md) for exact regeneration commands |
| [experiment/EXPERIMENT_DESIGN.md](experiment/EXPERIMENT_DESIGN.md) | Human-readable experiment design summary aligned to the current protocol |

## Setup Docs

| Document | Purpose |
| --- | --- |
| [setup/QUICKSTART.md](setup/QUICKSTART.md) | Fast local setup |
| [setup/ENVIRONMENT.md](setup/ENVIRONMENT.md) | Environment variable detail |

## Archive

Archived material lives under [archive/README.md](archive/README.md). Treat anything there as historical reference unless a current doc links to it explicitly.

The old venue-positioning and early roadmap notes are archived under `archive/planning-2026-04/` because they are planning context, not live implementation documentation.

## Maintenance Rules

- Update the relevant file in `docs/current/` whenever runtime behavior changes.
- Prefer linking to an existing current doc instead of repeating the same explanation in multiple files.
- Keep links relative so they work both locally and on GitHub.
- If a document conflicts with the current code, update it immediately or move it under `docs/archive/` with an archival note.
