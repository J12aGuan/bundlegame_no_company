# BundleGame Export — Data Dictionary

**Source:** `supplied_json`  |  **Dataset root:** `mainGame`  |  **Snapshot id:** `mainGame_2026_03_20_14_26_36`
**Protocol:** `bundlegame_abc_50_round_v1` (`bundlegame_abc_recommendation_v1`), 50 rounds, Phase A 1–15 (rec OFF), B 16–35 (rec by arm), C 36–50 (rec OFF).

All modeled-time and score values are produced by the repo's own reward model
(`publishing/data_analysis/analytics_v1/analytics/model/time_model.py` + `scorer.py`). This
export only *decomposes* the modeled time into reported components; it does not
re-invent the scoring.

## Reward model (how score & the deadline term work)
* **Per-order modeled time** = `estimatedTime + cityTravelTime`, where
  `cityTravelTime` comes from `MasterData/cities.travelTimes` (same-city = 0).
* **Bundle modeled time** = Σ(order times) − shared-item savings, where savings
  come from store overlap: redundant item-pick walk savings plus a
  `0.25×` reduction on within-store local travel
  (`calculate_shared_item_travel_savings`).
* **Score** = `earnings / modeled_time` (`compute_score`). Higher is better.
* **Deadline / on-time term:** the reward used for scoring is **continuous**
  (earnings-per-time); it does **not** subtract a deadline penalty. The
  **on-time / success outcome is modeled as a separate BINARY flag** (`success`),
  recorded per round in the participant's `round_summary`. The continuous score
  and the binary success outcome are independent columns — downstream code
  decides whether to gate score/regret on `success`. (This export reports modeled
  regret/score-ratio for every round regardless of `success`, with `success`
  alongside, so failed rounds can be filtered downstream.)

## Time-component identity
For every bundle: `total = effective_pick + local_travel + cross_city` and
`travel = local_travel + cross_city`. `shared_item_savings` is reported as the
savings amount netted out (so gross time = total + shared_item_savings). When a
store grid is unavailable the pick/local split is left empty (rare; flagged in
`qa_notes`).

## `rounds.csv` — one row per (user × round)
| column | type | units | provenance |
|---|---|---|---|
| user_id | str | — | `Users/{id}` → salted SHA-256 (`u_<16hex>`) |
| round_index | int | — | `round_summary.round_index` |
| phase | str A/B/C | — | derived from round (1–15/16–35/36–50); `round_summary.phase`/`scenario.phase` |
| scenario_id | str | — | `round_summary.scenario_id` / scenario lookup |
| chosen_orders | json[str] | — | `round_summary.chosen_orders` |
| bundle_size | int | orders | `len(chosen_orders)` (derived) |
| success | 0/1 | — | `round_summary.success` (binary on-time/complete outcome) |
| earnings | float | game-$ | `round_summary.earnings` (canonical Σ order.earnings) |
| duration | float | seconds | `round_summary.duration` (decision latency) |
| regret_to_best | float | ratio | derived `1 − chosen_score/oracle_score` |
| score_ratio_to_best | float | ratio | derived `chosen_score/oracle_score` |
| exact_optimal | 0/1 | — | chosen order-set == oracle order-set |
| near_optimal | 0/1 | — | `score_ratio ≥ 0.95` |
| policy_arm | str | — | `round_summary.policy_arm` (empty in SAMPLE) |
| recommendation_source | str | — | `round_summary.recommendation_source` (empty/none in SAMPLE) |
| shown_recommendation_bundle_ids | json[str] | — | `round_summary.shown_recommendation_bundle_ids` (empty in SAMPLE) |
| decision_source | str | — | `round_summary` or `action_summary_reconstructed` |
| timestamp_available | 0/1 | — | whether a usable timestamp existed (QA gate input) |
| legal_action_mask_version | str | — | `round_summary.legal_action_mask_version` |
| dataset_snapshot_id | str | — | scenarioSetVersionId / dataset root |
| chosen_total_time_seconds | float | s | decompose(chosen) total modeled time |
| chosen_travel_time_seconds | float | s | local + cross-city |
| chosen_local_travel_time_seconds | float | s | est-time minus pick, net of overlap savings |
| chosen_cross_city_travel_time_seconds | float | s | `get_cross_city_extra_time` summed |
| chosen_effective_pick_time_seconds | float | s | item-pick walk, net of redundant-pick savings |
| chosen_shared_item_savings_seconds | float | s | overlap savings netted from chosen bundle |
| chosen_ending_city | str | — | city of last order in delivery sequence |
| oracle_* (same six + ending_city) | float/str | s | decompose(oracle = regret==0 legal bundle) |

## `candidates.csv` — one row per (user × round × candidate bundle)
Every legal single-store bundle (`legal_bundle_mask_v1`: size 1..`max_bundle`,
one store) plus the participant's chosen bundle if it was illegal. Scored at the
participant's carried `current_city`, so candidate scores are genuinely per-user.
Columns: user_id, round_index, phase, scenario_id, bundle_id
(`<scenario>::<sorted order sig>`), order_ids(json), is_chosen(0/1),
is_oracle(0/1), legal(0/1), score, earnings, total_time_seconds,
travel_time_seconds, local_travel_time_seconds, cross_city_travel_time_seconds,
effective_pick_time_seconds, shared_item_savings_seconds, ending_city,
regret_to_best, score_ratio_to_best.
**Invariant:** exactly one `is_chosen==1` and exactly one `is_oracle==1` per
(user, round).

## `scenarios.csv` — one row per (round × scenario)
round_index, scenario_id, phase, order_ids(json), max_bundle, classification,
score_gap (`best_score − second_best_score` from `optimal[]`), relative_gap
(`score_gap/best_score`), n_orders, n_distinct_stores, n_distinct_cities,
store_overlap_flag (a store hosts ≥2 menu orders), dispersion_flag (≥2 cities),
recommendations_enabled. Companion tables: `orders.csv` (per-order
store/city/items/earnings/estimatedTime/localTravelTime), `stores.csv` (store grid
metadata), `travel_matrix.csv` (cross-city travel-time matrix from
`MasterData/cities`). Together these let downstream verify the intended 2×2 of
store-overlap × spatial-dispersion.

## `participants.csv` — de-identified
user_id (salted SHA-256), arm (`round_summary.policy_arm` or `unknown`),
completed (`summary.completedGame`), n_rounds_completed
(`summary.roundsCompleted`), n_rounds_observed (rounds seen in this export),
expected_total_rounds (50), dataset_snapshot_id, cohort (non-PII tag).
**Stripped:** emails, names, Qualtrics ids/free-text, IPs, raw timestamps.

## Empty / unpopulated target fields (and why)
* `policy_arm`, `recommendation_source`, `shown_recommendation_bundle_ids`,
  `arm` — empty/`unknown`: this dataset is **baseline/unaided** with no Phase-B
  treatment arms run, so no recommendation labels exist. See `QUALITY_REPORT.md`.
* `score_gap`/`relative_gap` — the dataset `optimal[]` block stores best/second
  bundle *ids* but not scores, so these are **derived** by scoring every legal
  bundle at the dataset starting location and taking the top-two score gap.
* pick/local split columns — empty only if a bundle's order is missing from the
  menu or a store grid is unavailable (rare; flagged in `qa_notes`).

<!-- BEGIN SUPPLEMENTARY EXPORTS (add_exports.py) -->
## Supplementary exports (decision-quality robustness)

Added by `publishing/export_for_analysis/add_exports.py` (commit `17989b5`). Pure transforms
of logged Firestore data — join to `rounds.csv`/`candidates.csv` on `user_id`
(+ `round_index` / `scenario_id`). `user_id` is the SAME salted SHA-256 pseudonym
as the core files. "EMPTY" below = not present in Firestore, emitted blank (never imputed).

### `events.csv` — one row per UI interaction (27256 rows)
Provenance: `Users/{id}/DetailedAction/actions` → `detailedActionsByScenarioSetVersionId[ver].actionsByScenarioId[scenario_id].timeline[]`.
- `user_id`,`round_index`,`scenario_id` — join keys (round resolved from the scenario set).
- `event_index` — 0-based, sorted by event start time within the round.
- `event_type` — mapped vocabulary {order_add, order_remove, submit, reset, other}: select_order→order_add, deselect_order→order_remove, confirm_order→submit, try_again→reset, all else→other.
- `raw_action_type` — exact source `actionType` (19 values incl. `thinking` = deliberation/dwell; kept so no signal is lost).
- `target_type` — screen|order|button|system|item. `order_id` — `targetId` when target is an order, else EMPTY.
- `client_timestamp_ms` — event start on the **session game-clock** (session-relative; absolute wall-clock is NOT exported, for de-identification).
- `ms_since_round_start` — `client_timestamp_ms` minus the round's first event.
Coverage: 85/105 participants have a logged timeline (20 have none).

### `deliberation_round.csv` — one row per (user, round) (1332 rows)
Provenance: derived from `events.csv`. `n_add_events`/`n_remove_events` (select/deselect counts), `n_edits_before_submit`, `n_distinct_bundles_considered` (distinct non-empty selected sets reached), `time_to_first_action_ms`, `time_to_submit_ms` (confirm, relative to round start), `n_thinking_events`/`thinking_ms` (deliberation dwell).

### `round_timing.csv` — one row per (user, round) (155 rows)
Provenance: `round_summary.duration`; DetailedAction timeline (session timing); `Action/actions.timeSummary.idleOrOtherTime`.
- `duration_s` — round_summary.duration. `round_start_ms_session`/`submit_ms_session` — first/last event on session clock. `idle_ms` — timeSummary idle ×1000.
- `active_ms` — **EMPTY**: tab-focus time is NOT logged in Firestore.

### `scenario_design.csv` — one row per scenario_id (all 50)
Provenance: `MasterData/datasets.mainGame` (metadata+orders) and `src/lib/scripts/generateScenarios.js`.
- `intended_difficulty` — **EMPTY**: the generator does NOT target a difficulty. `trap_designed`/`trap_target_amount` — **false/EMPTY**: traps are NOT designed.
- `dispersion_designed` — **true**: dispersion is varied via the per-round city rule. `overlap_designed` — **false**: store overlap is NOT controlled.
- `generator_city_rule` — `random_fair_target_city` (odd rounds) | `anchored_to_prev_best_city` (even rounds) — the generator's only structured variation axis.
- `realized_n_distinct_stores`/`_cities` — computed from the menu's orders (audit). `rng_seed`,`scenario_set_version_id`,`*_version`,`source_file`,`source_commit` — provenance. (Realized overlap/dispersion/score_gap are already in `scenarios.csv`.)

### `survey.csv` — one row per surveyed user (60; de-identified)
Provenance: `QualtricsResponses` (62 docs; 60 join to a logged game user via `user_id`).
- `survey_finished`,`survey_progress`,`survey_duration_seconds` — completion/time.
- `survey_q_<key>` — raw Qualtrics responses kept verbatim: Likert (Q42/Q44/Q50/Q54), comprehension (`comp*`), demographics (age/gender/education/employment), strategy multiple-choice (`post_initialstrategy_*`,`post_finalstrategy_*`), in-survey timing. Map codes via the Qualtrics codebook.
- `self_reported_strategy_text` — **EMPTY (WITHHELD)**: free-text (`post_strategy`/`post_besttip`/`feedback`) withheld pending PII review per `DATA_SCHEMA.md` governance.
- `perceived_difficulty`,`perceived_effort` — **EMPTY**: mapping Q-ids→constructs needs the Qualtrics codebook (not inferred).
- `comprehension_check_passed`,`attention_check_passed` — **EMPTY**: scoring key lives in the Qualtrics design, not Firestore (not inferred).
- WITHHELD raw keys (PII/free-text): ['DistributionChannel', 'EndDate', 'IPAddress', 'LocationLatitude', 'LocationLongitude', 'Q43', 'Q62', 'RecipientEmail', 'RecipientFirstName', 'RecipientLastName', 'RecordedDate', 'ResponseId', 'StartDate', 'bundleGameResultCode', 'bundleGameUserId', 'feedback', 'finishedid', 'location', 'name', 'post_besttip', 'post_strategy', 'userID'].

### `sessions.csv` — one row per user (105)
Provenance: `Users/{id}/Summary.summaryByScenarioSetVersionId[ver]`.
- `total_session_ms` (totalGameTime×1000), `n_rounds_completed` (roundsCompleted), `dropout` (NOT completedGame), `quality_flag_completed_game_mismatch`.
- `device_type`,`browser`,`screen_size` — **EMPTY**: NOT logged. `local_time_of_day` — **EMPTY**: withheld (needs raw wall-clock).

### `practice_rounds.csv` — header only (0 rows)
No practice/tutorial rounds were logged as decisions (all 60 summaries are `mainGame`; the tutorial dataset exists but per-round practice decisions are not recorded). Columns mirror `rounds.csv` + `is_practice`; emitted empty, not imputed.

### `scoring_and_oracle.txt` / `pick_time_rule.txt`
Exact server-side source for (a) bundle score, (b) completion time = pick+local+cross-city−shared savings, (c) oracle/best-second selection, and the per-item pick-time + shared-savings rule — extracted **verbatim at commit `17989b5`** from `src/lib/bundleTime.js` and `src/lib/scripts/generateScenarios.js` (+ the Python mirror `time_model.py`). Confirms the reconstructed score/oracle match the source.
<!-- END SUPPLEMENTARY EXPORTS (add_exports.py) -->

<!-- BEGIN SURVEY CODEBOOK -->
## Survey codebook & comprehension key (metadata only)

Added by `publishing/export_for_analysis/build_codebook.py`. Question wording + answer-option
labels are read VERBATIM from the Qualtrics survey definition
(`survey-definitions/{SURVEY_ID}`), cached to `_raw_pull/qualtrics_survey_definition.json`.
No participant rows, no PII.

### `survey_codebook.csv` - one row per (qualtrics_qid, response_option_index)
`qualtrics_qid` (the export tag, e.g. `post_difficult`, `Q42`; matches the
`survey_q_<qid>` columns in `survey.csv`), `internal_qid`, `question_text`
(HTML stripped), `response_option_index`, `response_option_label`, `note`.
Covers every `survey_q_*` question in `survey.csv` plus the requested items.
Notes: `post_difficult` is a **7-point** scale (Extremely easy..Extremely difficult),
not 1-6. `Q44`/`Q50`/`Q54` are the embedded **best-choice quiz** items (not Likert);
`Q42` is a delivery-platform-use demographic. `question_text` is blank only if a tag
is absent from the survey definition (noted).

### `comprehension_key.csv` - one row per comprehension item
`qid`, `question_text` (from the QSF), `correct_response`, `correct_response_source`,
`note`. **The QSF contains no answer key** (`GradingData` is empty for every graded
item), so `correct_response` is **not** from Qualtrics. It is filled only where the
answer is objectively determined: `game_rule` (comp1, comp3 - from the verified
bundle/earnings rules) or `game_event_log` (comp4, comp5 - from the logged in-game
action vocabulary). `comp2` is left **blank** (`not_recoverable`). Always check
`correct_response_source` before scoring; supply any blank/UI items from the app.
<!-- END SURVEY CODEBOOK -->
