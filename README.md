# Bundle Game

Order bundling behavioral experiment built with SvelteKit, Firebase, and map-based delivery flows.

Quick links: [Quick Setup](#quick-setup) | [Docs Hub](docs/README.md) | [Current Architecture](docs/current/ARCHITECTURE.md) | [Config and Datasets](docs/current/CONFIG_AND_DATASETS.md) | [Security](SECURITY.md)

## What This Project Does

- Runs the main bundling experiment and the tutorial flow.
- Stores runtime configuration and datasets in Firestore `MasterData`.
- Includes admin tooling for datasets, timing validation, city-travel configuration, analytics, and export.

## Quick Setup

```bash
git clone https://github.com/nnicholas-c/bundlegame_no_company.git
cd bundlegame_no_company
npm install
cp .env.example .env
npm run dev
```

Fill in Firebase, MapTiler, and downloader credentials in `.env` before running locally.

Detailed setup: [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md)

## Security

Before collecting real participant data, publish the Firestore rules from [`firestore.rules`](firestore.rules).

Full guidance: [SECURITY.md](SECURITY.md)

## Documentation

Start with [docs/README.md](docs/README.md) for the documentation index.

| Topic | Link |
| --- | --- |
| Project overview and recent changes | [README.md](README.md) |
| Local setup | [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md) |
| Runtime architecture | [docs/current/ARCHITECTURE.md](docs/current/ARCHITECTURE.md) |
| Firestore config, datasets, and timing model | [docs/current/CONFIG_AND_DATASETS.md](docs/current/CONFIG_AND_DATASETS.md) |
| Analytics and RL exports | [docs/current/ANALYTICS_AND_RL_EXPORTS.md](docs/current/ANALYTICS_AND_RL_EXPORTS.md) |
| Experiment design | [docs/experiment/EXPERIMENT_DESIGN.md](docs/experiment/EXPERIMENT_DESIGN.md) |
| Legacy material | [docs/archive/README.md](docs/archive/README.md) |

## Current Runtime Notes

Runtime configuration and experiment data are loaded from Firestore, not local static JSON.

Primary documents and grouped data:

- `MasterData/centralConfig`
- `MasterData/tutorialConfig`
- `MasterData/cities`
- `MasterData/datasets`

Timing semantics:

- Modeled order time = `estimatedTime + cityTravelTime`
- Runtime delivery leg = `localTravelTime + cityTravelTime`
- Cross-city travel comes from `MasterData/cities.travelTimes`
- Missing city routes are surfaced in the selection flow, delivery flow, and admin validation

## Recent Feature History

This rolling log tracks the 10 most recent meaningful feature changes. Keep it newest-first, keep each row to one line, and trim the oldest row when adding a new one.

| Commit(s) | Feature added |
| --- | --- |
| `7d315d2` | Updated data collection behavior and related gameplay logging. |
| `a87eb98`, `d18f18e` | Brought in the refreshed delivery UI and supporting delivery-flow changes. |
| `ab08d42` | Updated the city selection map UI. |
| `f445a07` | Refreshed the main game UI styling and layout. |
| `8297e5e`, `ecb931e` | Reworked the pick-item interface. |
| `0c78b3f` | Applied requested gameplay and interface adjustments. |
| `949edc9` | Moved item identification and order details into the same row. |
| `8b8a684` | Added the tutorial round 2 guidance message. |
| `6c297a1` | Removed the scenario difficulty restriction. |
| `1decfb1` | Added the Qualtrics handoff message. |

## Contributing

Use a feature, fix, or docs branch instead of pushing ad hoc changes directly.

Before opening a PR:

- Run `npm run build`
- Check that Firebase-backed pages still load
- Update the relevant file in `docs/current/` when behavior changes
- Add or refresh the README `Recent Feature History` row when a meaningful feature ships

Commit prefixes used in this repo:

- `feat:` new behavior or feature
- `fix:` bug fix
- `docs:` documentation update
- `refactor:` structural change without intended behavior change
- `chore:` maintenance work

## Deployment and Export

Pushes to `main` deploy through Vercel.

For participant export:

- `/downloader` exports participant data
- `/admin/analysis` provides live analytics and RL-ready exports

See [docs/current/ANALYTICS_AND_RL_EXPORTS.md](docs/current/ANALYTICS_AND_RL_EXPORTS.md) for export details.
