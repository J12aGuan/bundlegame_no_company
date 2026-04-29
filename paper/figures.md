# Figure And Table Checklist

Use this checklist with the paper-artifact command:

```bash
npm run paper:artifacts -- \
  --analysis-dir "data analysis/research_jobs/<job_id>" \
  --publication-dir "data analysis/publication_export-YYYY-MM-DD" \
  --model-dir "data analysis/offline_rl/cql_<snapshot_id>" \
  --model-dir "data analysis/offline_rl/iql_<snapshot_id>" \
  --out-dir "data analysis/paper_artifacts/<snapshot_id>"
```

The fixture smoke test is:

```bash
npm run paper:artifacts -- \
  --analysis-dir paper_artifacts/fixtures/analysis \
  --publication-dir paper_artifacts/fixtures/publication_export \
  --model-dir paper_artifacts/fixtures/model_cql \
  --out-dir paper_artifacts/out/fixture
```

## Main CHI Figures

| Figure | Purpose | Source | Generated File | Claim Status |
| --- | --- | --- | --- | --- |
| Participant completion/drop-off | Show participant persistence and where attrition occurs | `analysis_master.csv`, `participant_summary.csv` | `figures/participant_completion_dropoff.svg` | Supported now |
| Phase A/B/C decision quality | Compare score ratio, exact optimality, and near optimality across phases | `analysis_master.csv` | `figures/phase_decision_quality.svg` | Descriptive now; causal interpretation requires clean treatment study |
| Recommendation adoption by arm and quality | Show whether people follow recommendations and whether quality matters | `recommendation_exposure.csv`, `analysis_master.csv` | `figures/recommendation_adoption.svg` | Requires complete Phase B recommendation labels |
| Timing and burden summary | Report thinking, picking, delivery, and idle/penalty time | `kpi_timing_*.csv`, `analysis_master.csv` | table or custom figure | Requires timing QA |
| Survey experience summary | Report trust, usefulness, workload, and survey completion | `participant_survey.csv`, `human_policy_eval.csv` | table or custom figure | Requires matched survey rows |

## CHI Tables

| Table | Source | Current Generator | Notes |
| --- | --- | --- | --- |
| Participant flow and exclusions | `dataset_snapshot.json`, `qa_issues.csv`, `run_metadata.json` | `model_registry_snapshot_manifest.csv` plus QA rows | Add prose for exclusions and missingness |
| Phase decision quality | `analysis_master.csv` | `tables/phase_decision_quality.csv` | Use decomposed metrics, not admin `total_score` |
| Recommendation adoption | `recommendation_exposure.csv` | `tables/recommendation_adoption.csv` | Only use when labels are complete |
| Survey-linked experience | `participant_survey.csv`, `human_policy_eval.csv` | not automatic yet | Add after survey variable map is finalized |
| Reproducibility manifest | `paper_manifest.json`, `output_manifest.json` | `tables/model_registry_snapshot_manifest.csv` | Include snapshot id and code commit |

## RecSys Appendix Tables

| Table | Source | Generated File | Notes |
| --- | --- | --- | --- |
| OPE comparison | `ope_summary.csv`, model `ope_summary.csv` | `tables/ope_comparison.csv` | Includes IPS, SNIPS, DR, CI columns, match rate, and effective sample size |
| Model registry / snapshot manifest | `paper_manifest.json`, model `config.json`, `evaluation_summary.json` | `tables/model_registry_snapshot_manifest.csv` | Use to document model type and implementation status |
| Ablation summary | `sandbox_summary.csv`, model `evaluation_summary.json` | `tables/ablation_summary.csv` | Label simulator-only rows clearly |
| Policy comparison | `policy_comparison.csv`, model `policy_comparison.csv` | not automatic yet | Add if final RecSys appendix needs a separate baseline table |
| Dataset schema table | `DATA_SCHEMA.md`, `schema.json` | not automatic | Include in resource appendix if space allows |

## Figure Accessibility Checklist

- Each figure has a plain-language caption.
- Each figure has alt text that states the main takeaway without relying on color.
- SVG text labels are readable at column width.
- Do not use color as the only distinction.
- Explain whether figure is human evidence, model evidence, or simulator-only.
- Include exact input snapshot and command in `output_manifest.json`.

## Evidence Mapping Rules

- If `dataset_snapshot.qa_report.blockers` includes `missing_recommendation_labels`, remove treatment-effect figures from the main paper.
- If blockers include `missing_timestamps`, avoid learning/timing claims from affected rows.
- If blockers include `completed_game_mismatch`, use round coverage rather than completion flags.
- If a table uses `sandbox_summary.csv`, label it simulation-only.
- If a model row lacks trained artifact provenance, label it planned or analysis baseline, not trained offline RL.
