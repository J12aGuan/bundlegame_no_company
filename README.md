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
npm ci
cp .env.example .env
npm run dev
```

Fill in Firebase and MapTiler values in `.env` before running locally.

Detailed setup: [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md)

## Reproducible Build

Clean-room setup uses the lockfile and does not require checked-in dependencies or build artifacts.

Prerequisites:

- Node.js 18 or newer for the app build; Node.js 20 or newer is recommended for JS coverage tests
- Python 3.10 or newer for analytics tests

```bash
npm ci
npm run build
npm run test:js
npm run test:python
```

You can also run the same workflow from the root Makefile:

```bash
make ci
```

If your machine has multiple Python versions, point the analytics test target at a supported one:

```bash
make PYTHON=python3.11 test-python
```

`test:js` runs the Node regression suite with coverage for experiment logic, exports, recommendation resolution, and scenario generation. `test-python` covers both the analytics package and the standalone masked discrete-action offline-RL package under [`offline_rl/`](offline_rl/README.md).

## Security

Before collecting real participant data, publish the Firestore rules from [`firestore.rules`](firestore.rules).

Admin pages and `/downloader` use Firebase Auth, not a client-side password. Create a Firebase user for each researcher, set a custom claim of `admin: true`, and keep script credentials in non-`VITE_` variables such as `FIREBASE_ADMIN_EMAIL` and `FIREBASE_ADMIN_PASSWORD`. Do not put downloader passwords or API tokens in `VITE_` variables because those are bundled into browser code.

Security migration note:

1. Enable Firebase Email/Password sign-in for researcher accounts.
2. Set `admin: true` as a custom claim on approved researcher users.
3. Remove `VITE_DOWNLOADER_PASSWORD` from local `.env` and Vercel.
4. Publish [`firestore.rules`](firestore.rules), then redeploy the app.

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
| Full study readiness roadmap | [docs/current/FULL_PAPER_READY_STUDY_ROADMAP.md](docs/current/FULL_PAPER_READY_STUDY_ROADMAP.md) |
| Experiment design | [docs/experiment/EXPERIMENT_DESIGN.md](docs/experiment/EXPERIMENT_DESIGN.md) |
| Legacy material | [docs/archive/README.md](docs/archive/README.md) |

## Current Runtime Notes

Runtime configuration and experiment data are loaded from Firestore, not local static JSON.

Primary documents and grouped data:

- `MasterData/centralConfig`
- `MasterData/tutorialConfig`
- `MasterData/cities`
- `MasterData/datasets`

The main research protocol has one code-level source of truth in `src/lib/researchStudy.js`:

- protocol version `bundlegame_abc_50_round_v1`
- 50 rounds total
- Phase A rounds 1-15, Phase B rounds 16-35, Phase C rounds 36-50
- recommendation exposure is allowed only in Phase B and only for treatment arms

Runtime loading, Firestore scenario saves, research protocol saves, and analytics now reject mismatched protocol snapshots.

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
- The game is embedded in Qualtrics, so it cannot directly show or click Qualtrics' own Next button. It sends `postMessage` events instead: `mainGameComplete`, `mainGameRecoveryRequired`, and `resultCodeVerificationUpdated`.
- The end screen includes a `Continue to Qualtrics` button that re-sends the completion handoff with `advanceRequested: true` in case the original completion message was missed.

If Qualtrics hides Next on the embedded game page, the Qualtrics question JavaScript must listen for the game message and then show or click Next. Add this in the Qualtrics JavaScript editor for the question that embeds the game, adapting the embedded-data field names and the allowed origin:

```js
Qualtrics.SurveyEngine.addOnload(function () {
  var question = this;
  var allowedOrigin = 'https://YOUR-GAME-HOST';

  question.hideNextButton();

  window.__bundleGameCompletionHandler = function (event) {
    if (event.origin !== allowedOrigin) return;

    var data = event.data || {};
    if (data.source !== 'bundlegame') return;

    var completionTypes = [
      'mainGameComplete',
      'mainGameRecoveryRequired',
      'resultCodeVerificationUpdated'
    ];
    if (completionTypes.indexOf(data.type) === -1) return;

    if (data.resultCode) {
      Qualtrics.SurveyEngine.setEmbeddedData('bundleGameResultCode', data.resultCode);
      Qualtrics.SurveyEngine.setEmbeddedData('bundleGameUserId', data.userId || '');
      Qualtrics.SurveyEngine.setEmbeddedData('bundleGameSaveStatus', data.saveStatus || '');
    }

    question.showNextButton();

    if (
      data.advanceRequested
      && data.type === 'mainGameComplete'
      && typeof question.clickNextButton === 'function'
    ) {
      question.clickNextButton();
    }
  };

  window.addEventListener('message', window.__bundleGameCompletionHandler);
});

Qualtrics.SurveyEngine.addOnUnload(function () {
  if (window.__bundleGameCompletionHandler) {
    window.removeEventListener('message', window.__bundleGameCompletionHandler);
    window.__bundleGameCompletionHandler = null;
  }
});
```

### Qualtrics Response Sync

The admin dashboard can join completed game runs to completed Qualtrics responses. Keep Qualtrics credentials private; never add the API token to a `VITE_` variable.

1. Rotate any API token that has been pasted into chat or committed anywhere.
2. In `.env`, set:
   - `QUALTRICS_API_TOKEN`
   - `QUALTRICS_DATACENTER_ID` such as `iad1`
   - `QUALTRICS_SURVEY_ID` such as `SV_...`
3. In the Bundlegame Qualtrics survey flow, add embedded data fields:
   - `bundleGameUserId`
   - `bundleGameResultCode`
   - `bundleGameSaveStatus`
4. In the Qualtrics question that embeds the game, use the postMessage listener above so those embedded fields are populated.
5. After responses are recorded, run:

```bash
npm run qualtrics:sync
```

The sync script exports completed survey responses from Qualtrics, normalizes the embedded game fields, and writes rows to `QualtricsResponses` plus a run log in `QualtricsSyncRuns`. If API sync is unavailable, `/admin` also has an **Import Qualtrics CSV** fallback. The Scores table only includes students with both a completed game run and a matched completed Qualtrics response.

To export the class spreadsheet and its separate class-average summary, run:

```bash
npm run scores:export
```

This writes `bundlegame-scores-YYYY-MM-DD.csv` and `bundlegame-score-class-averages-YYYY-MM-DD.csv` under `data analysis/`. The admin `total_score` is a class-facing composite, not the primary paper metric; see [docs/current/VENUE_POSITIONING_AND_SCORING.md](docs/current/VENUE_POSITIONING_AND_SCORING.md).

Research exports are available as explicit modes:

```bash
npm run scores:export -- --mode raw_research_export
npm run scores:export -- --mode publication_export
```

`raw_research_export` keeps operational IDs for internal QA. `publication_export` writes pseudonymous participant IDs and excludes names, result codes, Qualtrics IDs, and raw survey fields. Set private `PUBLICATION_PSEUDONYM_SALT` to keep publication pseudonyms stable across exports.

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

- Run `npm run verify` or `make ci`
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

- `/downloader` exports participant data for Firebase users with the `admin` custom claim
- `/admin/live` provides the classroom leaderboard and live class-session controls
- `/admin/analysis` provides live analytics and model-ready exports

See [docs/current/ANALYTICS_AND_RL_EXPORTS.md](docs/current/ANALYTICS_AND_RL_EXPORTS.md) for export details.
