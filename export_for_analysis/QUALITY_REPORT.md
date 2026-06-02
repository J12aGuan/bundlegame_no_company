# BundleGame Export — Quality Report

**Source:** `supplied_json`  |  **Snapshot id:** `mainGame_2026_03_20_14_26_36`
**Generated:** 2026-06-02T09:35:34+00:00

## Totals
| Table | Rows |
|---|---|
| rounds.csv | 1259 |
| candidates.csv | 13436 |
| scenarios.csv | 50 |
| participants.csv | 105 |
| orders.csv | 200 |
| stores.csv | 4 |
| travel_matrix.csv | 12 |

* **Participants:** 105  (completed: 80, partial: 6)
* **Participants with decision rows:** 86
* **Decision rows (rounds):** 1259

## Decision sources & coverage
* Source mix: {"action_summary_reconstructed": 1131, "round_summary": 128}
* Round index range observed: 1–27
* Overall `success` rate in export: 1.0

**Caveat:** 1131 of 1259 rows are `action_summary_reconstructed`
(rebuilt from the compact `Action/orderSummary` logs for participants who predate
the timestamped `round_summary` schema). Per `DATA_SCHEMA.md`, these are **not
equivalent to timestamped rows**: the reconstruction only keeps rounds whose
success is confirmed, so reconstructed rows are all `success=1` and carry no
decision timestamp. For **failure-rate, temporal/learning, or recommendation**
analyses, filter to `decision_source == "round_summary"`. For excess-time
decomposition, per-worker bias logit, clustering, and routing analyses (which use
the modeled chosen/oracle components), both sources are usable.

## Rounds per phase
* From decision rows: {"A": 1092, "B": 167}
* From scenario menu (design coverage): {"B": 20, "A": 15, "C": 15}

## Design coverage — 2×2 (store-overlap × spatial-dispersion)
  - overlap=1, dispersion=0: 25 scenarios
  - overlap=1, dispersion=1: 25 scenarios

**Note:** `store_overlap_flag` is constant (=1) across all scenarios, so the 2×2 of overlap × dispersion is **not fully spanned** — only the dispersion dimension varies. Treat overlap as a fixed design property, not a manipulated factor.

## Candidate invariants (exactly one chosen / one oracle per user×round)
  - (user,round) groups: 1259
  - groups with !=1 is_chosen: 0
  - groups with !=1 is_oracle: 0
* **Invariant holds:** YES

## Per-column missingness (rounds.csv)
  - `regret_to_best`: 2/1259 empty
  - `score_ratio_to_best`: 2/1259 empty
  - `policy_arm`: 1259/1259 empty
  - `recommendation_source`: 5/1259 empty
  - `chosen_total_time_seconds`: 2/1259 empty
  - `chosen_travel_time_seconds`: 2/1259 empty
  - `chosen_local_travel_time_seconds`: 2/1259 empty
  - `chosen_cross_city_travel_time_seconds`: 2/1259 empty
  - `chosen_effective_pick_time_seconds`: 2/1259 empty
  - `chosen_shared_item_savings_seconds`: 2/1259 empty
  - `chosen_ending_city`: 2/1259 empty

## Duplicates handled
* `get_latest_round_summaries` keeps the latest `round_summary` per (participant,
  round); duplicates are logged as `duplicate_round_summary`.
* candidates.csv keys (user_id, round_index, bundle_id) — duplicates: 0

## Non-scoreable chosen bundles
* 2 round(s) have an empty chosen time-component / regret because
  the logged `chosen_orders` included an order id not present in the round's scenario
  menu (so the bundle is not scoreable under the reward model). `success` and
  `chosen_orders` are still recorded; the oracle and candidates for those rounds are
  unaffected.

## Repo QA gates
* `missing_recommendation_labels`: **PRESENT** — no recommendation labels on any row.
* `missing_timestamps`: 1131 round(s) without a usable timestamp.
* `completed_game_mismatch`: 0 participant(s) flagged.

### Other QA notes
  - `duplicate_round_summary`: 4
  - `reconstructed_round_excluded_unconfirmed_success`: 7

## Treatment-awareness
**Treatment-aware dataset (Phase B with real recommendations shown): ABSENT.**
This is a **baseline / unaided-only** export: no rows carry a `policy_arm`, a non-`none` `recommendation_source`, or non-empty `shown_recommendation_bundle_ids`. Per `docs/current/EXPERIMENT_PROTOCOL.md`, do **not** make recommendation-treatment claims from this dataset. It is suitable for Phase-A unaided behavior, excess-time decomposition, per-worker bias logit, clustering, and order-level routing analysis.
