# Analytics and Model Exports

## Scope

The project now has two admin-facing analytics surfaces:

- `/admin/analysis` for general analytics and uploads
- `/admin/research` for technical research workflows, snapshot QA, policy comparison, OPE proxy summaries, sandbox summaries, and job orchestration

The shared logic lives in:

- `src/lib/analysis/engine.js`
- `data analysis/analytics_v1`

Companion runtime utilities:

- `scripts/research-data-summary.mjs`
- `scripts/research-worker.mjs`
- `scripts/export-admin-scores.mjs`

For exact regeneration commands, use [../../ARTIFACTS.md](../../ARTIFACTS.md). For table schemas and redaction rules, use [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md). For model maturity and registry rules, use [MODELS.md](MODELS.md).

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

## Protocol Validation

Analytics uses the same protocol definition as runtime collection:

- source: `src/lib/researchStudy.js`
- version: `bundlegame_abc_50_round_v1`
- rounds: Phase A 1-15, Phase B 16-35, Phase C 36-50
- recommendation exposure: Phase B only, with display controlled by participant arm

`computeAnalytics()` rejects snapshots whose dataset, enabled protocol, or metadata drifts from this definition. This keeps `analysis_master.csv`, `policy_training.csv`, and the paper-facing exports aligned with the runtime experiment.

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

## Versioned Raw And Publication Exports

The score export script now supports two research-table modes in addition to the class score sheet:

```bash
npm run scores:export -- --mode raw_research_export
npm run scores:export -- --mode publication_export
```

By default, each mode writes a dated folder under `data analysis/` containing:

- `<mode>.json`
- `schema.json`
- `participant_summary.csv`
- `per_round_decisions.csv`
- `actions.csv`
- `recommendation_exposure.csv`
- `survey_linkage.csv`

Both modes use schema version `bundlegame_research_export_v1`.

### `raw_research_export`

Internal QA export with operational identifiers retained.

Do not share this export outside the approved research team.

Tables:

- `participant_summary`: `participant_id`, display label, scenario-set version, completion state, rounds, earnings, optimal choices, timing, live-session fields, result access key.
- `per_round_decisions`: one row per logged `round_summary` decision with participant ID, phase, arm, scenario, recommendation fields, chosen bundle, oracle bundle, reward, legal-action-mask version, timing, optimality, and missing-field flags.
- `actions`: reconstructed action-summary and detailed-action timing rows by participant, scenario-set version, scenario, source, and timing payload.
- `recommendation_exposure`: one row per decision exposure with shown recommendation bundle/ranking, chosen bundle, oracle bundle, policy metadata, and mask version.
- `survey_linkage`: participant-to-Qualtrics linkage with response IDs, result code, match key, save status, completion state, timing, and raw fields.

### `publication_export`

Publication-safe derived export for sharing or paper artifacts.

Redaction rules:

- Replaces direct participant IDs with stable `publication_participant_id` values.
- Uses `PUBLICATION_PSEUDONYM_SALT` when present so pseudonyms remain stable across exports while being harder to reverse.
- Excludes direct names, game result access keys, Qualtrics response IDs, Qualtrics user IDs, Qualtrics result codes, match keys, live-session labels, and raw survey fields.

The publication decision and recommendation tables always include columns for:

- `phase`
- `policy_arm`
- `scenario_id`
- `recommendation_source`
- `shown_recommendation_bundle_ids_json`
- `shown_ranked_bundles_json`
- `chosen_orders_json`
- `best_bundle_ids_json`
- `reward`
- `legal_action_mask_version`

Rows with missing values keep the columns and record missing required fields in `missing_required_fields_json`.

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

- reproducible tuple IDs: `state_id`, `action_id`, `next_state_id`, and `done`
- state features
- action/bundle features
- legal-action-mask fields: `state_legal_action_mask_version` and `action_legal`
- observed chosen action
- reward target
- next-state summary
- terminal flag
- state provenance copied from the source decision row

For new generated scenario sets, candidate-bundle metadata is persisted in `optimal[].candidate_bundles[]` using generator schema `bundlegame_scenario_generator_v2`. Those rows preserve route-optimised delivery sequence, earnings, travel time, pick time, shared-item savings, regret to best, and uncertainty flags for offline evaluation. Older datasets can still be reconstructed dynamically from scenario/order data, but reproducible research snapshots should prefer generated datasets with stored candidate metadata.

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

Model maturity is explicit in the registry and exports. Linear analysis-time models are labelled as baselines, not DRL policies.

Baseline ladder:

| Rank | Policy | Model type | Status | Provenance |
| --- | --- | --- | --- | --- |
| 0 | `historical_human` | `reference_baseline` | `implemented` | observed participant choices |
| 1 | `heuristic_route_score` | `heuristic` | `implemented` | rule-based candidate-bundle metadata |
| 2 | `behavior_cloning_linear` | `behavior_cloning` | `analysis_baseline` | linear fit on observed choices |
| 3 | `reward_model_linear` | `reward_model` | `analysis_baseline` | linear fit on reward targets |
| 4 | `contextual_bandit_linear` | `contextual_bandit` | `analysis_baseline` | linear adoption/outcome workbench |
| 5 | `CQL` | `offline_rl` | `not_implemented` | planned future artifact |
| 6 | `IQL` | `offline_rl` | `not_implemented` | planned future artifact |
| 7 | `oracle_optimal` | `reference_baseline` | `implemented` | legal candidate-bundle optimum |

`policy_comparison.csv` compares:

- `historical_human`
- `heuristic_route_score`
- `behavior_cloning_linear`
- `reward_model_linear`
- `contextual_bandit_linear`
- `oracle_optimal`

`ope_summary.csv` contains:

- `IPS`
- `SNIPS`
- `DR`
- `FQE proxy` (one-step linear approximation in the current admin-facing stack)

Each policy/OPE/sandbox export includes `model_type`, `implementation_status`, `training_mode`, `training_data_source`, and `training_rows`. Rows with `model_type=offline_rl` should only be treated as trained offline RL when `implementation_status=trained` and a registered model artifact/provenance is present.

`sandbox_summary.csv` contains simulation-only bootstrap summaries and should never be mixed into human-evidence tables without labeling.

## Offline RL Training Package

The standalone `offline_rl/` Python package trains masked discrete-action CQL and IQL baselines from frozen snapshots. It validates `policy_training.csv` before training and refuses to run unless full state-action-reward tuples, legal-action masks, candidate bundle actions, and participant-level split inputs are present.

Outputs are kept separate from human-evidence exports:

- `checkpoint.json`
- `config.json`
- `schema_validation.json`
- `evaluation_summary.json`
- `policy_comparison.csv`
- `ope_summary.csv`
- `recommendation_map.json`
- `scenario_recommendation_map.json`

Registry import rows can be generated with `python -m offline_rl.export_artifacts`; trained rows use `model_type=offline_rl`, `implementation_status=trained`, and `simulator_only=false`.

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

- [RESEARCH_PLAYBOOK.md](RESEARCH_PLAYBOOK.md)
- [PAPER_ANALYSIS_WORKFLOW.md](PAPER_ANALYSIS_WORKFLOW.md)
- [FULL_PAPER_READY_STUDY_ROADMAP.md](FULL_PAPER_READY_STUDY_ROADMAP.md)
- [EXPERIMENT_PROTOCOL.md](EXPERIMENT_PROTOCOL.md)
- [MODELS.md](MODELS.md)
- [../../ARTIFACTS.md](../../ARTIFACTS.md)
- [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md)
