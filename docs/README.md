# Bundle Game Documentation

This directory is the documentation index for the project. Use it to find the current technical docs, setup guides, and legacy references without duplicating the README.

## Start Here

- Project overview and recent feature history: [../README.md](../README.md)
- Local setup: [setup/QUICKSTART.md](setup/QUICKSTART.md)
- Runtime architecture: [current/ARCHITECTURE.md](current/ARCHITECTURE.md)
- Firestore config, datasets, and timing rules: [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md)

## Current Docs

These files describe the live app and should stay aligned with the current codebase.

| Document | Purpose |
| --- | --- |
| [current/ARCHITECTURE.md](current/ARCHITECTURE.md) | Runtime structure, round flow, and timing model |
| [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) | Firestore source of truth, dataset shape, Cities matrix, and admin behavior |
| [current/ANALYTICS_AND_RL_EXPORTS.md](current/ANALYTICS_AND_RL_EXPORTS.md) | Admin analytics dashboard, modeled-time interpretation, and RL export contract |
| [experiment/EXPERIMENT_DESIGN.md](experiment/EXPERIMENT_DESIGN.md) | Experiment structure and research context |

## Setup Docs

| Document | Purpose |
| --- | --- |
| [setup/QUICKSTART.md](setup/QUICKSTART.md) | Fast local setup |
| [setup/ENVIRONMENT.md](setup/ENVIRONMENT.md) | Environment variable detail |

## Archive

Archived material lives under [archive/README.md](archive/README.md). Treat anything there as historical reference unless a current doc links to it explicitly.

## Maintenance Rules

- Update the relevant file in `docs/current/` whenever runtime behavior changes.
- Update the README `Recent Feature History` table when a meaningful feature ships.
- Prefer linking to an existing current doc instead of repeating the same explanation in multiple files.
- Keep links relative so they work both locally and on GitHub.
