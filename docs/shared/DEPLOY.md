# Deploy to Vercel against a real Firebase project

This runbook contains no secrets. It lists the names of the settings and environment
variables to configure, and the commands to seed the real project. Set the values in the
Vercel and Firebase dashboards, not in the repo.

## 1. Vercel project settings

The app is a static SvelteKit build (adapter-static) with a SPA fallback, so deep links and
client side routes resolve. `vercel.json` already pins the build command, the output
directory, and the SPA rewrite, so the dashboard can use the defaults. For reference:

- Framework preset: Other (or SvelteKit; `vercel.json` overrides what matters).
- Build command: `npm run build`
- Output directory: `build`
- The SPA fallback is `build/200.html`; `vercel.json` rewrites unmatched paths to it.

### Environment variables to set in Vercel (names only, no values here)

Set these for the Production (and Preview) environment. The build inlines them, so a change
requires a redeploy.

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_MAPTILER_API_KEY` (the map tiles)

Do NOT set `VITE_USE_FIREBASE_EMULATOR`. It must be absent (or anything other than `true`).
When it is unset, the emulator hook is statically false and the emulator connect code is
tree shaken out of the production bundle, so the deployed site always uses real Firebase. You
can confirm this on a local build: `npm run build` then check that the build contains no
`EMULATOR MODE` string.

## 2. Firebase setup

### Authorized domains (Firebase Auth)

The admin and downloader paths use Firebase Auth. Add the deployed domains to Firebase
console, Authentication, Settings, Authorized domains:

- `your-project.vercel.app`
- any custom domain you attach
- preview domains if you use Firebase Auth on previews (the `*.vercel.app` preview hosts)

Participant sign in uses Firestore `Auth/<token>` documents, not Firebase Auth, so it does
not need an authorized domain, but adding the production domain is required for the admin UI.

### Deploy the Firestore security rules and indexes (REQUIRED — do this first)

The participant game persists with NO Firebase Auth user: it writes a few narrow documents
(`Users/<id>/Summary`, `Progress`, `Actions`, the `Auth/<token>` login doc, `PublicResults`,
`LiveSessions` rows) as an anonymous client. The repo `firestore.rules` is written to allow
exactly those narrow shapes and nothing else. If the live project is running any other
ruleset (the Firebase default locked rules, or an older version), every participant write is
rejected with `Missing or insufficient permissions`, the final-results save loops its three
attempts and falls back to the recovery screen, and nothing is recorded. Deploying the rules
is therefore required before the game works at all — seeding the data is not enough.

`firebase.json` already points at `firestore.rules` and `firestore.indexes.json`, so from the
repo root:

    firebase deploy --only firestore:rules,firestore:indexes --project=<real-project-id>

Confirm in the Firebase console (Firestore, Rules tab) that the live ruleset matches the repo
`firestore.rules` (the participant write helpers `participantSummaryWrite`,
`participantRoundActionWrite`, etc. should be present). A quick functional check: log in as a
throwaway participant on the deployed site and confirm the browser console shows
`Summary initialized for <id>` rather than `Error initializing summary: ... insufficient
permissions`.

### Seed the CHI dataset and the minimal masterdata into the REAL project

Use the Admin SDK seeder in live mode. It is strongly guarded so it cannot run by accident:
it needs `CHI_SEED_LIVE=1`, a real `--project`, and ambient admin credentials, and it leaves
`FIRESTORE_EMULATOR_HOST` unset so it writes to the real project.

First authenticate the Admin SDK once, either:

    gcloud auth application-default login

or set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON path (do not commit it).

Then seed:

    CHI_SEED_LIVE=1 node scripts/seed-emulator.mjs --full --live --project=<real-project-id>

`--full` seeds the CHI dataset (`chi_dynamic_v1`: 35 scenarios, the orders) plus the minimal
masterdata the production game boots on: `MasterData/centralConfig`
(`scenario_set=chi_dynamic_v1`, `auth=true`, the 35 round research protocol with the marginal
pilot arm), the `store` aisle grid, `cities`, `emojis`, and a `ResearchProtocols` entry. It
prints what it wrote and reads it back. Omit `--full` to seed only the dataset.

After seeding, the central config `scenario_set` already points at `chi_dynamic_v1`, so the
deployed game loads it. Smoke test the production URL before inviting participants.

Note: the production game load honors the dataset metadata `skip_protocol_validation` flag,
so the 35 round CHI protocol loads even though the canonical validator is still pinned to the
50 round design. That flag is set by the seeder payload.

## 3. Use a dedicated Firebase project for the CHI study

Run the CHI study in its OWN Firebase project, separate from any earlier study. This keeps
the participant data cleanly separated at the project boundary, simplifies access control and
export, and removes any chance of mixing datasets. Every persisted record is also tagged with
`scenario_set_version_id` and the `scenario_set` name (the Summary, each `diagnosis_history`
entry, and each per round Action document), so the data is self identifying even within a
shared project, but a dedicated project is the cleaner separation.

## Quick checklist

1. Vercel: build command, output directory, the `VITE_FIREBASE_*` and `VITE_MAPTILER_API_KEY`
   env vars set, `VITE_USE_FIREBASE_EMULATOR` absent.
2. Firebase: production domain added to Auth authorized domains.
3. Rules: `firebase deploy --only firestore:rules,firestore:indexes --project=<id>` (REQUIRED;
   without this every participant write is rejected and nothing is recorded).
4. Seed: `CHI_SEED_LIVE=1 node scripts/seed-emulator.mjs --full --live --project=<id>` with
   admin credentials.
5. Smoke test the production URL (a throwaway participant should boot into Round 1/35, Phase A,
   the marginal arm, and the console should show `Summary initialized`), then go live.

## If a returning participant is stuck on "Saving Final Results"

A browser that played while the rules/seed were still wrong can hold a stale
`bundlegame:pendingProgressSave` entry in `localStorage` (a `completedGame:true` payload for
the old `mainGame` set). On every later login the app retries that pending save, which is what
shows the full-screen `Saving Final Results — Attempt N of 3` modal and then the recovery
screen. After deploying the rules and reseeding, clear it on that browser: open DevTools
console on the deployed site and run
`localStorage.removeItem('bundlegame:pendingProgressSave')`, then reload. Fresh participants
are unaffected.
