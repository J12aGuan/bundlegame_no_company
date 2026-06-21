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

## Going to staging / production (track A — your trigger)

Same dataset, real project: seed via the project's writer path (not `seed-emulator.mjs`,
which is emulator-only), set `scenario_set` in central config, smoke the production game,
then `firebase deploy`. Requires credentials and an explicit go; see the deploy notes in
`docs/MODEL_NOTES.md` and the handoff brief.
