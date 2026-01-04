# Bundle Game - Delivery Efficiency Experiment# Bundle Game - Delivery Efficiency Experiment# Configuring the Game



A SvelteKit-based delivery simulation game for researching order bundling decision-making.



## Quick StartA SvelteKit-based delivery simulation game for researching order bundling decision-making.## 50-Round Experiment Configuration



```bash

npm install

npm run dev## Quick StartThe game now includes a **50-round experiment** with structured scenarios testing bundling behavior and recommendation systems. This is the primary configuration for research purposes.

```



## Project Structure

```bash### Experiment Overview

```

src/npm install

├── config.json                 # Global game settings

├── routes/npm run dev- **Location**: `src/lib/bundle_experiment_50_rounds_short_times.json`

│   ├── +page.svelte           # Main router (login → game → game over)

│   ├── home.svelte            # Order selection & city navigation```- **Structure**: 50 rounds across 3 phases

│   ├── bundlegame.svelte      # Picking, checkout & delivery

│   └── order.svelte           # Order card component  - **Phase A (Rounds 1-15)**: Baseline - no recommendations

├── lib/

│   ├── bundle.js              # Core game state & logic## Project Structure  - **Phase B (Rounds 16-35)**: System recommends 2-bundles with star badges

│   ├── config.js              # Store/order loading functions

│   ├── bundle_experiment_50_rounds_short_times.json  # Experiment scenarios  - **Phase C (Rounds 36-50)**: Post-recommendation phase

│   └── configs/

│       ├── stores1.json       # Store layouts & city distances```- **Test Scenarios**: Each round includes:

│       ├── stores2.json       # Alternative store config

│       └── order.json         # Order pool (legacy mode)src/  - 3-5 orders with specific store locations and items

```

├── routes/  - Optimal bundle size (1, 2, or 3 orders)

---

│   ├── +page.svelte        # Main router (login → game → game over)  - Recommendation alignment (Phase B only)

## 📋 CONFIGURATION REFERENCE

│   ├── home.svelte         # Order selection & city navigation  - Timing model: 4s travel + 2s overhead + 2s per aisle

This section documents ALL configurable parameters, where to find them, and how to modify them.

│   ├── bundlegame.svelte   # Picking, checkout & delivery

---

│   └── order.svelte        # Order card component### How to Modify Experiment Rounds

### 1. GLOBAL GAME SETTINGS

├── lib/

**File**: `src/config.json`

│   ├── bundle.js           # Core game state & logicTo change what you're testing in specific rounds:

| Parameter | Type | Default | Description |

|-----------|------|---------|-------------|│   ├── bundle_experiment_50_rounds_short_times.json  # Experiment data

| `name` | string | "Phase 1 Lab Configuration" | Configuration name for logging |

| `timeLimit` | number | 1200 | Total game time limit in seconds (legacy mode) |│   └── configs/            # Store configurations1. **Edit the experiment file**: `src/lib/bundle_experiment_50_rounds_short_times.json`

| `thinkTime` | number | 10 | Delay before orders appear (seconds) |

| `gridSize` | number | 3 | Store grid dimensions (3 = 3x3 grid) |└── app.html

| `tips` | boolean | false | Enable declining tip feature |

| `waiting` | boolean | false | Enable waiting period between orders |```2. **Each round has this structure**:

| `refresh` | boolean | false | Enable order refresh mechanism |

| `expire` | boolean | false | Enable order expiration |   ```json

| `auth` | boolean | true | Require user authentication |

## Current Experiment: 50 Rounds, 3 Phases   {

**Example**:

```json     "round": 1,

{

    "name": "My Experiment",The game runs a controlled experiment with 50 rounds across 3 phases:     "phase": "A",

    "timeLimit": 1200,

    "thinkTime": 10,     "scenario_id": "A_1_allsame",

    "gridSize": 3,

    "tips": false,| Phase | Rounds | Recommendations | Purpose |     "orders": [

    "waiting": false,

    "refresh": false,|-------|--------|-----------------|---------|       {

    "expire": false,

    "auth": true| **A** | 1-15   | None            | Baseline player behavior |         "name": "Alice",

}

```| **B** | 16-35  | Shown (2 orders marked) | Optimal recommendations visible |         "price": 15,



---| **C** | 36-50  | None            | Post-recommendation behavior |         "restaurant": "SafeGrocer",



### 2. ROUND TIME LIMIT (Countdown Timer)         "city": "NorthCity",



**File**: `src/routes/bundlegame.svelte` (line ~50)### Key Parameters         "items": ["Milk", "Bread"],



```javascript- **4 orders** shown per round         "recommended": false

const ROUND_TIME_LIMIT = 300;  // 300 seconds = 5 minutes per round

```- **Max bundle size**: 3 orders       }



**To change**: Edit this constant to set how long players have per round.- **Time per round**: 300 seconds (5 min countdown)     ],



---- **Stores**: Target, Berkeley Bowl, Sprouts, Safeway     "max_bundle": 3



### 3. EXPERIMENT SCENARIOS (50-Round Mode)- **Cities**: Emeryville, Berkeley, Oakland, Piedmont   }



**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`   ```



This is the **main experiment configuration**. Each round is an object in the array.## Game Flow



#### Round Structure3. **Key fields to modify**:



```json1. **Order Selection**: Player sees 4 orders on a map, selects 1-3 to bundle   - `orders`: Array of 3-5 order objects

{

  "round": 1,2. **Shopping**: Navigate store aisles, pick items (2s per aisle)   - `orders[].recommended`: Set to `true` to show star badge (Phase B only)

  "phase": "A",

  "scenario_id": "A01",3. **Checkout**: Complete purchase   - `orders[].restaurant`: Store name (affects travel time)

  "max_bundle": 3,

  "store_travel_time_s": 4,4. **Delivery**: Travel to destination city (4s travel time)   - `orders[].city`: "NorthCity" or "SouthCity" (affects travel time)

  "base_store_time_s": 2,

  "per_aisle_time_s": 2,5. **Next Round**: Automatically advances after delivery   - `orders[].items`: Array of items (each item = 1 aisle, affects pick time)

  "orders": [...],

  "optimal": {...},   - `max_bundle`: Maximum orders players can bundle (1-3)

  "second_best": {...}

}## Experiment Data

```

4. **After making changes**, update the developer reference table by regenerating the CSV:

#### Round-Level Parameters

The experiment file (`src/lib/bundle_experiment_50_rounds_short_times.json`) contains:   ```bash

| Parameter | Type | Description |

|-----------|------|-------------|   node generate_csv.mjs

| `round` | number | Round number (1-50) |

| `phase` | string | "A", "B", or "C" - determines recommendation visibility |```json   ```

| `scenario_id` | string | Unique identifier for this scenario |

| `max_bundle` | number | Maximum orders player can select (1-3) |{

| `store_travel_time_s` | number | Time to travel to store (seconds) |

| `base_store_time_s` | number | Base overhead time in store (seconds) |  "round": 1,### Developer Reference Table

| `per_aisle_time_s` | number | Time per aisle visited (seconds) |

  "phase": "A",

#### Order Structure (within each round)

  "scenario_id": "A01",A **visual reference table** is available for developers to track optimal strategies across all 50 rounds:

```json

{  "max_bundle": 3,

  "id": "R1_A",

  "store": "Target",  "orders": [...],- **HTML Table**: `experiment_reference_table.html`

  "city": "Emeryville",

  "earnings": 18,  "optimal": {  - Interactive color-coded table showing optimal bundles, earnings, and efficiency

  "aisles": [1, 2],

  "travel_time_s": 4,    "combo": ["R1_A"],  - **How to view**: Run `npx serve -l 3000 .` then open `http://localhost:3000/experiment_reference_table.html`

  "recommended": false

}    "efficiency_earnings_per_s": 1.8,  - Shows phase badges, recommendation alignment, and second-best strategies

```

    "total_earnings": 18

| Parameter | Type | Description |

|-----------|------|-------------|  },- **CSV File**: `experiment_reference.csv`

| `id` | string | Unique order identifier |

| `store` | string | Store name - must match stores config |  "second_best": {...}  - Quick data analysis in Excel, Google Sheets, Python, or R

| `city` | string | Delivery destination city |

| `earnings` | number | Payment for completing this order ($) |}  - Contains: Round, Phase, Optimal_Bundle_Size, Optimal_Earnings, Optimal_Efficiency, Alignment, etc.

| `aisles` | number[] | List of aisle numbers to visit |

| `travel_time_s` | number | Delivery travel time (seconds) |```

| `recommended` | boolean | Show star badge (only visible in Phase B) |

- **Documentation**: `EXPERIMENT_REFERENCE_GUIDE.md`

#### Optimal Bundle Info

## Optimal Bundle Types  - Complete guide with usage instructions and analysis examples

```json

"optimal": {

  "combo": ["R1_A"],

  "bundle_size": 1,| Type | Bundle Size | Efficiency | Scenario |**Important**: These reference tools are **developer-only** and are **NOT visible to experiment participants**.

  "efficiency_earnings_per_s": 1.8,

  "total_time_s": 10,|------|-------------|------------|----------|

  "total_earnings": 18,

  "num_aisles": 2| Single High | 1 order | 1.8 $/s | One $18 order beats 3 small orders |### Timing Model & Optimal Strategies

}

```| Overlap Duo | 2 orders | 1.667 $/s | Two orders sharing aisles |



This is for research analysis - shows the mathematically optimal choice.| Chain Triple | 3 orders | 3.071 $/s | Three orders with sequential aisle overlap |The experiment uses this timing calculation for each bundle:



---```



### 4. STORE CONFIGURATIONS## Data LoggingTotal Time = 4s (travel) + 2s (overhead) + 2s × (number of unique aisles)



**File**: `src/lib/configs/stores1.json` (or `stores2.json`)```



#### Store LayoutPlayer actions are logged to Firebase:



```json- Order selections**Example**:

{

  "store": "Target",- Bundle compositions- Bundle of 2 orders with 3 unique aisles total: `4 + 2 + (2 × 3) = 12 seconds`

  "city": "Emeryville",

  "items": ["watermelon", "apple", "pineapple", "grape", "banana"],- Shopping times- Efficiency = Total Earnings / Total Time

  "locations": [

    ["Entrance", "Watermelon", ""],- Delivery completions

    ["Apple", "Pineapple", ""],

    ["Grape", "Banana", ""]- Recommendation interactions (Phase B)**Note**: Changing the per-aisle time between 1-3 seconds preserves the same optimal choices for the current scenario designs - only efficiency values scale proportionally.

  ],

  "cellDistance": 3000,

  "Entrance": [0, 0]

}## Development**Modifying timing parameters**:

```

- Edit `cellDistance` values in `src/lib/bundle_experiment_50_rounds_short_times.json`

| Parameter | Type | Description |

|-----------|------|-------------|```bash- Current model: `{"NorthCity": 1, "SouthCity": 2}` where values represent travel time multipliers

| `store` | string | Store name (must match orders) |

| `city` | string | City where store is located |npm run dev      # Start development server- After changes, verify optimal strategies haven't unexpectedly shifted using the reference table

| `items` | string[] | Available items in this store |

| `locations` | string[][] | 2D grid of item positions |npm run build    # Build for production

| `cellDistance` | number | **Time per cell movement in milliseconds** |

| `Entrance` | number[] | [row, col] coordinates of entrance |npm run preview  # Preview production build---



**cellDistance Examples**:```

- `1000` = 1 second per cell

- `2000` = 2 seconds per cell## Legacy Configuration (config.json)

- `3000` = 3 seconds per cell

## Deployment

#### City-to-City Distances (Delivery Times)

You will need the following data inside your `config.json` file:

```json

"distances": {Auto-deploys to Vercel on push to main branch.

  "Emeryville": {

    "destinations": ["Berkeley", "Oakland", "Piedmont"],- `name`: string. Name of the configuration (e.g., "Phase 1 Lab Configuration")

    "distances": [4, 2, 7]

  },## Reference Materials

  "Berkeley": {

    "destinations": ["Emeryville", "Oakland", "Piedmont"],- `timeLimit`: integer. How long the game should run in seconds

    "distances": [4, 5, 4]

  }- `experiment_reference.csv` - Round-by-round reference table

}

```- `experiment_reference_table.html` - Visual reference (open in browser)- `thinkTime`: integer. How many seconds the user gets to think before being able to select orders (timer is paused during this time)



| From → To | Time (seconds) |- `docs/EXPERIMENT_DESIGN.md` - Full research design documentation

|-----------|----------------|

| Emeryville → Berkeley | 4 |- `gridSize`: integer. Dimensions of the game grid.  

| Emeryville → Oakland | 2 |  - For example, `3` means a 3x3 grid.

| Emeryville → Piedmont | 7 |  - Maximum value is 9

| Berkeley → Oakland | 5 |

| etc. | ... |- `tips`: true/false. Whether tips are active during gameplay (i.e., prices change dynamically).  

  - Requires the `store` config to contain:

**To change delivery times**: Edit the `distances` arrays. The index corresponds to the `destinations` array.    - `tip`: An array of percentages to increase the price (e.g., `[0.1, 0.2, 0.15]`)

    - `tipinterval`: The interval (in seconds) between tip changes

---

- `waiting`: true/false. Whether prices fluctuate while players are selecting orders (before the game starts).  

### 5. ORDER POOL (Legacy/Random Mode)  - Requires the `store` config to contain:

    - `waiting`: An array of percentages

**File**: `src/lib/configs/order.json`    - `waitinginterval`: Time interval for changes in price during the wait period



Used when NOT in experiment mode. Contains a pool of orders to randomly select from.- `refresh`: true/false. Whether orders can disappear (get taken) and then reappear as a new order.  

  - Requires:

```json    - `demand` in the order config: Probability (per second) that an order disappears

{    - `refresh` in the store config: Time (in seconds) before a disappeared order is refreshed

  "name": "Alexander",

  "id": "order0",- `expire`: true/false. Whether unselected order(s) can appear after a game round. They stop showing (expire) after x amount of rounds. If false, this is essentially the same as x = 1.

  "store": "Sprouts Farmers Market",

  "earnings": 20,- `conditions`:

  "startingearnings": 20,  - An array of condition objects that define setups

  "city": "Oakland",  - Each object needs `name`, `order_file`, and `store_file`

  "amount": 5,  - Each condition will use a different `order_file` and `store_file` combination when assigned during game start

  "expire": 1,  - If you are not testing conditions, this should be length 1

  "items": {  - The conditions will always alternate between users

    "grape": 4,

    "orange": 1- `auth`: true if it requires login. (should always be true unless tutorial)

  },

  "demand": 0## Example

}

``````json

{

---    "name": "Phase 1 Lab Configuration",

    "timeLimit": 1200,

### 6. UI SETTINGS    "thinkTime": 10,

    "gridSize": 3,

**File**: `src/lib/bundle.js`    "tips": false,

    "waiting": false,

```javascript    "refresh": false,

export const ordersShown = 4;  // Number of orders displayed per round    "expire": false,

```    "conditions": [

        {

**File**: `src/routes/bundlegame.svelte`            "name": "Shorter cell distances",

            "order_file": "order.json",

```javascript            "store_file": "stores1.json"

const ROUND_TIME_LIMIT = 300;  // Countdown timer duration (seconds)        },

```        {

            "name": "Longer cell distances",

---            "order_file": "order.json",

            "store_file": "stores2.json"

### 7. MAP COORDINATES (Delivery Map)        }

    ]

**File**: `src/routes/bundlegame.svelte` (line ~35)}



```javascript```

const cityCoords = {

    "Berkeley": [37.8715, -122.2730],For data analysis, the first condition is denoted configuration "0" and the second condition is denoted configuration "2"

    "Oakland": [37.8044, -122.2712],
    "Emeryville": [37.8313, -122.2852],
    "Piedmont": [37.8238, -122.2316]
};
```

**To add a new city**:
1. Add coordinates here
2. Add to store configs (`stores1.json`)
3. Add to distances matrix
4. Update experiment scenarios if needed

---

### 8. PENALTY TIMEOUT

**File**: `src/lib/config.js`

```javascript
export const PENALTY_TIMEOUT = 30;  // Seconds before penalty triggers
```

---

## 🔧 COMMON MODIFICATIONS

### Change Aisle Walking Speed

Edit `cellDistance` in `src/lib/configs/stores1.json`:
```json
"cellDistance": 2000  // 2 seconds per cell (was 3000)
```

### Change Delivery Times

Edit `distances` in `src/lib/configs/stores1.json`:
```json
"Emeryville": {
  "destinations": ["Berkeley", "Oakland", "Piedmont"],
  "distances": [2, 1, 5]  // Faster deliveries
}
```

### Change Round Duration

Edit in `src/routes/bundlegame.svelte`:
```javascript
const ROUND_TIME_LIMIT = 180;  // 3 minutes instead of 5
```

### Change Maximum Bundle Size

Edit in experiment JSON for specific rounds:
```json
"max_bundle": 2  // Only allow 2 orders instead of 3
```

### Add/Remove Recommendation Badges

Set `recommended: true` on orders in Phase B rounds:
```json
{
  "id": "R16_A",
  "recommended": true  // Shows star badge
}
```

### Change Order Earnings

Edit `earnings` field in experiment scenarios:
```json
{
  "id": "R1_A",
  "earnings": 25  // Increased from 18
}
```

---

## 📊 Time Calculation Formula

```
Total Round Time = store_travel_time + base_store_time + (unique_aisles × per_aisle_time) + delivery_time

Example:
- Travel to store: 4s
- Base store time: 2s
- Visit 3 aisles: 3 × 2s = 6s
- Delivery: 4s
- Total: 4 + 2 + 6 + 4 = 16 seconds
```

---

## 🚀 Deployment

Auto-deploys to Vercel on push to main branch.

```bash
npm run build    # Build for production
npm run preview  # Preview production build locally
```

---

## 📁 Reference Files

- `experiment_reference.csv` - Round-by-round data table
- `experiment_reference_table.html` - Visual reference (open in browser)
- `docs/EXPERIMENT_DESIGN.md` - Full research documentation
