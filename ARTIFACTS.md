# Reproducible Artifacts Guide

This guide explains how to regenerate BundleGame analysis tables, model inputs, and figure source data from a clean checkout.

## Artifact Tiers

| Tier | Purpose | Safe To Share |
| --- | --- | --- |
| Fixture artifacts | CI and reviewer smoke reproduction from checked-in synthetic fixtures | Yes |
| Internal raw artifacts | QA with operational participant, result, and Qualtrics identifiers | No |
| Publication artifacts | Pseudonymous derived exports with direct identifiers removed | Usually, after project review |
| Model artifacts | Offline-RL configs, checkpoints, evaluation summaries, recommendation maps | Depends on source data tier |

## 1. Clean Checkout Verification

```bash
npm ci
npm run build
npm run test:js
make PYTHON=python3.11 test-python
```

If your machine only has `python3.9`, install Python 3.10+ or pass a supported interpreter path to `make PYTHON=... test-python`.

## 2. Fixture Analysis Run

The fixture run requires no Firebase or Qualtrics credentials.

```bash
cd "data analysis/analytics_v1"
python -m pip install -e ".[dev]"
python -m analytics.cli run \
  --source json \
  --dataset-root experiment \
  --data-json ./tests/fixtures/participants_fixture.json \
  --scenario-bundle-json ./tests/fixtures/scenario_bundle_fixture.json \
  --stores-json ./tests/fixtures/stores_fixture.json \
  --cities-json ./tests/fixtures/cities_fixture.json \
  --metadata-file ./tests/fixtures/metadata_fixture.csv \
  --out-dir ./out/fixture
```

Expected core outputs under `data analysis/analytics_v1/out/fixture/`:

- `analysis_master.csv`
- `policy_training.csv`
- `study_randomization.csv`
- `participant_survey.csv`
- `human_policy_eval.csv`
- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`
- `dataset_snapshot.json`
- `paper_manifest.json`
- `run_metadata.json`

This run proves the analysis code can produce the paper-table inputs and model-training table from a fresh clone.

## 3. Live Firestore Snapshot

Live exports require `.env` values for Firebase client config plus admin script credentials:

- `FIREBASE_ADMIN_EMAIL`
- `FIREBASE_ADMIN_PASSWORD`
- Firebase `VITE_` client config values

Optional but recommended before survey-linked analysis:

```bash
npm run qualtrics:sync
```

Then use `/admin/research`:

1. Sign in with a Firebase Auth account that has the `admin: true` custom claim.
2. Select the dataset root, usually `mainGame`.
3. Run analysis.
4. Check snapshot blockers and paper readiness.
5. Save a snapshot or queue a research job.

Process queued Firestore jobs locally:

```bash
npm run research:worker
```

Worker outputs are written under:

```text
data analysis/research_jobs/<job_id>/
```

## 4. Publication-Safe Derived Export

Use this mode for shareable participant-level derived data.

```bash
PUBLICATION_PSEUDONYM_SALT=private-stable-salt \
npm run scores:export -- --mode publication_export
```

Default output:

```text
data analysis/publication_export-YYYY-MM-DD/
```

Expected files:

- `publication_export.json`
- `schema.json`
- `participant_summary.csv`
- `per_round_decisions.csv`
- `actions.csv`
- `recommendation_exposure.csv`
- `survey_linkage.csv`

Before sharing, confirm:

- no names or display names
- no raw participant IDs if they can identify people
- no result access keys
- no Qualtrics response IDs, user IDs, result codes, or match keys
- no raw survey payloads or unreviewed free text

Schema details: [DATA_SCHEMA.md](DATA_SCHEMA.md)

## 5. Admin Score Export

Class-facing score exports are useful for instructors/admins but are not the primary research outcome.

```bash
npm run scores:export
```

Default outputs under `data analysis/`:

- `bundlegame-scores-YYYY-MM-DD.csv`
- `bundlegame-score-class-averages-YYYY-MM-DD.csv`

The `total_score` column is a class-relative composite. Paper-facing analyses should use decomposed metrics such as score ratio, regret, optimality, timing, completion, and survey-linked responses.

## 6. Model Artifact Regeneration

Offline-RL training consumes a frozen `policy_training.csv` and `dataset_snapshot.json`.

```bash
cd offline_rl
python -m pip install -e ".[dev]"
python -m offline_rl.train \
  --config configs/cql.json \
  --policy-training ../data\ analysis/research_jobs/<job_id>/policy_training.csv \
  --dataset-snapshot ../data\ analysis/research_jobs/<job_id>/dataset_snapshot.json \
  --out-dir ../data\ analysis/offline_rl/cql_<snapshot_id>
```

Each training run writes:

- `config.json`
- `schema_validation.json`
- `checkpoint.json`
- `evaluation_summary.json`
- `policy_comparison.csv`
- `ope_summary.csv`
- `recommendation_map.json`
- `scenario_recommendation_map.json`

Generate a model-registry import row:

```bash
python -m offline_rl.export_artifacts \
  --artifact-dir ../data\ analysis/offline_rl/cql_<snapshot_id> \
  --out-dir ../data\ analysis/offline_rl/cql_<snapshot_id>/registry
```

Keep simulator-only or offline-RL outputs separate from human-evidence tables unless the table is explicitly a model-comparison table.

## 7. Table And Figure Sources

Use these source files when regenerating manuscript tables and figures:

| Output | Source File(s) |
| --- | --- |
| Participant flow / exclusions | `dataset_snapshot.json`, `qa_issues.csv`, `run_metadata.json` |
| Round attrition figure | `analysis_master.csv` or `kpi_by_round.csv` |
| Optimality by round figure | `kpi_by_round.csv` |
| Regret by phase or arm figure | `analysis_master.csv`, `human_policy_eval.csv` |
| Bundle-size distribution | `analysis_master.csv` |
| Timing/burden table | `kpi_timing_*.csv`, `analysis_master.csv` |
| Survey summary table | `participant_survey.csv`, `human_policy_eval.csv` |
| Policy comparison table | `policy_comparison.csv` |
| OPE table | `ope_summary.csv` |
| Simulator-only ablation table | `sandbox_summary.csv` |
| Model provenance appendix | `paper_manifest.json`, offline-RL `config.json`, `evaluation_summary.json` |

The repository currently guarantees reproducible table source data. If a paper draft uses generated figure images, keep the figure-generation script or notebook with the frozen snapshot and record:

- input snapshot path
- code commit hash
- output figure filenames
- any manual formatting changes
- alt text or caption text

## 8. Paper Package Checklist

Archive this set for each analysis milestone:

- code commit hash
- `dataset_snapshot.json`
- `paper_manifest.json`
- `run_metadata.json`
- all CSVs used in tables and figures
- publication-safe export folder, if shared
- model configs, seeds, and evaluation summaries
- QA blocker notes and exclusion rules
- survey instrument or survey variable map
- figure-generation scripts/notebooks and final figures
