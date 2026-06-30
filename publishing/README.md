# publishing/ — organized by experiment

This tree holds the design artifacts, exports, and paper materials. It is organized around the
**three experiments** in this repo. The canonical description (protocols, datasets, status) lives in
[`docs/shared/EXPERIMENTS.md`](../docs/shared/EXPERIMENTS.md); start there.

## Per-experiment entry points

- [`experiments/1_live_recommendation_mainGame/`](experiments/1_live_recommendation_mainGame/) —
  the A/B/C recommendation study that **already ran** (the only one with real participant data).
- [`experiments/2_june30_enriched_4order/`](experiments/2_june30_enriched_4order/) —
  the **enriched 4-order** menus for the **June 30** deadline. Protocol binding is **UNIDENTIFIED/TBD**.
- [`experiments/3_chi_september_personalization/`](experiments/3_chi_september_personalization/) —
  the **personalized / diagnosis** CHI study for **September**.

## Shared infrastructure (serves all experiments)

- `data_analysis/` — analytics pipeline + the live Firestore exports
  (`firestore_raw_export/`, `firestore_publication_safe_export/`; gitignored). The current raw export
  holds Experiment 1 (mainGame) live data.
- `export_for_analysis/` — analysis export/codebook tooling.
- `paper/`, `paper_artifacts/` — manuscript text and figure generation.
- `analysis/` — pre-registration / power-analysis scripts.

> Note: generated design dumps and live exports are gitignored (regenerable). Only the per-experiment
> `README.md` entry points and shared source/tooling are tracked.
