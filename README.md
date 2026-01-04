# Bundle Game - Delivery Efficiency Experiment

A SvelteKit-based delivery simulation game for researching order bundling decision-making.

## Quick Start

```bash
npm install
npm run dev
```

---

# CONFIGURATION GUIDE

This guide documents **ALL configurable parameters** for customizing experiments.

---

## 1. ROUND TIME LIMIT

**File**: `src/routes/bundlegame.svelte` (line ~50)

```javascript
const ROUND_TIME_LIMIT = 300; // seconds per round
```

Change this value to adjust how long players have per round.

---

## 2. EXPERIMENT SCENARIOS (Main Configuration)

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

This is the **main experiment data** containing 50 rounds across 3 phases.

### Round Structure:
```json
{
  "round": 1,
  "phase": 1,
  "max_bundle": 2,
  "orders": [...],
  "optimal": {...},
  "second_best": {...}
}
```

### Round Parameters:

| Parameter | Description |
|-----------|-------------|
| `round` | Round number (1-50) |
| `phase` | Experiment phase (1, 2, or 3) |
| `max_bundle` | Maximum orders that can be bundled together |
| `orders` | Array of available orders for this round |
| `optimal` | The mathematically optimal bundle choice |
| `second_best` | The second-best bundle choice |

### Order Object Fields:
```json
{
  "id": 1,
  "store": "A",
  "city": "Maplewood",
  "earnings": 15,
  "aisles": [1, 3, 5],
  "travel_time_s": 120,
  "recommended": true
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique order identifier |
| `store` | Store name (must match stores config) |
| `city` | Delivery destination city |
| `earnings` | Dollar amount earned for completing order |
| `aisles` | Array of aisle numbers to visit in store |
| `travel_time_s` | Total travel time in seconds |
| `recommended` | Whether to show recommendation star badge |

---

## 3. STORE CONFIGURATIONS

**File**: `src/lib/configs/stores1.json`

### cellDistance (Aisle Movement Time)
```json
{
  "Store A": {
    "cellDistance": 2000
  }
}
```

`cellDistance` = milliseconds to move between aisles. The countdown timer uses this value.

### City Distance Matrix
```json
{
  "distances": {
    "Maplewood": {
      "Riverdale": 180,
      "Sunnyvale": 240
    }
  }
}
```

Distances are in **seconds**. Determines delivery travel time between cities.

---

## 4. UI SETTINGS

**File**: `src/lib/bundle.js` (line ~17)

```javascript
const ordersShown = 4; // number of order cards displayed
```

---

## 5. PENALTY TIMEOUT

**File**: `src/lib/config.js`

```javascript
export const PENALTY_TIMEOUT = 30; // seconds
```

---

## 6. MAP COORDINATES

**File**: `src/routes/bundlegame.svelte` (line ~60)

```javascript
const cityCoords = {
  "Maplewood": [40.7312, -74.2673],
  "Riverdale": [40.9176, -73.9144],
  "Sunnyvale": [37.3688, -122.0363]
};
```

These are [latitude, longitude] coordinates for the delivery map.

---

## 7. GLOBAL SETTINGS

**File**: `src/config.json`

```json
{
  "timeLimit": 300,
  "thinkTime": 5,
  "gridSize": 5,
  "tips": true,
  "waiting": false,
  "refresh": false,
  "expire": false,
  "auth": false
}
```

| Parameter | Description |
|-----------|-------------|
| `timeLimit` | Overall time limit |
| `thinkTime` | Delay before starting |
| `gridSize` | Store grid dimensions |
| `tips` | Show tutorial tips |
| `waiting` | Enable waiting period |
| `refresh` | Allow page refresh |
| `expire` | Session expiration |
| `auth` | Require authentication |

---

## Quick Reference Table

| Setting | File | Default |
|---------|------|---------|
| Round timer | `bundlegame.svelte` | 300s |
| Aisle move time | `stores1.json` (cellDistance) | 2000ms |
| City distances | `stores1.json` (distances) | varies |
| Orders shown | `bundle.js` | 4 |
| Penalty timeout | `config.js` | 30s |
| Map coordinates | `bundlegame.svelte` (cityCoords) | - |

---

## Phases Overview

| Phase | Rounds | Description |
|-------|--------|-------------|
| A | 1-15 | Baseline bundling decisions |
| B | 16-35 | With recommendations shown |
| C | 36-50 | Post-recommendation behavior |

---

# HOW TO MODIFY EXPERIMENT PARAMETERS

This section provides **step-by-step instructions** for manually changing all experiment settings.

---

## Changing Order Structures

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Each round contains an `orders` array. To modify orders:

```json
{
  "id": "R1_A",           // Unique ID (format: R{round}_{letter})
  "store": "Target",      // Must match a store in stores1.json
  "city": "Emeryville",   // Delivery destination
  "earnings": 18,         // Dollar amount player earns
  "aisles": [1, 2],       // Which aisles to visit (affects pick time)
  "travel_time_s": 4,     // Delivery travel time in seconds
  "recommended": false    // true = shows star badge (Phase B only)
}
```

**To add a new order**: Copy an existing order object, change the `id`, and modify fields.

**To remove an order**: Delete the order object from the `orders` array.

**To change order sequence**: Reorder the objects in the `orders` array.

---

## Changing Delivery Times

### Method 1: Per-Order Travel Time
**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Change `travel_time_s` in each order:
```json
"travel_time_s": 8  // Changed from 4 to 8 seconds
```

### Method 2: City-to-City Distance Matrix
**File**: `src/lib/configs/stores1.json`

```json
"distances": {
  "Emeryville": {
    "destinations": ["Berkeley", "Oakland", "Piedmont"],
    "distances": [4, 2, 7]  // seconds to each destination
  },
  "Berkeley": {
    "destinations": ["Emeryville", "Oakland", "Piedmont"],
    "distances": [4, 5, 4]
  }
}
```

To change: Edit the numbers in the `distances` array (index matches `destinations` array).

---

## Changing Aisle/Shopping Times

### Per-Aisle Time (Experiment Rounds)
**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Each round has timing parameters:
```json
{
  "round": 1,
  "store_travel_time_s": 4,   // Time to travel to store
  "base_store_time_s": 2,     // Base overhead in store
  "per_aisle_time_s": 2,      // Time per aisle visited
  ...
}
```

**Time formula**: `total = store_travel + base_store + (unique_aisles × per_aisle) + delivery`

### Cell Distance (Store Navigation Animation)
**File**: `src/lib/configs/stores1.json`

```json
{
  "store": "Target",
  "cellDistance": 3000  // milliseconds per cell movement
}
```

| Value | Speed |
|-------|-------|
| 1000 | Fast (1s per cell) |
| 2000 | Medium (2s per cell) |
| 3000 | Slow (3s per cell) |

---

## Changing Round Sequence

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

To reorder rounds:
1. Change the `"round"` number in each object
2. Reorder the objects in the array
3. Update `"phase"` if needed ("A", "B", or "C")

Example - swap rounds 1 and 2:
```json
[
  { "round": 1, "phase": "A", "scenario_id": "A02", ... },  // was round 2
  { "round": 2, "phase": "A", "scenario_id": "A01", ... },  // was round 1
  ...
]
```

---

## Adding New Stores

**File**: `src/lib/configs/stores1.json`

Add to the `stores` array:
```json
{
  "store": "Whole Foods",           // Store name
  "city": "Berkeley",               // City location
  "items": ["apple", "bread", "milk"],  // Available items
  "locations": [                    // Grid layout (row by row)
    ["Entrance", "Apple", ""],
    ["Bread", "Milk", ""],
    ["", "", ""]
  ],
  "cellDistance": 2000,             // ms per cell
  "Entrance": [0, 0]                // [row, col] of entrance
}
```

Then add to distances matrix:
```json
"distances": {
  "Berkeley": {
    "destinations": ["Emeryville", "Oakland", "Piedmont", "NewCity"],
    "distances": [4, 5, 4, 3]
  }
}
```

---

## Adding New Cities

1. **Add to stores1.json distances**:
```json
"NewCity": {
  "destinations": ["Emeryville", "Berkeley", "Oakland"],
  "distances": [5, 3, 4]
}
```

2. **Add to bundlegame.svelte cityCoords** (line ~60):
```javascript
const cityCoords = {
  "Emeryville": [37.8313, -122.2852],
  "NewCity": [37.8500, -122.2600]  // Add coordinates
};
```

3. **Update all existing cities' destinations** to include NewCity.

---

## Changing Recommendation Badges

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Set `recommended: true` on orders you want to highlight:
```json
{
  "id": "R16_A",
  "recommended": true   // Shows star badge
},
{
  "id": "R16_B", 
  "recommended": true   // Shows star badge
},
{
  "id": "R16_C",
  "recommended": false  // No badge
}
```

**Note**: Badges are only visible during Phase B rounds.

---

## Changing Max Bundle Size

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Per-round setting:
```json
{
  "round": 5,
  "max_bundle": 2  // Players can only select up to 2 orders
}
```

---

## Changing Round Duration

**File**: `src/routes/bundlegame.svelte` (line ~50)

```javascript
const ROUND_TIME_LIMIT = 300;  // Change to desired seconds
```

| Value | Duration |
|-------|----------|
| 180 | 3 minutes |
| 300 | 5 minutes |
| 600 | 10 minutes |

---

## Changing Number of Orders Shown

**File**: `src/lib/bundle.js` (line ~17)

```javascript
const ordersShown = 4;  // Change to show more/fewer orders
```

---

## Complete Parameter Reference

| Parameter | File | Location | Type | Example |
|-----------|------|----------|------|---------|
| Round duration | `bundlegame.svelte` | line ~50 | seconds | `300` |
| Orders per round | `bundle.js` | line ~17 | number | `4` |
| Aisle walk time | `stores1.json` | `cellDistance` | milliseconds | `2000` |
| Delivery times | `stores1.json` | `distances` | seconds | `[4, 2, 7]` |
| Per-aisle time | experiment JSON | `per_aisle_time_s` | seconds | `2` |
| Store travel time | experiment JSON | `store_travel_time_s` | seconds | `4` |
| Base store time | experiment JSON | `base_store_time_s` | seconds | `2` |
| Order earnings | experiment JSON | `orders[].earnings` | dollars | `18` |
| Order aisles | experiment JSON | `orders[].aisles` | array | `[1, 2, 3]` |
| Max bundle size | experiment JSON | `max_bundle` | number | `3` |
| Recommendation badge | experiment JSON | `orders[].recommended` | boolean | `true` |
| Map coordinates | `bundlegame.svelte` | `cityCoords` | [lat, lng] | `[37.8, -122.2]` |
| Penalty timeout | `config.js` | export | seconds | `30` |

---

## Deployment

Auto-deploys to Vercel on push to main branch.

**Node.js Requirement**: >= 18.x

```bash
npm run build    # Build for production
npm run preview  # Preview production build locally
```
