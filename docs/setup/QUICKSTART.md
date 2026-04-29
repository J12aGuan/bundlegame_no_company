# Developer Quickstart

Use this guide to get the project running locally with the current Firestore-backed configuration flow.

## Prerequisites

- Node.js 18 or newer; Node.js 20 or newer is recommended for JS coverage output
- Python 3.10 or newer for analytics tests
- Access to this repository
- Firebase credentials
- MapTiler API key

## Local Setup

```bash
git clone https://github.com/nnicholas-c/bundlegame_no_company.git
cd bundlegame_no_company
npm ci
cp .env.example .env
```

Fill in the values for:

- Firebase client configuration
- MapTiler key
- Firebase researcher accounts with the `admin` custom claim for admin/downloader access

Detailed environment reference: [ENVIRONMENT.md](ENVIRONMENT.md)

## Run and Verify

```bash
npm run dev
```

Then open `http://localhost:5173`.

Recommended verification:

```bash
npm run build
npm run test:js
make PYTHON=python3.11 test-python
```

If your default `python3` is older than 3.10, run the analytics tests with a supported interpreter:

```bash
make PYTHON=python3.11 test-python
```

## Useful Follow-Up Docs

- Project overview: [../../README.md](../../README.md)
- Runtime architecture: [../current/ARCHITECTURE.md](../current/ARCHITECTURE.md)
- Firestore config and timing rules: [../current/CONFIG_AND_DATASETS.md](../current/CONFIG_AND_DATASETS.md)
- Analytics and exports: [../current/ANALYTICS_AND_RL_EXPORTS.md](../current/ANALYTICS_AND_RL_EXPORTS.md)
- Reproducible artifacts: [../../ARTIFACTS.md](../../ARTIFACTS.md)
- Data schema: [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md)

## Common Issues

- Firebase errors: check the Firebase values in `.env`
- Map not loading: check `VITE_MAPTILER_API_KEY`
- Missing updates: restart the dev server after changing env vars

## Working Rule

When a behavior change ships, update the relevant file in `docs/current/`, [../../ARTIFACTS.md](../../ARTIFACTS.md), or [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md) if the change affects reproducibility or schemas.
