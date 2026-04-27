# CHI/CSCW DRL Roadmap

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

- Phase A: no recommendations
- Phase B: assisted play with randomized arm assignment
- Phase C: no recommendations for transfer measurement

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
