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
(`scenario_set=chi_dynamic_v1`, **`auth=true`** so participant persistence is enabled, game
settings), the 35-round CHI `research_protocol` with **`policy_arms` restricted to `marginal`**
(the marginal-pilot config, so every participant is assigned the feedback arm — embedded three
ways: central config, dataset `metadata.researchStudy`, and a `ResearchProtocols` entry), plus
`cities`/`emojis` and **`store` docs with a pickable aisle grid** (`locations: [{cells:
["Entrance","Apple","Banana"]}]`, small `cellDistance`) — orders with empty items get the
default `{Apple:1, Banana:2}` from `home.svelte`, so the store must contain those item cells or
picking cannot complete.

**Authenticated drive.** With `auth=true`, enter via the User ID + Token form: the token is
`generateAuthToken(id)` (`src/lib/authToken.js`), which `authenticateUser` validates and then
creates the `Auth/<token>` doc — no Firebase-Auth user needed. The driver
(`scripts/drive-emulator-game.mjs <id> <bias>`) authenticates, plays 35 rounds (select per
bias → confirm → grid-pick Apple/Banana → checkout → deliver), answers the r15 survey at the
midpoint (so `diagnosis_history` reflects BEHAVIOUR + the live spanning estimator), and
`scripts/readback-emulator.mjs <id>` dumps the persisted records.

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
3. **RESOLVED — persistence requires an authenticated participant.** The no-auth entry
   (`startNoAuth`) sets no participant id, so persistence is gated off (`saveRoundSummaryAction`
   needs `needsAuth` + id; the CHI saves skip on empty id). With `auth=true` + the
   `generateAuthToken` entry above, a full 35-round authenticated play persists correctly.

### Live algorithm verification (authenticated 35-round walkthroughs)

Four scripted participants (survey answered neutrally, so the read is behavioural) played the
real game to completion; `readback-emulator.mjs` confirmed persistence at
`Users/<id>/Summary/summary → summaryByScenarioSetVersionId.chi_dynamic_v1.researchStudy`
(`phase_a_survey`, `diagnosis_history`) and 35 `Users/<id>/Actions/*` round docs (each with
`round_index`, `scenario_id`, `phase` A/B, `policy_arm=marginal`, `chosen_orders`, `earnings`,
`exact_optimal`/`near_optimal`). The diagnosis fired at r15/r25/r35 every time; the
`diagnosis_history` progression:

| participant (planted) | r15 | r25 | r35 |
|---|---|---|---|
| pick-neglecter | W1 | W1 | W1 |
| **payout-chaser (takes H)** | **W3** | **W3** | none |
| payout-chaser (over-bundles for $) | W1 | W1 | W1 |
| MIX (scripted, keeps over-bundling) | W1 | W1 | W1 |

This is the **Task-1 spanning estimator verified live in production**: an H-taking
payout-overweighter is recovered as **W3 from behaviour** (the case the pooled read misdiagnosed
W1). The planting-sensitivity is real and expected: over-bundling *for earnings* is
observationally pick-neglect, so it reads W1; MIX only re-targets to W3 if the participant
actually corrects picking under coaching, which the scripted driver does not.

### Two further production-path findings (logging, not blocking)

4. **The persisted diagnosis record is trimmed.** `runDiagnosis` (chiStudyRuntime) persists only
   `{trigger, round, dominant_weakness, dominant_label, learning_target, residual, confidence,
   n_rounds}` — it drops `strengths`, `identifiability`, `abstained`, and `spanning_used`.
   `abstained` is inferrable (`learning_target === "none"`), but the per-axis strengths and the
   observability flag are not captured for analysis. Consider widening the persisted record.
5. **The CHI counterfactual feedback is display-only.** `updateChiStudyFeedback` sets the
   `chiFeedback` store (→ `ChiFeedbackPanel`), correctly gated to Phase B ON blocks for the
   marginal arm using the latest diagnosis, but does NOT persist what was shown. The round
   Action log carries only the legacy `recommendation_source` (= `oracle_fallback`, with empty
   `shown_recommendation_bundle_ids`) across Phase B — so the actual `feedback_text` /
   `violation_label` / `best_improving_move` shown to participants is not logged to Firestore.

## Going to staging / production (track A — your trigger)

Same dataset, real project: seed via the project's writer path (not `seed-emulator.mjs`,
which is emulator-only), set `scenario_set` in central config, smoke the production game,
then `firebase deploy`. Requires credentials and an explicit go; see the deploy notes in
`docs/MODEL_NOTES.md` and the handoff brief.
