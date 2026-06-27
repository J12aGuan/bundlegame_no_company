# BundleGame Simulation Pipeline (analysis/sim/)

Verified, deterministic pipeline for the Section 5 simulation and the mechanism analysis.
One command regenerates every paper figure and table:

    python run_all.py

## Frozen-data dependency (read-only ground truth)
Reads from the committed frozen data at `publishing/export_for_analysis/` (commit `2d69642`):
`pilot_decisions_deployed.csv`, `frozen_bundle_menu_data.csv`, `reconstructed_cities_matrix.csv`,
`frozen_inputs/pilot_{stores,cities}.json`. The DEPLOYED scorer is ground truth (scores are not
recomputed). The stored generation-time oracle (`best_bundle_ids`) is used everywhere, not a
per-decision argmax.

PATHS: `foundation.resolve_frozen()` maps the modules' bare data filenames to
`publishing/export_for_analysis/`, resolved relative to this directory, so the pipeline runs from any
working directory (no copies). The 35-round confirmatory set is read via `foundation.THIRTYFIVE_ROUND_JSON`
(`publishing/experiments/2_june30_enriched_4order/frozen/`). Generated figures and `tables.md` are
written into `analysis/sim/` and are gitignored; regenerate with `python analysis/sim/run_all.py`.

## Locked-stat guard
`foundation.py` asserts the locked pilot statistics on load and exits on mismatch:
rows 1268, optimal rate 0.2216, mean regret 0.0965, bundle rate 0.8975. If any assertion fails,
STOP and diagnose path/data drift rather than proceeding.

## Files
- `foundation.py`      — loads frozen CSVs into Menu/FeasibleBundle dataclasses; locked-stat guard
- `addropswap.py`      — Stage 2: best drop/add/swap taxonomy, participant-clustered bootstrap CIs
- `worker_model.py`    — Stage 3: shrinkage conditional logit, temporal validation (fit r1-10, predict r11+)
- `mechanism.py`       — time-underpricing decomposition (contrast-reversal attribution)
- `objective.py`       — OLS local prices; payout-anchored bot beliefs
- `policies.py`        — five faithful Bayesian-contrast-learning policies
- `policies_v2.py`     — corrected policies using true Δscore feedback + OLS local prices
- `cross_env.py`       — loads the 35-round set (reads shared_item_savings_seconds)
- `shifted_transfer.py`— within- vs cross-component shifted transfer
- `reconcile.py`       — decay re-check (documents the decay finding as a scorer artifact)
- `make_core_figures.py`, `make_mechanism_figure.py`, `make_partial_learning_figure.py`,
  `make_shift_figure.py`, `make_picking_channel_figure.py` — figure generators
- `run_all.py`         — master runner

## Determinism
Fixed seeds throughout; matplotlib PDF metadata pinned (`CreationDate=2024-01-01`, `pdf.fonttype=42`).
