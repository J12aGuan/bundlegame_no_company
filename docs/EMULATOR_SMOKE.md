# Local emulator smoke-test (track B)

Run the REAL participant game (`src/routes/+page.svelte`) end to end against a LOCAL
Firestore emulator, with the CHI dynamic dataset, without touching the production project
(`bundling-63c10`). This closes the verification gap the sandboxes cannot: that the in-app
Firestore persistence (`phase_a_survey`, `diagnosis_history`) and the reactive diagnosis
timing (`runChiDiagnosisForRound` at r15/r25/r35) work in the browser, not just in tests.

Nothing here writes to production, flips the default `scenario_set`, or deploys. Those stay
deliberate, separately-triggered steps (track A).

## Prerequisites

- `firebase-tools` (the only thing not already installed): `npm i -g firebase-tools`.
- Java (the Firestore emulator needs it) — already present.
- `firebase` and `firebase-admin` are already project dependencies.

## The emulator hook

`src/lib/firebaseConfig.js` connects the browser app (game **and** admin masterdata UI) to
the local emulators **only** when `VITE_USE_FIREBASE_EMULATOR === "true"`. A normal build or
deploy leaves it unset, so production is never affected. Ports are configurable
(`.env.example`) and default to the `firebase.json` emulators block (Firestore 8080, Auth
9099, UI 4000). When active the console logs a loud `[firebase] EMULATOR MODE` line so it is
unmistakable the app is on local data.

## Steps

1. **Enable the hook.** In `.env`:

   ```
   VITE_USE_FIREBASE_EMULATOR=true
   ```

2. **Start the emulators** (terminal A):

   ```
   firebase emulators:start
   ```

   To get a faithful full smoke (the game UI also needs stores / cities / emojis / tutorial
   config / central config, not just the CHI menus), start from a masterdata snapshot:

   ```
   firebase emulators:start --import=./emulator-data --export-on-exit
   ```

   Populate `./emulator-data` once from an existing export (the repo's admin export scripts,
   or `firebase emulators:export ./emulator-data` from a session you have seeded by hand).
   A bare emulator with only the CHI dataset (step 3) exercises the persistence + diagnosis
   wiring but will not fully render the game UI.

3. **Seed the CHI dataset into the emulator** (terminal B). This uses the Firebase Admin SDK
   pointed at the emulator (bypasses security rules, never reaches prod):

   ```
   node scripts/seed-emulator.mjs
   # or: node scripts/seed-emulator.mjs --version=chi_dynamic_v1 --port=8080
   ```

   It validates the payload (in-memory and after a rehydrate round-trip) and writes
   `MasterData/datasets -> datasets.chi_dynamic_v1` (35 scenarios, 99 orders) — the same doc
   `getExperimentScenarios("chi_dynamic_v1")` reads. If it hangs, the emulator is not running.

4. **Point the app at it.** In the admin masterdata / config UI (now running against the
   emulator at the dev URL), set central config `scenario_set = chi_dynamic_v1`. Setting it
   through the UI runs the app's research-protocol validation; do not hand-edit the
   `centralConfig` doc, which would skip that check.

5. **Play the real game** (terminal C):

   ```
   npm run dev
   ```

   Open the participant route and play all 35 rounds.

## Smoke checklist

Confirm, in the running app + the Emulator UI (http://127.0.0.1:4000):

- the Phase-A survey interstitial appears after round 15 and writes `phase_a_survey` to the
  participant doc;
- `diagnosis_history` gains an entry at r15 (on survey submit), r25, and r35;
- counterfactual feedback renders in the ON blocks (16-20, 26-30) and NEVER in Phase A or
  the OFF blocks (21-25, 31-35);
- the transfer block (31-35) uses the shifted, novel-store menus;
- the per-round decision logs persist (`Users/<id>/...`).

What this proves: the browser wiring (reactive diagnosis triggers, Firestore persistence,
feedback gating) works against real Firestore semantics. It is NOT efficacy evidence — that
is the human pilot (`docs/PREREGISTRATION_DYNAMIC.md`).

## Verified procedure (2026-06-21) and what it caught

The boot path was driven end to end against the emulator (msedge headless via
`playwright-core`). The reproducible steps:

```
# 1. emulator with permissive local rules (never used for deploy)
./node_modules/.bin/firebase emulators:start --only firestore,auth \
    --config firebase.emulator.json --project demo-bundlegame

# 2. seed the CHI dataset + the minimal masterdata the production game boots on,
#    UNDER THE APP'S projectId namespace (see the gotcha below)
node scripts/seed-emulator.mjs --full --project=<VITE_FIREBASE_PROJECT_ID>

# 3. run the app in emulator mode and open the production route '/'
VITE_USE_FIREBASE_EMULATOR=true npm run dev
```

`seed-emulator.mjs --full` additionally seeds `MasterData/centralConfig`
(`scenario_set=chi_dynamic_v1`, `auth=false`, game settings), the 35-round CHI
`research_protocol` (embedded three ways: central config, dataset `metadata.researchStudy`,
and a `ResearchProtocols` entry), plus `store`/`cities`/`emojis`.

**Namespace gotcha.** The Firestore emulator keys data by projectId even with
`singleProjectMode`. The browser app uses `VITE_FIREBASE_PROJECT_ID` from `.env`; the seeder
defaults to `demo-bundlegame`. If they differ, the app reads an empty namespace
("Central config not found", 0 scenarios). Seed with `--project=<the app's projectId>`.

### Production-path gaps this caught (the dev harness `/chi-play-dev` cannot)

1. **FIXED — `loadGame` rejected the CHI study.** The production game-load path
   (`bundle.js`) called `assertValidResearchProtocolSnapshot` unconditionally; that validator
   is pinned to the canonical 50-round A/B/C design (`bundlegame_abc_50_round_v1`) and threw
   on the 35-round CHI protocol ("must contain 50 scenarios … missing round 36…50"). The fix
   honors the dataset's `skip_protocol_validation` flag here, consistently with the WRITE path
   (`firebaseDB.shouldValidateResearchScenarioDataset`). After the fix the real game boots to
   "Round 1 / 35, Phase A" with the CHI orders. `/chi-play-dev` never calls `loadGame`, so it
   could not surface this.
2. **Canonical protocol still pinned to 50-round A/B/C.** The skip flag lets the CHI dataset
   through, but `BUNDLEGAME_STUDY_PROTOCOL_VERSION` / `…_TOTAL_ROUNDS` and the snapshot
   validator still encode the old design. A clean production deployment should decide whether
   to make the CHI 35-round protocol canonical or keep the skip-flag path. (Not changed here:
   it is a study-definition decision with blast radius across analysis + tests.)
3. **Persistence requires an authenticated participant.** The no-auth entry
   (`startNoAuth`) sets no participant id, so arm assignment is "unassigned · control" (no
   feedback renders) and `saveChiDiagnosis`/`saveChiPhaseASurvey` skip Firestore (empty id) —
   a 35-round no-auth play persisted **0** docs. Verifying live persistence of
   `phase_a_survey` / `diagnosis_history` / per-decision logs needs the authenticated
   participant flow (an auth-emulator user + an `Auth/<token>` doc) and a non-control arm.

## Going to staging / production (track A — your trigger)

Same dataset, real project: seed via the project's writer path (not `seed-emulator.mjs`,
which is emulator-only), set `scenario_set` in central config, smoke the production game,
then `firebase deploy`. Requires credentials and an explicit go; see the deploy notes in
`docs/MODEL_NOTES.md` and the handoff brief.
