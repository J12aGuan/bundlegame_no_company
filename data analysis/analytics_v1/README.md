# Analytics V1

Dashboard-oriented participant-vs-optimal analytics pipeline.

## Quick Start

```bash
cd "data analysis/analytics_v1"
python -m analytics.cli run \
  --source json \
  --dataset-root experiment \
  --data-json ../Yizhen_sample.json \
  --scenario-bundle-json ./tests/fixtures/scenario_bundle_fixture.json \
  --out-dir ./out
```

Optional modeled-time parity inputs:

- `--stores-json <path>`
- `--cities-json <path>`

## Outputs

- `decision_fact.csv`
- `kpi_overall.csv`
- `kpi_by_round.csv`
- `kpi_by_participant.csv`
- `kpi_by_classification.csv`
- `kpi_by_scenario.csv`
- `qa_issues.csv`
- `cohort_comparisons.csv` (when `--cohort-col` is passed)
- `run_metadata.json`

`decision_fact.csv` includes RL-ready columns used by the admin dashboard:
- `dataset_root`, `participant_id`, `round_index`, `scenario_id`
- `classification`, `phase`, `current_city`
- `chosen_orders`, `best_bundle_ids`, `bundle_size`
- `success`, `is_failure`, `duration`, `participant_earnings`
- `participant_modeled_time`, `participant_score`, `best_score`
- `score_ratio_to_best`, `percent_regret`, `is_exact_optimal`, `is_near_optimal`
