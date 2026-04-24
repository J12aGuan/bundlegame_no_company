# Analytics V1

Offline mirror of the in-app research analytics pipeline.

Companion runtime tools live at the repo root:

- `npm run research:summary`
- `npm run research:worker`

## Purpose

This CLI exists so research exports can be reproduced outside the admin UI with the same decision-fact, master-table, recommendation-workbench, and policy-evaluation logic used in the app.

## Quick Start

```bash
cd "data analysis/analytics_v1"
python -m analytics.cli run \
  --source json \
  --dataset-root experiment \
  --data-json ./tests/fixtures/participants_fixture.json \
  --scenario-bundle-json ./tests/fixtures/scenario_bundle_fixture.json \
  --stores-json ./tests/fixtures/stores_fixture.json \
  --cities-json ./tests/fixtures/cities_fixture.json \
  --metadata-file ./tests/fixtures/metadata_fixture.csv \
  --out-dir ./out
```

## Optional Inputs

- `--stores-json`
- `--cities-json`
- `--metadata-file`
- `--metadata-join-key`
- `--participant-join-key`
- `--metadata-session-key`
- `--participant-session-key`
- `--cohort-col`

## Companion Runtime Commands

- `npm run research:summary -- --dataset-root mainGame --days 60`
  - fetches live Firestore data with the web SDK and prints a high-level research summary
- `npm run research:worker`
  - processes queued `ResearchJobs` for Firestore-backed snapshots and writes artifacts under `data analysis/research_jobs/<job_id>/`

## Key Features

- merges live `round_summary` rows with reconstructed `Action/actions.orderSummary` rows
- emits row provenance and QA blocker fields
- writes a paper-facing `analysis_master.csv`
- writes an RL-ready `policy_training.csv`
- builds recommendation, policy-comparison, OPE, and sandbox outputs
- writes `dataset_snapshot.json` for reproducible training/evaluation runs

## Output Files

Core research outputs:

- `analysis_master.csv`
- `analysis_master.json`
- `policy_training.csv`
- `dataset_snapshot.json`
- `run_metadata.json`

Recommendation and evaluation outputs:

- `recommendation_workbench.csv`
- `recommendation_summary.csv`
- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`

Monitoring and QA outputs:

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
- `cohort_comparisons.csv` when `--cohort-col` is provided

## Research Notes

- `analysis_master.csv` is the primary paper-facing dataset.
- `policy_training.csv` is the action-table export for bandit / offline-RL work.
- `dataset_snapshot.json` should be archived alongside any paper or model-training run.
- Datasets with `qa_missing_recommendation_labels=1` should be treated as benchmark-only, not recommendation-treatment evidence.
