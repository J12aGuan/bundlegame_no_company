# Paper Analysis Workflow

## Goal

Turn BundleGame gameplay into a reproducible research workflow for studying human decision-making and recommendation policies.

## Step 1. Freeze A Snapshot

From the admin research console or the offline CLI, generate:

- `analysis_master.csv`
- `policy_training.csv`
- `study_randomization.csv`
- `participant_survey.csv`
- `human_policy_eval.csv`
- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`
- `dataset_snapshot.json`
- `paper_manifest.json`
- `run_metadata.json`

Record the dataset root, dataset version, feature version, and snapshot id in the project notes for the paper.

## Step 2. Check QA Before Analysis

Review blockers in `dataset_snapshot.json`.

Recommended rule:

- If `paper_ready` is `false`, do not use the snapshot for causal recommendation claims.
- If `benchmark_only_dataset` is `true`, restrict claims to descriptive analysis, ranking baselines, and simulator/offline benchmark results.

## Step 3. Build Descriptive Behavior Results

Use `analysis_master.csv` for:

- participant-level learning curves
- optimality and regret by round
- phase A/B/C comparisons
- bundle-size bias and over-bundling
- timing decomposition by phase and classification
- trajectory segmentation

Suggested figures:

- round attrition plot
- exact-optimal rate by round
- mean regret by phase
- chosen bundle size histogram
- trajectory segment counts

For treatment-aware runs, also build:

- arm-level score-ratio and regret plots from `human_policy_eval.csv`
- survey summaries for trust, usefulness, and workload from `participant_survey.csv`

## Step 4. Build Recommendation Baselines

Use:

- `recommendation_workbench.csv`
- `recommendation_summary.csv`
- `policy_comparison.csv`

Recommended table:

- historical human
- behavior clone
- reward model
- contextual bandit
- oracle optimal

Report:

- expected reward
- regret
- optimal-rate
- lift versus historical human choices

## Step 5. Run Off-Policy Evaluation

Use `ope_summary.csv`.

Core metrics:

- `IPS`
- `SNIPS`
- `DR`
- `FQE`

Recommended framing:

- `IPS` and `SNIPS` for propensity-weighted evidence
- `DR` as the main robust estimator
- `FQE` for offline-RL comparison tables

## Step 6. Keep Simulator Results Separate

Use `sandbox_summary.csv` only for:

- stress testing
- ablations
- simulator-only policy comparisons
- DQN prototype reporting

Label every simulator plot or table with `Simulation Only`.

## Step 7. Write Threats To Validity

Address:

- benchmark-only rows reconstructed from action summaries
- missing recommendation-treatment labels in older datasets
- unreliable `completedGame` summaries
- small live timestamped sample sizes
- off-policy evaluation variance
- simulator misspecification risk

## Step 8. Prepare Figure/Table Checklist

Include:

- round attrition
- optimal-rate curve
- regret by phase
- bundle-size bias / over-bundling
- policy lift/regret table
- off-policy evaluation table
- simulator ablation table

## Step 9. Archive Reproducibility Artifacts

For every paper draft or experiment milestone, archive:

- the frozen snapshot files
- code commit hash
- training configs
- model outputs
- figure-generation notebooks or scripts

This makes later revisions and reviewer questions much easier to handle.
