# BundleGame Export — Data Dictionary

**Source:** `supplied_json`  |  **Dataset root:** `mainGame`  |  **Snapshot id:** `mainGame_2026_03_20_14_26_36`
**Protocol:** `bundlegame_abc_50_round_v1` (`bundlegame_abc_recommendation_v1`), 50 rounds, Phase A 1–15 (rec OFF), B 16–35 (rec by arm), C 36–50 (rec OFF).

All modeled-time and score values are produced by the repo's own reward model
(`data analysis/analytics_v1/analytics/model/time_model.py` + `scorer.py`). This
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
