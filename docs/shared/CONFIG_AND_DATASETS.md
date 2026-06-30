# Current Config And Dataset Management

## Source of Truth

Configuration, scenario datasets, and city-travel data are managed in Firestore rather than local static JSON.

Primary runtime documents:

- `MasterData/centralConfig`
- `MasterData/tutorialConfig`
- `MasterData/cities`
- grouped dataset entries under `MasterData/datasets`

The 50-round research protocol is defined in code, not separately in Firestore:

- source of truth: `src/lib/researchStudy.js`
- protocol id: `bundlegame_abc_recommendation_v1`
- protocol version: `bundlegame_abc_50_round_v1`
- total rounds: `50`
- phases: A rounds 1-15, B rounds 16-35, C rounds 36-50
- recommendation exposure: only Phase B can show recommendations, and only treatment arms show them

## MasterData Documents

### `centralConfig`

Holds the main game settings such as timers, penalties, grid size, auth flags, and the active main scenario set.

Important fields:

- `game.timeLimit`
- `game.roundTimeLimit`
- `game.thinkTime`
- `game.penaltyTimeout`
- `game.ordersShown`
- `game.gridSize`
- `scenario_set`
- `research_protocol.protocol_version`
- `research_protocol.expected_total_rounds`
- `research_protocol.phase_plan`
- `research_protocol.recommendation_exposure`

`getCentralConfig()` injects the canonical `research_protocol` block when an older Firestore document does not contain it. `saveCentralConfig()` rejects a mismatched protocol version or total-round count.

### `tutorialConfig`

Holds tutorial-specific timing, feature flags, and the active tutorial scenario set.

### `cities`

This is the canonical source for cross-city travel time.

Expected shape:

```json
{
  "startinglocation": "Berkeley",
  "travelTimes": {
    "Berkeley": {
      "Oakland": 10,
      "Emeryville": 7
    },
    "Oakland": {
      "Berkeley": 10,
      "Piedmont": 5
    }
  }
}
```

Interpretation:

- `startinglocation` is the default starting city used by scenario/admin references.
- `travelTimes[fromCity][toCity]` is the cross-city travel time in seconds.
- Same-city travel is treated as `0`.
- Missing routes should be fixed in `MasterData/cities`; they are not treated as valid zero-travel entries.

### Grouped scenario datasets

Each grouped dataset entry stores:

- `scenarios`: round metadata and `order_ids`
- `orders`: order payloads used by runtime and analytics
- `optimal`: best and second-best bundle references plus candidate-bundle metadata
- `metadata`: generation metadata when present

Generated `scenarios[]` may also include:

- `classification`
- `score_gap`
- `relative_gap`

For non-tutorial research datasets, scenario management validates the dataset against the canonical protocol before saving:

- exactly 50 scenarios
- one scenario for each round 1 through 50
- Phase A on rounds 1-15, Phase B on rounds 16-35, Phase C on rounds 36-50
- no recommendation flags outside the recommendation phase
- dataset protocol metadata, when present, must use `bundlegame_abc_50_round_v1`

The runtime loader and research analysis engine also reject inconsistent snapshots. This prevents a run where docs say 50 rounds but Firestore, dataset metadata, or a saved research protocol says something else.

## Scenario Generation Pipeline

The admin scenario generator lives in `src/lib/scripts/generateScenarios.js`.

Generation is intentionally split into four stages:

- legal bundle enumeration: creates same-store legal bundles without scoring them
- route optimisation: tests every within-bundle delivery sequence and keeps the fastest/highest-reward sequence
- reward modelling: computes pay-per-second score from earnings, local travel, cross-city travel, pick time, and shared-item savings
- scenario metadata: stores phase, model versions, seed, uncertainty flags, and all candidate bundles

Generated `optimal[]` rows now include:

- `candidate_bundles[]`: every legal bundle for the round, sorted by score
- `reward_components`: decomposed best-bundle earnings, travel time, pick time, shared-item savings, regret, and uncertainty flags
- `best_score` and `second_best_score`
- `reward_model_version`
- `route_optimizer_version`
- `legal_bundle_model_version`

Each candidate bundle includes:

- `bundle_ids`
- `delivery_sequence_ids`
- `score`
- `score_ratio_to_best`
- `regret_to_best`
- `earnings`
- `total_time_seconds`
- `travel_time_seconds`
- `local_travel_time_seconds`
- `cross_city_travel_time_seconds`
- `pick_time_seconds`
- `effective_pick_time_seconds`
- `shared_item_savings_seconds`
- `uncertainty_flags`

The admin form exposes a deterministic seed. Reusing the same seed with the same city/store data reproduces the same generated orders and candidate-bundle rankings.

## Order Timing Fields

Important order fields:

- `city`
- `store`
- `earnings`
- `estimatedTime`
- `localTravelTime`
- `items`

Timing semantics:

- `estimatedTime` is the modeled base time stored on the order.
- The current model treats `estimatedTime` as `localTravelTime + pick-item estimate`.
- Modeled order time = `estimatedTime + cityTravelTime`.
- Runtime delivery leg = `localTravelTime + cityTravelTime`.

Example:

- If `Berkeley -> Oakland = 10` in `MasterData/cities`
- And an Oakland order has `localTravelTime = 2`
- Then the runtime delivery leg is `12` if the player begins delivery in Berkeley
- And `2` if the player is already in Oakland

## Admin UI Behavior

Use `src/routes/admin/masterdata/+page.svelte` to manage the current runtime data.

Key admin surfaces:

- Central Config tab: main runtime settings and active dataset selection
- Scenarios tab: scenario rounds, order inspection, solution lookup, and timing validation
- Cities tab: `startinglocation` plus the city-to-city travel matrix editor
- Tutorial Config tab: tutorial settings and active tutorial dataset

Scenario timing validation now checks:

- whether every city used by the active scenario set exists in `MasterData/cities`
- whether the Cities matrix contains every required route between those cities

Order details in admin should be interpreted as:

- `estimatedTime`: modeled base time
- `localTravelTime`: local delivery portion
- city travel: added dynamically from the Cities matrix

## Operational Guidance

- Treat `MasterData/cities` as the authoritative cross-city source for runtime and admin validation.
- Keep order cities aligned with the Cities matrix before collecting data.
- If behavior changes, update this document and [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md) together.
- Archived docs may reference older store-distance or static-config approaches; use them only as legacy reference.
