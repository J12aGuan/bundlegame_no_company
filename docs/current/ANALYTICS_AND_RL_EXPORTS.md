# Analytics & RL Exports (March 2026)

## Purpose
`/admin/analysis` provides live participant-vs-optimal analytics for experiment monitoring and RL dataset export.

## Data Sources
- Participants and action logs: `Users/*` and `Users/{id}/Actions`
- Round decisions: `Actions` where `type == "round_summary"`
- Scenario context + optimal bundles: `MasterData/datasets.{datasetRoot}`
- Optional modeled-time context: `MasterData/store`, `MasterData/cities`

Default dataset is `centralConfig.scenario_set`, with dataset switching support in the UI.

## Classification-First Analytics
Primary grouping is scenario `classification`:
- `easy`
- `medium`
- `hard`
- `unclassified` (fallback when classification is missing)

Phase is secondary and displayed when present.

## Scenario Metadata for Generated Datasets
Generated scenarios now include:
- `classification`
- `score_gap`
- `relative_gap`

These are written into `scenarios[]` entries in grouped datasets.

## Dashboard Outputs
The analysis page computes and visualizes:
- Exact optimal / near optimal / failure rates
- Score ratio and regret metrics
- Duration and modeled-time summaries
- Confidence intervals (Wilson + bootstrap)
- Cohort comparisons (two-proportion z-test + bootstrap median-diff CI)
- QA issue table (missing scenario/optimal, unknown order IDs, cross-store bundles, missing classification)

The page is optimized for quick admin review:
- compact KPI and diagnostics cards at top
- tabbed chart groups (`Overview Charts`, `Behavior Charts`) to reduce scrolling
- collapsible detail tables for participant/cohort/QA sections

## RL-Ready Export Contract
`decision_fact.csv` and `decision_fact.json` use stable columns:
- `dataset_root`, `participant_id`, `round_index`, `scenario_id`
- `classification`, `phase`, `current_city`
- `chosen_orders`, `best_bundle_ids`, `bundle_size`
- `success`, `is_failure`, `duration`
- `participant_earnings`, `participant_modeled_time`, `participant_score`, `best_score`
- `score_ratio_to_best`, `percent_regret`
- `is_exact_optimal`, `is_near_optimal`

Additional dashboard exports:
- `kpi_overall.csv`
- `kpi_by_classification.csv`
- `kpi_by_round.csv`
- `kpi_by_participant.csv`
- `analysis_run_metadata.json`

## Offline Pipeline Alignment
`data analysis/analytics_v1` mirrors the same classification-aware decision-fact logic and now emits:
- `kpi_by_classification.csv`

Use this for offline reproducible runs and cross-checks against dashboard metrics.

## Troubleshooting Empty Charts
If charts show no data:
1. Verify participants have `round_summary` actions in `Users/{id}/Actions`.
2. Confirm selected dataset matches the one used during data collection.
3. Check QA issues for `missing_scenario_for_round` or `missing_optimal_for_scenario`.
4. Use the dashboard reload/recompute controls; initial load auto-attempts dataset matching when no decisions are found.
