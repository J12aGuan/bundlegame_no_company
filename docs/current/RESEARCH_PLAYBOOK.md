# Research Playbook

## Purpose

This playbook defines how to use BundleGame data for recommendation-algorithm research without overstating what the current dataset can support.

## Dual-Track Strategy

Use two datasets with different claims:

- `mainGame` is the benchmark-growth dataset.
- A future labeled recommendation experiment dataset is the causal recommendation dataset.

Treat the current `mainGame` benchmark as useful for descriptive behavior analysis, action-space recovery, contextual ranking baselines, simulator fitting, and offline benchmark comparisons. Do not use it alone to claim recommendation-treatment effects.

## Row Provenance

The analytics stack now supports two decision sources:

- `round_summary`
  - Timestamped live decision rows from user actions.
  - Preferred whenever present.
- `action_summary_reconstructed`
  - Recovered rows from `scenarioActionsDoc.actionsByScenarioId[*].orderSummary`.
  - Useful for older benchmark data.
  - Lacks true decision timestamps.

Exports expose:

- `decision_source`
- `decision_timestamp`
- `timestamp_available`
- `round_coverage_status`

## Paper Blockers

`dataset_snapshot.json` marks a snapshot as not paper-ready when any blocker is present:

- `missing_recommendation_labels`
- `completed_game_mismatch`
- `missing_timestamps`

Interpretation:

- `missing_recommendation_labels` means the dataset can still support benchmark and simulator work, but not recommendation-treatment claims.
- `completed_game_mismatch` means summary completion flags disagree with round coverage and should not be used as a headline metric.
- `missing_timestamps` means the dataset is unsuitable for timestamp-based temporal analyses.

## Recommended Modeling Order

Start with:

1. Behavior cloning / human-choice model
2. Direct reward model
3. Contextual bandit or slate ranker
4. Conservative offline RL (`CQL` or `IQL`) only after enough labeled experiment trajectories exist

Use `DQN` only in simulator experiments until the new recommendation dataset has:

- reliable phase/treatment labels
- substantially deeper trajectories
- legal-bundle masking
- off-policy evaluation already working

## Snapshot Discipline

Every paper run should freeze:

- dataset version
- feature version
- split manifest
- QA report
- exported analysis tables

Store or archive:

- `dataset_snapshot.json`
- `run_metadata.json`
- all CSV exports used in figures/tables

## Split Policy

Use participant-level stable splits from `dataset_snapshot.split_manifest`:

- `train`
- `validation`
- `test`

Never split the same participant across train and test.

## Evaluation Protocol

Descriptive analysis:

- round attrition
- bundle-size bias / over-bundling
- exact-optimal and near-optimal learning curves
- failure and regret trends

Recommendation evaluation:

- held-out reward / regret metrics
- top-k lift
- calibration
- `IPS`
- `SNIPS`
- `DR`
- `FQE` for offline-RL runs

Simulator evaluation:

- clearly label as simulation-only
- keep separate from human-evidence tables
- use seeded replay for reproducibility

## Human Evidence vs Simulation

Use human data for:

- descriptive behavior
- benchmark ranking comparisons
- off-policy evaluation

Use simulator outputs for:

- ablations
- hyperparameter search
- DQN prototyping
- stress testing policies before field deployment

Never merge simulator outcomes into the same evidence table as human decisions without explicit labeling.
