# Models And Recommendation Pipeline

This document explains the current recommendation/model stack without overstating model maturity.

## Core Principle

BundleGame separates:

- observed human decisions
- deterministic heuristic/oracle baselines
- analysis-time statistical baselines
- trained offline-RL artifacts
- simulator-only experiments

Only rows with trained artifact provenance should be described as trained offline-RL models.

## Model Registry

Model metadata is normalized in `src/lib/researchStudy.js` and stored in Firestore under `ResearchModels`.

Important fields:

- `model_id`
- `policy_name`
- `policy_version`
- `model_type`
- `implementation_status`
- `baseline_ladder_rank`
- `dataset_root`
- `dataset_snapshot_id`
- `action_mask_version`
- `training_provenance`
- `metrics`
- `artifact_uris`
- `recommendation_map`
- `simulation_only`

Unsupported or not-implemented models are not allowed to silently become active recommendation policies.

## Baseline Ladder

| Rank | Policy | Type | Status | Evidence |
| --- | --- | --- | --- | --- |
| 0 | `historical_human` | `reference_baseline` | implemented | observed choices |
| 1 | `heuristic_route_score` | `heuristic` | implemented | candidate-bundle metadata |
| 2 | `behavior_cloning_linear` | `behavior_cloning` | analysis baseline | linear fit on observed choices |
| 3 | `reward_model_linear` | `reward_model` | analysis baseline | linear fit on reward targets |
| 4 | `contextual_bandit_linear` | `contextual_bandit` | analysis baseline | adoption/outcome workbench |
| 5 | `tabular_cql` | `offline_rl_tabular` | baseline artifact | `offline_rl/` dictionary-value baseline |
| 6 | `tabular_iql` | `offline_rl_tabular` | baseline artifact | `offline_rl/` dictionary-value baseline |
| 7 | `deep_cql_masked` | `offline_rl_deep` | trained when artifact exists | PyTorch masked CQL baseline |
| 8 | `deep_iql_masked` | `offline_rl_deep` | trained when artifact exists | PyTorch masked IQL ablation |
| 9 | `oracle_optimal` | `reference_baseline` | implemented | legal candidate optimum |

Analysis-time linear models are baselines. They are not deep RL.

## Recommendation Slate Resolution

`resolveRecommendationSlate()` chooses recommendation display metadata in this order:

1. active `ResearchModels` recommendation map for the participant policy and dataset
2. scenario policy-specific metadata
3. generic scenario recommendation metadata
4. oracle fallback when recommendations are enabled but no policy recommendation exists

The resolver returns:

- study protocol id
- phase
- policy arm
- policy name/version
- dataset snapshot id
- legal action mask version
- shown bundle ids
- shown ranked bundles
- recommendation source
- model id when used

If the protocol, phase, or arm disables recommendations, it returns `recommendation_source=none` and no shown bundle.

## Offline-RL Packages

The standalone package under `offline_rl/` trains tabular masked discrete-action CQL/IQL-style baselines from frozen exports. It stores per-state/action values in dictionaries and should be described as a tabular baseline, not deep RL.

The standalone package under `offline_rl_deep/` trains PyTorch masked discrete-action baselines. It uses state and action features from `policy_training.csv`, masks illegal actions in neural logits/losses/evaluation, runs masked behavior-cloning pretraining, and then trains deep CQL or deep IQL.

Inputs:

- `policy_training.csv`
- `dataset_snapshot.json`

The package validates:

- participant-level split compatibility
- state/action/next-state tuple IDs
- legal action masks
- complete candidate actions for each state
- observed chosen action flags
- reward targets

Outputs:

- `config.json`
- `schema_validation.json`
- `checkpoint.json` for tabular baselines or `checkpoint.pt` for deep baselines
- `training_log.jsonl` for deep baselines
- `evaluation_summary.json`
- `policy_comparison.csv`
- `ope_summary.csv`
- `recommendation_map.json`
- `scenario_recommendation_map.json`
- `seed_summary.csv` and `multi_seed_summary.json` for deep multi-seed runs

Registry rows exported from trained artifacts should use:

- `model_type=offline_rl_tabular` or `model_type=offline_rl_deep`
- `implementation_status=trained`
- `simulator_only=false`
- populated artifact URIs
- the source `dataset_snapshot_id`

Deep OPE rows use logged propensities when present. If the export does not include logged propensities, `offline_rl_deep/` trains a behavior-policy model and marks OPE rows with `propensity_source=estimated_behavior_model`.

## Human Evidence Separation

Use human data tables for:

- descriptive behavior
- learning and round patterns
- recommendation exposure and compliance when labels are complete
- off-policy evaluation inputs

Use model tables for:

- baseline comparisons
- OPE summaries
- trained offline-RL evaluation
- recommendation-map exports

Use simulator tables only for:

- ablations
- stress tests
- prototype comparisons

Do not merge simulator-only rows into human-evidence tables without explicit labeling.
