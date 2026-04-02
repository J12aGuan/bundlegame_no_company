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

## Classroom Live Leaderboard

The admin experience now supports a live class session workflow for running the game in class and projecting standings in real time.

### What It Does

- Adds a dedicated `/admin/live` page for a classroom leaderboard.
- Uses Firestore realtime listeners so rankings update without manual refresh.
- Shows a roster of everyone who joined the current class session, plus a podium, earnings chart, and ranked table.
- Uses participant ID as the displayed name.
- Ranks students by:
  - highest `earnings`
  - then highest `roundsCompleted`
  - then lowest `totalGameTime`
  - then participant ID

### Live Session Rules

- The instructor starts the class session from the admin dashboard before class.
- Only students who start the game while that session is active are added to the live leaderboard.
- Historical users are not pulled into the current class session automatically.
- The session is configured as a 20-minute classroom run for display/context only.
- Students are not removed when 20 minutes elapse, go idle, or stop updating temporarily.
- Students remain on the board until the admin explicitly ends the session.

### Firestore Shape

- `LiveSessions/{sessionId}`
- `LiveSessions/{sessionId}/participants/{participantId}`

Each live session stores:

- `sessionId`
- `label`
- `status`
- `startedAt`
- `endedAt`
- `plannedDurationMinutes`
- `scenarioSetVersionId`
- `scenarioSetName`

Each participant row stores:

- `participantId`
- `displayName`
- `earnings`
- `roundsCompleted`
- `optimalChoices`
- `totalGameTime`
- `completedGame`
- `status`
- `joinedAt`
- `lastActivityAt`
- `finalizedAt`

### Gameplay Integration

- New runs pick up the currently active live session when one exists.
- Mid-game progress saves update the live participant row alongside the usual summary/progress writes.
- Final completion marks the participant as completed on the live board but keeps them visible until the session is ended manually.

## Results And Reliability Updates

Two recent operational fixes matter for data collection and classroom use:

### End-Screen / Qualtrics Reliability

- Clipboard permission failures no longer trigger the fatal global error screen.
- The participant result code stays visible even when the browser blocks `navigator.clipboard.writeText(...)`.
- The end screen provides manual result-code confirmation as a fallback.
- Final completion now waits for confirmed Firebase persistence before the run is treated as complete.
- Recovery metadata is stored when the final save cannot be confirmed.

### Results Page Improvements

- Result hydration now falls back across summary and progress data so `earnings`, `optimalChoices`, `roundsCompleted`, and `totalGameTime` do not disappear on newer records.
- The results page now exposes:
  - completion-date filtering
  - current-session filtering
  - custom date ranges
  - optional inclusion of undated legacy rows
  - explicit time/date quick sorts such as newest, oldest, fastest, and slowest

### New Summary Metadata

Participant summary/progress rows can now carry:

- `completionMeta`
- `liveSessionId`
- `sessionStartedAt`
- `lastActivityAt`
- `sessionLabel`

## Recent Feature History

This rolling log tracks the 10 most recent meaningful feature changes. Keep it newest-first, keep each row to one line, and trim the oldest row when adding a new one.

| Commit(s) | Feature added |
| --- | --- |
| `4a1430a` | Added the live class leaderboard, realtime classroom session tracking, and results-page date/session filtering improvements. |
| `0a3b19f` | Fixed blocked result-code copy behavior and tightened final Firebase save confirmation before completion. |
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
- `/admin/live` provides the classroom leaderboard and live class-session controls
- `/admin/analysis` provides live analytics and RL-ready exports

See [docs/current/ANALYTICS_AND_RL_EXPORTS.md](docs/current/ANALYTICS_AND_RL_EXPORTS.md) for export details.
