# Configuration System Overview

Understanding how game configuration works and where to find settings.

---

## 🎯 Quick Summary

**All game settings live in ONE place**: [`src/lib/centralConfig.json`](../../src/lib/centralConfig.json)

This includes:
- Game timers (round limits, penalties)
- Orders per round
- Store layouts and distances
- Feature flags (auth, tips, etc.)

**Experiment rounds** (50 rounds with order details) are in a separate file: [`src/lib/bundle_experiment_50_rounds_short_times.json`](../../src/lib/bundle_experiment_50_rounds_short_times.json)

---

## 📁 Configuration Files

| File | Purpose | Edit Frequency |
|------|---------|----------------|
| [`centralConfig.json`](../../src/lib/centralConfig.json) | Main game settings | Medium |
| [`bundle_experiment_50_rounds_short_times.json`](../../src/lib/bundle_experiment_50_rounds_short_times.json) | Experiment rounds | Low |
| [`src/config.json`](../../src/config.json) | Legacy config (compatibility) | Rare |
| [`src/lib/configs/stores1.json`](../../src/lib/configs/stores1.json) | Alternative store config | Rare |

---

## ⚙️ centralConfig.json Structure

### Game Settings (`game` object)

```json
{
  "game": {
    "timeLimit": 1200,        // Total game duration (seconds)
    "roundTimeLimit": 300,    // Per-round time limit (seconds)
    "thinkTime": 10,          // Pre-action thinking time (seconds)
    "penaltyTimeout": 30,     // Penalty duration (seconds)
    "ordersShown": 4,         // Orders displayed per round
    "gridSize": 3,            // Store grid size (3x3)
    "auth": true,             // Authentication required
    "tips": false,            // Show tips feature
    "waiting": false,         // Waiting feature enabled
    "refresh": false,         // Auto-refresh enabled
    "expire": false           // Order expiration enabled
  }
}
```

**Used by**: `bundle.js`, `config.js`, `bundlegame.svelte`

### Store Configurations (`stores` array)

```json
{
  "stores": [
    {
      "store": "Target",
      "city": "Emeryville",
      "items": ["watermelon", "apple", ...],
      "locations": [            // 3x3 grid layout
        ["Entrance", "Watermelon", ""],
        ["Apple", "Pineapple", ""],
        ["Grape", "Banana", ""]
      ],
      "cellDistance": 3000,     // Walk time per aisle (ms)
      "Entrance": [0, 0]        // Entrance position [row, col]
    },
    ...
  ]
}
```

**Used by**: `config.js` (via `storeConfig()` function)

### City Distances (`distances` object)

```json
{
  "distances": {
    "Emeryville": {
      "destinations": ["Berkeley", "Oakland", "Piedmont"],
      "distances": [4, 2, 7]    // Travel time (units)
    },
    ...
  }
}
```

**Used by**: `config.js` (via `getDistances()` function)

### Other Settings

```json
{
  "startinglocation": "Berkeley",  // Starting city
  "conditions": [...]              // A/B test conditions
}
```

---

## 🎮 How Configuration is Used

### 1. Game Logic (`bundle.js`)

```javascript
import centralConfig from './centralConfig.json';

// Extract values
const timeLimit = centralConfig.game.timeLimit;
const ordersShown = centralConfig.game.ordersShown;
const thinkTime = centralConfig.game.thinkTime;
```

### 2. Game UI (`bundlegame.svelte`)

```javascript
import centralConfig from '$lib/centralConfig.json';

const ROUND_TIME_LIMIT = centralConfig.game.roundTimeLimit;  // 300
```

### 3. Config Utilities (`config.js`)

```javascript
import centralConfig from './centralConfig.json';

export const PENALTY_TIMEOUT = centralConfig.game.penaltyTimeout;

export function storeConfig(storeName) {
  return centralConfig.stores.find(s => s.store === storeName);
}
```

---

## 🔄 Changing Configuration

### Method 1: Direct Edit (Recommended)

```bash
# 1. Open config file
code src/lib/centralConfig.json

# 2. Make changes
# Example: Change round time from 300 to 420 seconds
"roundTimeLimit": 420

# 3. Test locally
npm run dev

# 4. Commit and deploy
git add src/lib/centralConfig.json
git commit -m "config: increase round time to 420s"
git push origin main
```

### Method 2: Programmatic (Future)

- Build an admin dashboard that reads/writes `centralConfig.json`
- Allows non-developers to modify settings
- Requires API endpoint to save changes

---

## 📊 Common Configuration Tasks

### Change Round Time Limit
**File**: `centralConfig.json`
**Path**: `game.roundTimeLimit`
**Default**: 300 (5 minutes)

```json
"roundTimeLimit": 420  // Change to 7 minutes
```

### Change Orders Per Round
**File**: `centralConfig.json`
**Path**: `game.ordersShown`
**Default**: 4

```json
"ordersShown": 5  // Show 5 orders instead of 4
```

### Adjust Store Walk Time
**File**: `centralConfig.json`
**Path**: `stores[].cellDistance`
**Default**: Varies (1000-3000ms)

```json
{
  "store": "Target",
  "cellDistance": 2500  // Change from 3000 to 2500ms
}
```

### Modify City Distances
**File**: `centralConfig.json`
**Path**: `distances.<city>.distances`

```json
{
  "Emeryville": {
    "destinations": ["Berkeley", "Oakland", "Piedmont"],
    "distances": [5, 3, 8]  // Change from [4, 2, 7]
  }
}
```

---

## 🧪 Experiment Configuration

### Round Scenarios

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

**Structure**:
```json
[
  {
    "round": 1,
    "phase": "A",
    "scenario_id": "A01",
    "max_bundle": 3,
    "store_travel_time_s": 4,
    "base_store_time_s": 2,
    "per_aisle_time_s": 2,
    "orders": [
      {
        "id": "R1_A",
        "store": "Target",
        "city": "Emeryville",
        "earnings": 18,
        "aisles": [1, 2],
        "travel_time_s": 4,
        "recommended": false
      },
      ...
    ],
    "optimal": {...},
    "second_best": {...}
  },
  ...
]
```

**See**: [PARAMETERS.md](PARAMETERS.md) for detailed explanation

---

## 🔒 Configuration Best Practices

### 1. Test Changes Locally First
```bash
# Always test before deploying
npm run dev
# Play through a few rounds to verify changes
```

### 2. Backup Before Major Changes
```bash
cp src/lib/centralConfig.json src/lib/centralConfig.backup.json
```

### 3. Document Changes
```bash
# Use clear commit messages
git commit -m "config: increase round time for pilot study"
```

### 4. Validate JSON Syntax
```bash
# Use jq to validate JSON
jq . src/lib/centralConfig.json

# Or use online validator
# https://jsonlint.com/
```

### 5. Keep Defaults Documented
- Document default values in this guide
- Note what settings were used for each study
- Keep a changelog of config changes

---

## ⚠️ Common Pitfalls

### 1. Invalid JSON Syntax
**Problem**: Missing comma, extra comma, unquoted key
**Solution**: Use a JSON validator before committing

### 2. Wrong Units
**Problem**: Mixing seconds and milliseconds
**Solution**: Check documentation for each field
- `timeLimit`, `roundTimeLimit`, `penaltyTimeout` → **seconds**
- `cellDistance` → **milliseconds**

### 3. Requires Redeploy
**Problem**: Changes don't appear immediately in production
**Solution**: Remember this is a static site - must redeploy

### 4. Breaking Store Layouts
**Problem**: Invalid grid structure
**Solution**: Keep grid rectangular, use "" for empty cells

---

## 🗺️ Configuration Flow

```
Developer edits centralConfig.json
              ↓
Commits and pushes to GitHub
              ↓
Vercel detects push and rebuilds site
              ↓
Build process bundles config into static files
              ↓
New config is live on production
              ↓
Participants see new settings on next visit
```

---

## 📚 Related Documentation

- **Detailed config reference**: [CENTRALIZED_CONFIG.md](CENTRALIZED_CONFIG.md)
- **Parameter guide**: [PARAMETERS.md](PARAMETERS.md)
- **Architecture**: [../architecture/OVERVIEW.md](../architecture/OVERVIEW.md)
- **Code organization**: [../architecture/CODEMAP.md](../architecture/CODEMAP.md)

---

## 📞 Questions?

- **Config issues**: Contact Nicholas Chen: PARKSINCHAISRI@gmail.com
- **Experiment design**: See [../experiment/EXPERIMENT_DESIGN.md](../experiment/EXPERIMENT_DESIGN.md)

---

*Configuration is version-controlled and should be treated like code!*
