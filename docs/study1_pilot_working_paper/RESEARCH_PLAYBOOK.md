# Research Playbook

## Purpose

This playbook defines how to use BundleGame data for recommendation-algorithm research without overstating what the current dataset can support.

Use [EXPERIMENT_PROTOCOL.md](EXPERIMENT_PROTOCOL.md) for the canonical protocol, [MODELS.md](../shared/MODELS.md) for model maturity rules, [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md) for table schemas, and [../../ARTIFACTS.md](../../ARTIFACTS.md) for exact artifact regeneration commands.

## Dual-Track Strategy

Use two datasets with different claims:

- `mainGame` is the benchmark-growth dataset.
- A future labeled recommendation experiment dataset is the causal recommendation dataset.

Treat the current `mainGame` benchmark as useful for descriptive behavior analysis, action-space recovery, contextual ranking baselines, simulator fitting, and offline benchmark comparisons. Do not use it alone to claim recommendation-treatment effects.

## Canonical Protocol

The intended study protocol is versioned in `src/lib/researchStudy.js` as `bundlegame_abc_50_round_v1`.

Runtime, Firestore saves, analytics exports, and documentation should all use that same structure:

- Phase A: rounds 1-15, no recommendations
- Phase B: rounds 16-35, recommendation exposure is allowed by arm
- Phase C: rounds 36-50, no recommendations
- Arms: `control`, `contextual_bandit`, `rl_cql`
- Legal-action mask: `legal_bundle_mask_v1`

Snapshots with different phase lengths, missing rounds, duplicate rounds, or recommendation flags outside the recommendation phase are rejected by the validation layer before runtime collection or analysis.

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

1. Historical human and heuristic route-score baselines
2. Behaviour cloning / human-choice baseline
3. Direct reward-model baseline
4. Contextual bandit or slate ranker baseline
5. Conservative offline RL (`CQL` or `IQL`) only after enough labeled experiment trajectories exist and a trained artifact is registered

Current admin exports use analysis-time linear baselines for behaviour cloning, reward modelling, contextual ranking, and OPE proxies. They are useful benchmark rows, but they are not trained DRL policies. `CQL` and `IQL` should remain `planned` / `not_implemented` until the training job writes model provenance, dataset snapshot id, metrics, and artifact URIs.

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
- study protocol draft
- model registry snapshot

Store or archive:

- `dataset_snapshot.json`
- `paper_manifest.json`
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
- FQE-style estimates only for trained offline-RL runs; current admin `fqe_one_step` is a linear proxy

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
- simulator-only prototyping
- stress testing policies before field deployment

Never merge simulator outcomes into the same evidence table as human decisions without explicit labeling.

## Study Workflow Outputs

For treatment-aware studies and paper packages, also archive:

- `study_randomization.csv`
- `participant_survey.csv`
- `human_policy_eval.csv`

These are now generated by both the admin research console and the offline analytics pipeline.
