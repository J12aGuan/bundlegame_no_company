# Developer Quickstart

Use this guide to get the project running locally with the current Firestore-backed configuration flow.

## Prerequisites

- Node.js 18 or newer
- Access to this repository
- Firebase credentials
- MapTiler API key

## Local Setup

```bash
git clone https://github.com/nnicholas-c/bundlegame_no_company.git
cd bundlegame_no_company
npm install
cp .env.example .env
```

Fill in the values for:

- Firebase client configuration
- MapTiler key
- downloader password

Detailed environment reference: [ENVIRONMENT.md](ENVIRONMENT.md)

## Run and Verify

```bash
npm run dev
```

Then open `http://localhost:5173`.

Recommended verification:

```bash
npm run build
```

## Useful Follow-Up Docs

- Project overview: [../../README.md](../../README.md)
- Runtime architecture: [../current/ARCHITECTURE.md](../current/ARCHITECTURE.md)
- Firestore config and timing rules: [../current/CONFIG_AND_DATASETS.md](../current/CONFIG_AND_DATASETS.md)
- Analytics and exports: [../current/ANALYTICS_AND_RL_EXPORTS.md](../current/ANALYTICS_AND_RL_EXPORTS.md)

## Common Issues

- Firebase errors: check the Firebase values in `.env`
- Map not loading: check `VITE_MAPTILER_API_KEY`
- Missing updates: restart the dev server after changing env vars

## Working Rule

When a behavior change ships, update the relevant file in `docs/current/` and refresh the README `Recent Feature History` table if the change is meaningful enough to track there.
