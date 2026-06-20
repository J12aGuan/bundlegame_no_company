# Live-app wiring tasks for the pilot build (BundleGame)

**Status:** contracts and data shapes VERIFIED by reading the code. This supersedes two earlier drafts that
were wrong about (a) candidates being missing and (b) passing study state as props to the game component.

**Progress:**
- ✅ **Lean pilot DONE and merged** (`main @ 551e223`): W1 + W1a + W4, `marginal` arm only. Counterfactual
  feedback now renders at decision time; CHI decision fields are logged. 41 JS tests green; app builds.
- ⬜ **Remaining:** W2 (post-Phase-A survey screen) and W3 (build choiceSets + run/persist the diagnosis).
- The CHI logic layer + feedback bridge were already done and tested before this (see `marginalFeedback.js`,
  `chiDiagnosis.js`, `chiStudyRuntime.js`, the protocol/scenario rewrite, and both simulation sandboxes).

## Verified facts (read, not inferred)
- Protocol (`buildChiPhasePlan`): A = 15 unaided (`survey_after`, `diagnose_after`); B = 20 in blocks
  B1 on / B2 off (off1, `rediagnose_after`, ends 25) / B3 on / B4 off (transfer_shifted, `rediagnose_after`,
  ends 35). `roundContext` derives phase/block/`feedback_enabled`; `shouldShowSurvey` true at round 15;
  `diagnoseTrigger` -> "initial"/"retune"/"final" at 15/25/35. `feedbackForDecision` returns empty unless
  the round is an ON block, so it is safe to call every confirmed decision.
- Feedback engine: `feedbackForArm(armId, {chosenBundle, legalBundles, diagnosis, labelFor})` in
  `marginalFeedback.js` switches on the arm id; the protocol's CHI arms are exactly `marginal` / `component`
  / `oracle` / `aggregate` / `control` (ids match). `marginalFeedback` reads `deployed_score ?? score`,
  `deployed_total_time_seconds ?? total_time_seconds`, `bundle_ids ?? order_ids`, so it consumes the
  candidate entries directly. It coaches `diagnosis.dominant_weakness`; see the refinement note below.
- Candidates exist at runtime: `getOptimalForScenario(scenarioId).candidate_bundles`. Each entry carries
  `bundle_ids`, `score`, `earnings`, `total_time_seconds`, and the four time components, which include the
  exact five `FEATURE_COLUMNS` the diagnosis needs (`earnings`, `effective_pick_time_seconds`,
  `cross_city_travel_time_seconds`, `local_travel_time_seconds`, `shared_item_savings_seconds`).
- Diagnosis I/O: `runDiagnosis({trigger, round, choiceSets, surveyResponses, surveyQuestions})` returns
  `{dominant_weakness, dominant_label, learning_target, residual, confidence, n_rounds}`. Each `choiceSet`
  must be `{alternatives:[{features:{...5 cols}, chosen:bool, oracle:bool}]}`. There is NO existing builder
  for this shape; W3 builds it.
- Game component: `bundlegame.svelte` is a child of `+page.svelte`, takes NO props (`export let` = none),
  and reads everything from `bundle.js` stores. It owns the confirm point: `saveScenarioProgress`
  (`logRoundCompletion`) then `currentRound.update(r=>r+1)`. The study state lives in stores in
  `bundle.js` (`participantStudyState`, `studyProtocol`) and is rendered by `+page.svelte`
  (`participantStudyState`, `currentRound`, `chiFeedback`).

---

## ✅ W1 - Feedback at decision confirmation (DONE, wired via stores not props)
In `bundlegame.svelte` (`logRoundCompletion`, the confirm point), the chosen orders are matched to a
candidate via a `sortedIdsEqual` helper and `updateChiStudyFeedback({protocol, round, arm, chosenBundle,
legalBundles, diagnosis, labelFor})` is called before the round advances; `clearChiStudyFeedback()` runs in
`onMount` (each round's active phase). `feedbackForDecision` gates to Phase B ON blocks, so no manual guard.
The panel (`ChiFeedbackPanel`) is already rendered in `+page.svelte` and shows once the store is set.

Render timing: feedback for round N (set at confirm) displays on round N+1's decision screen, then clears
when N+1's active phase mounts. Confirm this is the desired UX when running the pilot.

### ✅ W1a - Candidate accessor (DONE)
`getCandidatesForScenario(scenarioId)` in `bundle.js`:
`return getOptimalForScenario(scenarioId)?.candidate_bundles ?? [];`. No field mapping needed.

### Corrections made during W1 (the spec was slightly off)
- `marginalFeedback.js` was NOT null-safe. The pilot's `diagnosis` is `null` (no diagnosis run yet), which
  would have thrown on the first ON-block decision (`null.dominant_weakness`). Hardened `feedbackForArm`,
  the message functions, and the accessors against null diagnosis / null-or-unmatched chosen bundle / empty
  candidates. Behavior is unchanged for valid inputs.
- `labelFor: WEAKNESS_LABEL` is a type mismatch — `WEAKNESS_LABEL` is an object, but `labelFor` is *called*
  to label order ids. The message functions now coerce a non-function `labelFor` back to the default
  `order <id>` labeler, so the call is safe (order ids render plainly).

## ⬜ W2 - Post-Phase-A strategy survey screen
Driven from `+page.svelte`. When `shouldShowSurvey($studyProtocol, $currentRound)` is true (round 15), show
a survey screen rendering `CHI_POST_PHASE_A_SURVEY` (strategy/confidence items with the W1/W2/W3 mapping),
distinct from the existing end-of-game survey. Gate entry to Phase B on submit. On submit, persist (extend
`saveParticipantStudySurveyResponse` with `kind:"phase_a_strategy"`) and trigger W3's first diagnosis.
[Mount point: the in-game branch of `+page.svelte`, between the `{#if !started}` screen and the
`{#if $GameOver}` screen, as an interstitial that blocks the game view until submitted.]

## ⬜ W3 - Build choiceSets, run + persist the diagnosis (the dynamic loop)
Driven from `+page.svelte`, reacting to `$currentRound`. When `diagnoseTrigger($studyProtocol, $currentRound)`
is non-null (15/25/35):
1. BUILD `choiceSets` from each completed UNAIDED round (Phase A 1-15, OFF blocks 21-25 / 31-35). For each,
   take the candidate set (`getCandidatesForScenario(scenarioId)`) and the saved `chosen_orders` (from the
   round summaries), and map:

       alternatives = candidates.map(cb => ({
         features: {
           earnings: cb.earnings,
           effective_pick_time_seconds: cb.effective_pick_time_seconds,
           cross_city_travel_time_seconds: cb.cross_city_travel_time_seconds,
           local_travel_time_seconds: cb.local_travel_time_seconds,
           shared_item_savings_seconds: cb.shared_item_savings_seconds,
         },
         chosen: sameIdSet(cb.bundle_ids, chosenOrderIds),
         oracle: sameIdSet(cb.bundle_ids, scenario.best_bundle_ids),
       }));

   Never include ON-block (aided) rounds.
2. `runDiagnosis({ trigger, round, choiceSets, surveyResponses, surveyQuestions })` (survey from W2,
   questions = `CHI_POST_PHASE_A_SURVEY`).
3. Persist: append the return to `participantStudyState.diagnosis_history` and write to Firestore (add the
   field to the `researchStudy.js` study-state normalizers and a `saveChiDiagnosis(record)` in `bundle.js`).
   The latest entry feeds W1's `diagnosis`; the round-25 re-diagnosis re-targets ON block 2 (26-30).

## ✅ W4 - Scoring and decision logging (DONE, extended not duplicated)
`decisionLogRecord(...)` is computed at confirm and its fields (`block`, `test_set`, `violation_label`,
`best_improving_move`, `feedback_text`) plus `roundScore`'s `deployed_score` / `score_ratio` (modeled time)
are merged into the existing per-round `saveScenarioProgress` row. Outside Phase B ON blocks these are
`none`/empty. Still TODO for the full study: surface `optimalRate`/`optimalRateBonus` and write
`participantLogRecord` (survey + `diagnosis_history` + decisions) at completion for the analysis export.

---

## Refinement (coaching target) - OPEN
`feedbackForArm` uses `diagnosis.dominant_weakness` as the coached attribute, but `diagnose()` also returns
`learning_target`, and `DEFAULT_COACHABLE=[W1,W3]` means cross-city (W2) is reported but never coached
(it is poorly identified). For W2/W3, make `componentFeedbackMessage` and the marginal emphasis use
`learning_target`, not the raw dominant, so a cross-city-dominant participant is still coached on
picking/payout. (Irrelevant for the lean pilot, where `diagnosis` is null.)

## Resolved during inspection (previously open)
- `chosen_orders` is `chosenOrderIds`, a plain order-id array, available at the confirm point in
  `bundlegame.svelte`. Match it to candidate `bundle_ids` with a sorted-id-set compare; no normalization
  needed (now done by `sortedIdsEqual`).
- Candidate `score` is `totalEarnings / modeledTime` (generateScenarios), i.e. the deployed efficiency rate,
  so the violation DV is on deployed scoring.
- The Phase-A survey mounts as an interstitial inside the in-game branch of `+page.svelte`, gated on
  `shouldShowSurvey($studyProtocol, $currentRound)`, blocking entry to Phase B until submitted.
- `diagnosis_history` exists only in `participantLogRecord` (`chiStudyRuntime`); it is NOT in the
  study-state normalizer, so W3 must add it to the `researchStudy.js` study-state schema to persist and
  restore it across reloads. (In the lean pilot it resolves to `null`, which `marginalFeedback` tolerates.)

## Staging
- ✅ Lean pilot first: W1 + W1a + W4, marginal arm only (no diagnosis needed for the marginal message to
  render). **Done.**
- ⬜ Then W2 + W3 for the survey, targeting, and dynamic loop.
- ⬜ Full study adds control / aggregate / oracle.

## Acceptance checks
- ✅ Feedback only after confirmation and only in ON blocks (16-20, 26-30); none in Phase A or OFF
  (unit-tested; behavioral render still to confirm in the running app).
- ✅ Marginal message shows the true best one-step move with actual numbers; nothing when one-step-optimal.
- ⬜ Survey at round 15, saved, gating Phase B. Diagnosis persisted after 15/25/35; ON block 2 coaches the
  round-25 target; mid-study reload restores arm + diagnosis history.
- ✅ JS tests stay green (now 41, was 40).
