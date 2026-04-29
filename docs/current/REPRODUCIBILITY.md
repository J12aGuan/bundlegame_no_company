# Reproducibility

This document gives future developers and external reproducers the minimum steps needed to rebuild, test, and regenerate BundleGame analysis outputs.

## Clean-Room Build

```bash
npm ci
npm run build
npm run test:js
make PYTHON=python3.11 test-python
```

CI runs the same JS build/test path and Python analytics/offline-RL tests on GitHub Actions.

## What The Tests Cover

JS:

- protocol phase assignment
- protocol validation
- recommendation slate resolution
- bundle legality
- scenario generation determinism
- fixed 50-round score export shape
- research snapshot smoke behavior
- model registry maturity labels

Python:

- analytics CLI fixture integration
- decision fact behavior
- statistical interval helpers
- fixture-based policy-training export readiness
- offline-RL schema gates and repeatable artifact generation

## Fixture Reproduction

Use the checked-in analytics fixture when reproducing without Firebase:

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

The output folder should contain `analysis_master.csv`, `policy_training.csv`, snapshot manifests, QA outputs, and model-comparison tables.

## Firestore Reproduction

Live Firestore reproduction needs:

- Firebase client config values
- `FIREBASE_ADMIN_EMAIL`
- `FIREBASE_ADMIN_PASSWORD`
- Firebase Auth user with `admin: true` for admin UI access
- optional Qualtrics API credentials for survey sync

Recommended sequence:

```bash
npm run qualtrics:sync
npm run research:summary -- --dataset-root mainGame --days 60
```

Then use `/admin/research` to run analysis and save or queue a snapshot. Process queued jobs with:

```bash
npm run research:worker
```

## Snapshot Discipline

Archive the following for each analysis milestone:

- code commit hash
- dataset root and dataset version
- `dataset_snapshot.json`
- `paper_manifest.json`
- `run_metadata.json`
- every CSV used in a table or figure
- model configs and seeds
- QA blocker notes and exclusion rules
- survey instrument or survey variable map

## Participant Splits

Use participant-level train/validation/test splits from `dataset_snapshot.split_manifest`. Do not split the same participant across train and test.

## Reproducibility Failures

Treat these as blockers for paper-facing claims:

- protocol mismatch across code, Firestore, and dataset metadata
- missing Phase B recommendation labels for treatment claims
- missing timestamps for temporal/learning claims
- completed-game mismatch for completion claims
- publication export containing direct identifiers
- trained model row without artifact provenance

## Artifact Guide

For exact command recipes and table/figure source mapping, see [../../ARTIFACTS.md](../../ARTIFACTS.md).
