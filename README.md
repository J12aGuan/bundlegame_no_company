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
| 1 | 1-16 | Baseline bundling decisions |
| 2 | 17-33 | With recommendations shown |
| 3 | 34-50 | Mixed scenarios |

---

## Deployment

Auto-deploys to Vercel on push to main branch.

**Node.js Requirement**: >= 18.x

```bash
npm run build    # Build for production
npm run preview  # Preview production build locally
```
