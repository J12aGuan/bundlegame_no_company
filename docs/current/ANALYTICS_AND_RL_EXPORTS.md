# Analytics and RL Exports

## Scope

The project now has two admin-facing analytics surfaces:

- `/admin/analysis` for general analytics and uploads
- `/admin/research` for dark technical research workflows, snapshot QA, policy comparison, OPE, sandbox summaries, and job orchestration

The shared logic lives in:

- `src/lib/analysis/engine.js`
- `data analysis/analytics_v1`

Companion runtime utilities:

- `scripts/research-data-summary.mjs`
- `scripts/research-worker.mjs`

## Supported Data Sources

- live Firestore participant data
- uploaded structured participant JSON
- optional scenario bundle JSON
- optional stores/cities JSON
- optional participant metadata CSV or JSON

Metadata joins use `participant_id` first. Session-key fallback is only used when explicitly configured.

## Canonical Research Exports

Primary exports:

- `analysis_master.csv`
- `analysis_master.json`
- `policy_training.csv`
- `study_randomization.csv`
- `participant_survey.csv`
- `human_policy_eval.csv`
- `dataset_snapshot.json`
- `paper_manifest.json`
- `run_metadata.json`

Recommendation and evaluation exports:

- `recommendation_workbench.csv`
- `recommendation_summary.csv`
- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`

Monitoring and QA exports:

- `decision_fact.csv`
- `qa_issues.csv`
- `kpi_overall.csv`
- `kpi_by_round.csv`
- `kpi_by_participant.csv`
- `kpi_by_classification.csv`
- `kpi_by_scenario.csv`
- `kpi_timing_overall.csv`
- `kpi_timing_by_round.csv`
- `kpi_timing_by_classification.csv`
- `behavior_by_phase.csv`
- `behavior_by_recommendation_quality.csv`
- `behavior_by_trajectory_segment.csv`
- `participant_trajectories.csv`
- `trajectory_segments.csv`

## Provenance Fields

The research exports now include explicit row provenance:

- `decision_source`
- `decision_timestamp`
- `timestamp_available`
- `round_coverage_status`
- `qa_completed_game_mismatch`
- `qa_missing_recommendation_labels`
- `study_protocol_id`
- `policy_arm`
- `policy_name`
- `policy_version`
- `dataset_snapshot_id`
- `legal_action_mask_version`
- `recommendation_source`

Current supported decision sources:

- `round_summary`
- `action_summary_reconstructed`

## `analysis_master.csv`

One row per participant decision/round, intended as the paper-facing dataset.

Major field groups:

- participant and run identifiers
- scenario and phase context
- recommendation context and recommendation quality
- chosen bundle and oracle bundle data
- regret, score-ratio, optimality, and failure metrics
- measured timing buckets
- prior-round history features
- optional joined metadata

## `policy_training.csv`

One row per participant-round-candidate-bundle.

Field groups:

- state features
- action/bundle features
- observed chosen action
- reward target
- next-state summary
- terminal flag
- state provenance copied from the source decision row

## `dataset_snapshot.json`

Snapshot manifest for reproducible research runs.

Includes:

- dataset root and dataset version
- feature version
- participant-level split manifest
- QA blockers and warning counts
- row-source counts
- timestamped vs reconstructed row counts
- study protocol summary
- study-randomization, survey, and human-eval row counts

## Study And Paper Exports

`study_randomization.csv` captures participant-level study arm assignment, policy mapping, and assignment metadata.

`participant_survey.csv` captures trust, usefulness, workload, and free-text notes linked back to the participant and policy arm.

`human_policy_eval.csv` provides arm-level and phase-level human outcome summaries for paper tables.

`paper_manifest.json` packages the frozen snapshot, protocol summary, model registry, export list, and figure checklist into one reproducibility artifact.

## Policy Evaluation Outputs

`policy_comparison.csv` compares:

- `historical_human`
- `behavior_clone`
- `reward_model`
- `contextual_bandit`
- `oracle_optimal`

`ope_summary.csv` contains:

- `IPS`
- `SNIPS`
- `DR`
- `FQE` (one-step approximation in the current admin-facing stack)

`sandbox_summary.csv` contains simulation-only bootstrap summaries and should never be mixed into human-evidence tables without labeling.

## Research Job Runtime

Queued admin jobs now have a local worker path for Firestore-backed snapshots:

- `npm run research:worker`

The worker:

- reads `ResearchJobs` and `ResearchSnapshots`
- recomputes analysis from the referenced Firestore dataset
- writes artifact files under `data analysis/research_jobs/<job_id>/`
- updates job `metrics`, `artifact_uris`, and status

Uploaded snapshots are still exportable, but they are marked offline-only and are not runnable by the Firestore worker.

## Current Interpretation Rules

- If recommendation labels are missing, treat the dataset as benchmark-only.
- If `completedGame` mismatches round coverage, do not use that summary field as a paper metric.
- If timestamps are missing, do not use the dataset for timestamp-based causal or temporal claims.

See also:

- `docs/current/RESEARCH_PLAYBOOK.md`
- `docs/current/PAPER_ANALYSIS_WORKFLOW.md`
- `docs/current/CHI_CSCW_DRL_ROADMAP.md`
- `docs/current/VENUE_POSITIONING_AND_SCORING.md`
