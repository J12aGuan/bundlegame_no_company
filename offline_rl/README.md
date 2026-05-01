# BundleGame Tabular Offline-RL Baselines

Standalone tabular masked discrete-action offline-RL baselines for frozen BundleGame research snapshots.

This package is intentionally separate from the admin research UI and human-evidence tables. It consumes frozen `policy_training.csv` and `dataset_snapshot.json`, validates that the export contains full state-action-reward tuples with legal-action masks, then trains CQL/IQL-style dictionary-value baselines and writes reproducible artifacts.

Use `offline_rl_deep/` for PyTorch neural masked-action baselines.

## Inputs

Required files from a frozen analysis run:

- `policy_training.csv`
- `dataset_snapshot.json`

The trainer refuses to run unless `policy_training.csv` contains:

- participant-level state IDs and split-compatible participant IDs, either internal `participant_id` or pseudonymous `publication_participant_id`
- `state_id`, `action_id`, `next_state_id`, and `done`
- `reward_target` and observed logged action flags
- all legal candidate bundle actions for each state
- `action_legal` and `state_legal_action_mask_version`
- phase, scenario, bundle, regret, optimality, and score-ratio fields

Participant train/validation/test splits use the same stable participant hash as the research snapshot. No simulator-only rows are merged into human-evidence tables.

## Train

```bash
cd offline_rl
python -m pip install -e ".[dev]"

python -m offline_rl.train \
  --config configs/cql.json \
  --policy-training ../data\ analysis/research_jobs/<run>/policy_training.csv \
  --dataset-snapshot ../data\ analysis/research_jobs/<run>/dataset_snapshot.json \
  --out-dir ../data\ analysis/offline_rl/cql_<snapshot_id>

python -m offline_rl.train \
  --config configs/iql.json \
  --policy-training ../data\ analysis/research_jobs/<run>/policy_training.csv \
  --dataset-snapshot ../data\ analysis/research_jobs/<run>/dataset_snapshot.json \
  --out-dir ../data\ analysis/offline_rl/iql_<snapshot_id>
```

## Artifacts

Each run writes:

- `config.json`
- `schema_validation.json`
- `checkpoint.json`
- `evaluation_summary.json`
- `policy_comparison.csv`
- `ope_summary.csv`
- `recommendation_map.json`
- `scenario_recommendation_map.json`

To create registry import rows:

```bash
python -m offline_rl.export_artifacts \
  --artifact-dir ../data\ analysis/offline_rl/cql_<snapshot_id> \
  --out-dir ../data\ analysis/offline_rl/cql_<snapshot_id>/registry
```

This writes `research_model_registry_row.csv` and `.json` with `model_type=offline_rl`, `implementation_status=trained`, checkpoint URI, OPE URI, recommendation-map URI, and `simulator_only=false`.

## Verification

```bash
python -m pytest
```

The tests validate schema gates, repeatable CQL metrics/checkpoints, IQL artifact writing, and model-registry export rows.
