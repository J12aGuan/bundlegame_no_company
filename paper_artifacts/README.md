# Paper Artifact Pipeline

This directory contains the dependency-light pipeline that turns frozen BundleGame exports into paper-ready tables, SVG figures, and an output manifest.

## One-Command Fixture Run

```bash
npm run paper:artifacts -- \
  --analysis-dir paper_artifacts/fixtures/analysis \
  --publication-dir paper_artifacts/fixtures/publication_export \
  --model-dir paper_artifacts/fixtures/model_cql \
  --out-dir paper_artifacts/out/fixture
```

This writes:

- `figures/participant_completion_dropoff.svg`
- `figures/phase_decision_quality.svg`
- `figures/recommendation_adoption.svg`
- `tables/completion_by_round.csv` and `.md`
- `tables/phase_decision_quality.csv` and `.md`
- `tables/recommendation_adoption.csv` and `.md`
- `tables/ope_comparison.csv` and `.md`
- `tables/ablation_summary.csv` and `.md`
- `tables/model_registry_snapshot_manifest.csv` and `.md`
- `output_manifest.json`

## Real Snapshot Run

```bash
npm run paper:artifacts -- \
  --analysis-dir "data analysis/research_jobs/<job_id>" \
  --publication-dir "data analysis/publication_export-YYYY-MM-DD" \
  --model-dir "data analysis/offline_rl/cql_<snapshot_id>" \
  --model-dir "data analysis/offline_rl/iql_<snapshot_id>" \
  --out-dir "data analysis/paper_artifacts/<snapshot_id>"
```

The script reads `analysis_master.csv`, `dataset_snapshot.json`, `paper_manifest.json`, `ope_summary.csv`, `sandbox_summary.csv`, publication export tables, and any offline-RL model output directories supplied through `--model-dir`.

## Notes

- Figures are SVG generated with the Python standard library.
- OPE confidence intervals use reported CI columns when present. If an input row does not contain CI columns, the table includes a normal-approximation interval from the available estimate and effective sample size proxy.
- Simulator and model ablations are written to appendix tables, separate from human decision-quality figures.
