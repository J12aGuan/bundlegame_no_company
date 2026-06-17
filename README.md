# BundleGame

BundleGame is a SvelteKit and Firebase research app for studying delivery-order bundling decisions. Participants choose bundles of delivery orders across a 50-round task; the app records gameplay, timing, recommendation exposure, survey linkage, and model-ready exports for reproducible analysis.

## Quick Start

```bash
git clone https://github.com/nnicholas-c/bundlegame_no_company.git
cd bundlegame_no_company
npm ci
cp .env.example .env
npm run dev
```

Fill in Firebase and MapTiler values in `.env`, then open `http://localhost:5173`.

Prerequisites:

- Node.js 18 or newer for the app; Node.js 20 or newer is recommended for coverage output.
- Python 3.10 or newer for analytics and offline-RL tests.
- Firebase project access for live data, admin pages, and Firestore-backed exports.

## Verify A Clean Checkout

```bash
npm ci
npm run build
npm run test:js
make PYTHON=python3.11 test-python
```

The equivalent full workflow is:

```bash
make ci
```

`test:js` covers experiment logic, protocol validation, score exports, recommendation resolution, scenario generation, and research snapshot smoke behavior. `test-python` covers the offline analytics package and the standalone masked discrete-action offline-RL package. CI prints coverage summaries for the JS, analytics, and offline-RL test targets.

## How The System Fits Together

```text
participant browser
  -> Firestore Users/{participantId}
  -> Qualtrics embedded data and QualtricsResponses
  -> admin/research or offline analytics
  -> dataset_snapshot.json, analysis CSVs, publication exports, model artifacts
```

Runtime data is loaded from Firestore `MasterData`, not local static JSON:

- `MasterData/centralConfig`: active dataset and runtime settings
- `MasterData/tutorialConfig`: tutorial settings
- `MasterData/cities`: cross-city travel matrix
- `MasterData/datasets`: grouped scenario, order, optimal, and candidate-bundle metadata

The canonical experiment protocol lives in `src/lib/researchStudy.js`: 50 rounds, Phase A rounds 1-15, Phase B rounds 16-35, Phase C rounds 36-50. Runtime loading, dataset saves, protocol saves, and analytics reject mismatched protocol snapshots.

## Reproduce Analyses

For a fixture-based offline run:

```bash
cd "publishing/data_analysis/analytics_v1"
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

For live Firestore exports, configure `.env`, then run the relevant command:

```bash
npm run qualtrics:sync
npm run firestore:connection:check
npm run firestore:export:raw
npm run firestore:export:publication
npm run scores:export
npm run scores:export -- --mode publication_export
npm run research:summary -- --dataset-root mainGame --days 60
```

The full Firestore exporters use the Firebase Admin SDK with project
`bundling-63c10`. Prefer Application Default Credentials:

```bash
gcloud auth application-default login
firebase login
firebase use bundling-63c10
```

As a fallback, set `GOOGLE_APPLICATION_CREDENTIALS` to an absolute
service-account JSON path. Raw Firestore exports are restricted internal data and
are written under ignored timestamped folders in
`publishing/data_analysis/firestore_raw_export/`. Publication-safe Firestore exports require
`PUBLICATION_PSEUDONYM_SALT` and write redacted outputs under
`publishing/data_analysis/firestore_publication_safe_export/`.

Use `/admin/research` to run analysis, save snapshots, queue Firestore-backed jobs, and export the research CSV/JSON package. The local worker processes queued research jobs:

```bash
npm run research:worker
```

Detailed artifact regeneration: [ARTIFACTS.md](ARTIFACTS.md)

## Documentation Map

| Audience | Start Here |
| --- | --- |
| New developers | [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md), [docs/current/ARCHITECTURE.md](docs/current/ARCHITECTURE.md) |
| Reviewers and reproducers | [ARTIFACTS.md](ARTIFACTS.md), [DATA_SCHEMA.md](DATA_SCHEMA.md), [docs/current/REPRODUCIBILITY.md](docs/current/REPRODUCIBILITY.md) |
| Study operators | [docs/current/EXPERIMENT_PROTOCOL.md](docs/current/EXPERIMENT_PROTOCOL.md), [docs/current/CONFIG_AND_DATASETS.md](docs/current/CONFIG_AND_DATASETS.md) |
| Analysts and model builders | [docs/current/ANALYTICS_AND_RL_EXPORTS.md](docs/current/ANALYTICS_AND_RL_EXPORTS.md), [docs/current/MODELS.md](docs/current/MODELS.md) |
| Data stewards | [docs/current/DATA_GOVERNANCE.md](docs/current/DATA_GOVERNANCE.md), [SECURITY.md](SECURITY.md) |

The full documentation index is [docs/README.md](docs/README.md). Historical notes are under [docs/archive/](docs/archive/README.md) and are not authoritative for the current runtime.

## Security And Data Governance

Before collecting participant data, publish [`firestore.rules`](firestore.rules), use Firebase Auth users with the `admin: true` custom claim for admin/downloader access, and keep script credentials in non-`VITE_` variables. Do not put Qualtrics tokens, admin passwords, or publication pseudonym salts in browser-exposed variables.

Publication exports must use pseudonymous participant IDs and exclude direct identifiers such as names, result codes, Qualtrics response IDs, match keys, and raw survey payloads. See [DATA_SCHEMA.md](DATA_SCHEMA.md) and [docs/current/DATA_GOVERNANCE.md](docs/current/DATA_GOVERNANCE.md).

## License And Data Scope

The BundleGame source code is licensed under the MIT License; see [LICENSE](LICENSE). Raw human-subject data, Qualtrics exports, Firestore dumps, restricted participant records, and private salts or credentials are not covered by this software license and must not be redistributed without the appropriate study approval and data-sharing review.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local SvelteKit development server |
| `npm run build` | Build the static app |
| `npm run test:js` | Run JS regression tests with coverage |
| `npm run test:python` | Run analytics and offline-RL tests through `make test-python` |
| `npm run qualtrics:sync` | Sync completed Qualtrics responses into Firestore |
| `npm run scores:export` | Export admin scores and class averages |
| `npm run scores:export -- --mode publication_export` | Export publication-safe derived tables |
| `npm run firestore:connection:check` | Verify privileged Firebase Admin SDK access |
| `npm run firestore:export:raw` | Export restricted raw Firestore data recursively |
| `npm run firestore:export:publication` | Export pseudonymized Firestore data with direct identifiers removed |
| `npm run paper:artifacts -- --analysis-dir ...` | Generate paper figures, tables, and output manifest |
| `npm run research:summary` | Print a Firestore-backed research summary |
| `npm run research:worker` | Process queued research snapshot jobs |

## Deployment

Pushes to `main` deploy through Vercel. Admin and downloader pages require Firebase Auth with the admin custom claim.
