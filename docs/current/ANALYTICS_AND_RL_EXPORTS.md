# Analytics and RL Exports (March 2026)

## Purpose

`/admin/analysis` provides live participant-vs-optimal analytics for experiment monitoring and RL dataset export.

## Data Sources

- Participants and action logs: `Users/*` and `Users/{id}/Actions`
- Round decisions: `Actions` where `type == "round_summary"`
- Scenario context and optimal bundles: `MasterData/datasets.{datasetRoot}`
- Modeled-time context: `MasterData/store` and `MasterData/cities`

Default dataset is `centralConfig.scenario_set`, with dataset switching support in the UI.

## Modeled-Time Semantics

Analytics should interpret modeled time using the same rules documented in the runtime docs:

- `estimatedTime` is the modeled base time stored on each order
- modeled order time = `estimatedTime + cityTravelTime`
- `cityTravelTime` comes from `MasterData/cities`

This is distinct from runtime delivery logging:

- runtime delivery leg = `localTravelTime + cityTravelTime`
- per-phase timing buckets such as `cityTravelTime`, `localDeliveryTime`, and `startPickingConfirmationTime` reflect measured runtime behavior, not the modeled score estimate

## Classification-First Analytics

Primary grouping is scenario `classification`:

- `easy`
- `medium`
- `hard`
- `unclassified`

Phase is secondary and displayed when present.

## Scenario Metadata for Generated Datasets

Generated scenarios may include:

- `classification`
- `score_gap`
- `relative_gap`

These are written into `scenarios[]` entries in grouped datasets.

## Dashboard Outputs

The analysis page computes and visualizes:

- exact optimal, near-optimal, and failure rates
- score ratio and regret metrics
- duration and modeled-time summaries
- confidence intervals
- cohort comparisons
- QA issue tables for missing scenario data, unknown order IDs, cross-store bundles, and missing classification

## RL-Ready Export Contract

`decision_fact.csv` and `decision_fact.json` use stable columns including:

- `dataset_root`
- `participant_id`
- `round_index`
- `scenario_id`
- `classification`
- `phase`
- `current_city`
- `chosen_orders`
- `best_bundle_ids`
- `bundle_size`
- `success`
- `is_failure`
- `duration`
- `participant_earnings`
- `participant_modeled_time`
- `participant_score`
- `best_score`
- `score_ratio_to_best`
- `percent_regret`
- `is_exact_optimal`
- `is_near_optimal`

Additional dashboard exports:

- `kpi_overall.csv`
- `kpi_by_classification.csv`
- `kpi_by_round.csv`
- `kpi_by_participant.csv`
- `analysis_run_metadata.json`

## Offline Pipeline Alignment

`data analysis/analytics_v1` mirrors the same classification-aware decision-fact logic for offline reproducible runs.

## Troubleshooting Empty Charts

1. Verify participants have `round_summary` actions in `Users/{id}/Actions`.
2. Confirm the selected dataset matches the one used during data collection.
3. Check QA issues for missing scenario or optimal data.
4. Confirm the relevant scenario orders and Cities data exist for modeled-time calculations.
