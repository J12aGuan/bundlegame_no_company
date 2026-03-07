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
- `kpi_by_scenario.csv`
- `qa_issues.csv`
- `cohort_comparisons.csv` (when `--cohort-col` is passed)
- `run_metadata.json`
