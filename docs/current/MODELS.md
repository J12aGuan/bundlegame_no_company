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
| 5 | `CQL` | `offline_rl` | planned until artifact exists | masked offline-RL package |
| 6 | `IQL` | `offline_rl` | planned until artifact exists | masked offline-RL package |
| 7 | `oracle_optimal` | `reference_baseline` | implemented | legal candidate optimum |

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

## Offline-RL Package

The standalone package under `offline_rl/` trains masked discrete-action CQL and IQL baselines from frozen exports.

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
- `checkpoint.json`
- `evaluation_summary.json`
- `policy_comparison.csv`
- `ope_summary.csv`
- `recommendation_map.json`
- `scenario_recommendation_map.json`

Registry rows exported from trained artifacts should use:

- `model_type=offline_rl`
- `implementation_status=trained`
- `simulator_only=false`
- populated artifact URIs
- the source `dataset_snapshot_id`

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
