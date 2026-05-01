# BundleGame Deep Offline RL

`offline_rl_deep/` is the PyTorch implementation for masked discrete-action BundleGame baselines. It is separate from `offline_rl/`, which remains the tabular baseline package.

Inputs:

- `policy_training.csv`
- `dataset_snapshot.json`

The trainer validates full state-action-reward tuples, keeps train/validation/test splits at the participant level, masks illegal actions throughout training and evaluation, and writes paper-friendly artifacts without touching Firestore or Qualtrics directly.

## Train

```bash
python -m offline_rl_deep.train \
  --config configs/cql.json \
  --policy-training ../data\ analysis/research_jobs/<run>/policy_training.csv \
  --dataset-snapshot ../data\ analysis/research_jobs/<run>/dataset_snapshot.json \
  --out-dir ../data\ analysis/deep_cql_run
```

Use `configs/iql.json` for the IQL ablation.

## Outputs

- `checkpoint.pt`
- `config.json`
- `training_log.jsonl`
- `schema_validation.json`
- `evaluation_summary.json`
- `policy_comparison.csv`
- `ope_summary.csv`
- `recommendation_map.json`
- `scenario_recommendation_map.json`
- `seed_summary.csv`
- `multi_seed_summary.json`
- `seeds/seed_<seed>/...` per-seed artifacts

If logged action propensities are absent, a masked behavior policy is trained and OPE rows are marked `propensity_source=estimated_behavior_model`.
