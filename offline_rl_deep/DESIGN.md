# Deep Package Design Note

The original `offline_rl/` package is a tabular masked-action baseline: it stores per-state/action values in dictionaries and updates them directly. It is useful as a reproducible sanity check, but it does not learn representations from state or action features.

`offline_rl_deep/` is different in four ways:

- It uses PyTorch neural networks over `policy_training.csv` state and action features.
- It batches variable legal action sets with padding and masks illegal actions in logits, losses, target values, and recommendation selection.
- It trains a masked behavior policy before CQL/IQL so OPE can use logged propensities when available or estimated propensities when they are not.
- It saves `checkpoint.pt` with model weights, feature schema, seed, config, and provenance, plus per-seed summaries across at least five seeds.

The package is still a baseline stack, not a new algorithm claim by itself. Simulator-only rows and human-evidence tables remain separate.
