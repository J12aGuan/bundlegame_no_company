# Archived Planning Note: Venue And DRL Roadmap

This file is archived planning context from April 2026. It is not the live implementation guide. Use these current docs instead:

- ../../current/EXPERIMENT_PROTOCOL.md
- ../../current/MODELS.md
- [../../../ARTIFACTS.md](../../../ARTIFACTS.md)

## Positioning

Treat BundleGame as an HCI decision-support study, not a pure ML benchmark.

The current `mainGame` dataset supports:

- descriptive behavior analysis
- simulator fitting
- behavior cloning and reward-model baselines
- contextual bandit benchmarking

It does not yet support strong causal claims about recommendation treatments on humans unless the treatment-aware study protocol is active and the resulting dataset passes snapshot QA.

## Recommended Model Order

1. Heuristic and historical-human baselines
2. Behavior cloning
3. Direct reward model
4. Contextual bandit / slate ranker
5. Conservative offline RL (`CQL` primary, `IQL` ablation)
6. `Double DQN` only in simulator-only traces unless later online data volume justifies promotion

## Study Design

Recommended per-participant structure:

- Phase A: rounds 1-15, no recommendations
- Phase B: rounds 16-35, assisted play with randomized arm assignment
- Phase C: rounds 36-50, no recommendations for transfer measurement

The canonical protocol is `bundlegame_abc_50_round_v1` in `src/lib/researchStudy.js`. Runtime collection and analytics reject datasets or protocol rows that drift from that structure.

Recommended arms:

- `control`
- `contextual_bandit`
- `rl_cql`

The study protocol, participant-arm assignment, and post-task survey rows are now first-class exports through:

- `study_randomization.csv`
- `participant_survey.csv`
- `human_policy_eval.csv`

## Paper Package

For each paper snapshot, archive:

- `dataset_snapshot.json`
- `paper_manifest.json`
- `analysis_master.csv`
- `policy_training.csv`
- `study_randomization.csv`
- `participant_survey.csv`
- `human_policy_eval.csv`
- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`

## Review Readiness

Before submission, check:

- human-evidence tables and simulator-only tables are clearly separated
- participant splits are participant-level only
- recommendation actions are legal-action masked
- snapshot blockers are resolved for causal claims
- survey, protocol, and model-registry artifacts are frozen with the snapshot
