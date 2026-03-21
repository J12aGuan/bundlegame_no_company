# Current Config and Dataset Management (March 2026)

## Source of Truth

Configuration, scenario datasets, and city-travel data are managed in Firestore rather than local static JSON.

Primary runtime documents:

- `MasterData/centralConfig`
- `MasterData/tutorialConfig`
- `MasterData/cities`
- grouped dataset entries under `MasterData/datasets`

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
- `optimal`: best and second-best bundle references
- `metadata`: generation metadata when present

Generated `scenarios[]` may also include:

- `classification`
- `score_gap`
- `relative_gap`

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
- If behavior changes, update this document and the README `Recent Feature History` table together.
- Archived docs may reference older store-distance or static-config approaches; use them only as legacy reference.
