# Centralized Configuration

All game settings are now consolidated in a single file for easy management.

---

## 📍 Location

**File:** [src/lib/centralConfig.json](src/lib/centralConfig.json)

This single JSON file contains all configurable game parameters, store layouts, and city distances.

---

## 📝 Configuration Structure

```json
{
  "game": {
    "timeLimit": 1200,          // Total game duration (seconds)
    "roundTimeLimit": 300,      // Per-round time limit (seconds)
    "thinkTime": 10,            // Think time before actions (seconds)
    "penaltyTimeout": 30,       // Penalty duration (seconds)
    "ordersShown": 4,           // Number of orders per round
    "gridSize": 3,              // Store grid dimensions (3x3)
    "auth": true,               // Authentication required
    "tips": false,              // Show tips feature
    "waiting": false,           // Waiting feature
    "refresh": false,           // Auto-refresh
    "expire": false             // Order expiration
  },

  "stores": [                   // Array of store configurations
    {
      "store": "Target",
      "city": "Emeryville",
      "items": [...],           // Available items
      "locations": [...],       // Store layout grid
      "cellDistance": 3000,     // Walk time per aisle (ms)
      "Entrance": [0, 0]        // Entrance position
    },
    ...
  ],

  "distances": {                // Inter-city travel distances
    "Emeryville": {
      "destinations": ["Berkeley", "Oakland", "Piedmont"],
      "distances": [4, 2, 7]
    },
    ...
  },

  "startinglocation": "Berkeley"
}
```

---

## 🔧 How It's Used

### Files Updated to Use Central Config:

1. **[src/lib/bundle.js](src/lib/bundle.js:47)**
   - Imports: `ordersShown`, `timeLimit`, `thinkTime`, etc.
   - Used for game logic and round management

2. **[src/lib/config.js](src/lib/config.js:10)**
   - Imports: `PENALTY_TIMEOUT`
   - Used for penalty calculations

3. **[src/routes/bundlegame.svelte](src/routes/bundlegame.svelte:50)**
   - Imports: `ROUND_TIME_LIMIT`
   - Used for round countdown timer

---

## ✏️ Making Changes

### 1. Edit the File Directly

```bash
# Open in editor
code src/lib/centralConfig.json

# Make your changes
# Save the file

# Test locally
npm run dev

# Commit and deploy
git add src/lib/centralConfig.json
git commit -m "Update game configuration"
git push origin main
```

### 2. Common Changes

**Increase round time:**
```json
"roundTimeLimit": 300  →  "roundTimeLimit": 420
```

**Change orders per round:**
```json
"ordersShown": 4  →  "ordersShown": 5
```

**Adjust store walk time (Target):**
```json
"cellDistance": 3000  →  "cellDistance": 2500
```

**Modify city distances:**
```json
"Emeryville": {
  "destinations": ["Berkeley", "Oakland", "Piedmont"],
  "distances": [4, 2, 7]  →  "distances": [5, 3, 8]
}
```

### 3. Validation

After editing, validate JSON syntax:
```bash
# Using jq (if installed)
jq . src/lib/centralConfig.json

# Or use an online validator:
# https://jsonlint.com/
```

---

## ⚠️ Important Notes

1. **JSON Syntax**: One mistake breaks the entire config. Always validate.

2. **Requires Redeploy**: Changes only apply after:
   - Restarting dev server (`npm run dev`)
   - OR deploying to production

3. **Arrays Use 0-Index**:
   - `"Entrance": [0, 0]` means row 0, column 0
   - Store grids start at position [0, 0]

4. **Times in Different Units**:
   - Game/round timers: **seconds**
   - Cell distances: **milliseconds**

5. **Backward Compatibility**: Old config files still exist:
   - `src/config.json`
   - `src/lib/configs/stores1.json`

   These are kept for reference but no longer actively used.

---

## 🎯 Quick Reference

| Setting | Default | Range |
|---------|---------|-------|
| `timeLimit` | 1200s (20 min) | Any positive integer |
| `roundTimeLimit` | 300s (5 min) | Any positive integer |
| `thinkTime` | 10s | 0-60 recommended |
| `penaltyTimeout` | 30s | Any positive integer |
| `ordersShown` | 4 | 1-10 recommended |
| `gridSize` | 3 | 2-5 recommended |
| `cellDistance` | 1000-3000ms | Any positive integer |
| City distances | Varies | Any positive integer |

---

## 📚 Related Files

- **Experiment Rounds**: [src/lib/bundle_experiment_50_rounds_short_times.json](src/lib/bundle_experiment_50_rounds_short_times.json)
  - Contains all 50 round scenarios (separate from config)
  - Edit this for order details, earnings, AI recommendations

- **Legacy Configs**: `src/config.json`, `src/lib/configs/*.json`
  - Kept for backward compatibility
  - Not actively used by the game

---

## 💡 Tips

- **Backup before editing**: `cp src/lib/centralConfig.json backup.json`
- **Test locally first**: Always test with `npm run dev` before deploying
- **Use version control**: Git tracks all changes to the config
- **Document changes**: Add clear commit messages when updating config

---

## 📞 Questions?

Contact: Nicholas Chen (nchen06@berkeley.edu)
