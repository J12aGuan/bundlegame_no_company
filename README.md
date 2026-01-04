# Bundle Game - Delivery Efficiency Experiment# Configuring the Game



A SvelteKit-based delivery simulation game for researching order bundling decision-making.## 50-Round Experiment Configuration



## Quick StartThe game now includes a **50-round experiment** with structured scenarios testing bundling behavior and recommendation systems. This is the primary configuration for research purposes.



```bash### Experiment Overview

npm install

npm run dev- **Location**: `src/lib/bundle_experiment_50_rounds_short_times.json`

```- **Structure**: 50 rounds across 3 phases

  - **Phase A (Rounds 1-15)**: Baseline - no recommendations

## Project Structure  - **Phase B (Rounds 16-35)**: System recommends 2-bundles with star badges

  - **Phase C (Rounds 36-50)**: Post-recommendation phase

```- **Test Scenarios**: Each round includes:

src/  - 3-5 orders with specific store locations and items

├── routes/  - Optimal bundle size (1, 2, or 3 orders)

│   ├── +page.svelte        # Main router (login → game → game over)  - Recommendation alignment (Phase B only)

│   ├── home.svelte         # Order selection & city navigation  - Timing model: 4s travel + 2s overhead + 2s per aisle

│   ├── bundlegame.svelte   # Picking, checkout & delivery

│   └── order.svelte        # Order card component### How to Modify Experiment Rounds

├── lib/

│   ├── bundle.js           # Core game state & logicTo change what you're testing in specific rounds:

│   ├── bundle_experiment_50_rounds_short_times.json  # Experiment data

│   └── configs/            # Store configurations1. **Edit the experiment file**: `src/lib/bundle_experiment_50_rounds_short_times.json`

└── app.html

```2. **Each round has this structure**:

   ```json

## Current Experiment: 50 Rounds, 3 Phases   {

     "round": 1,

The game runs a controlled experiment with 50 rounds across 3 phases:     "phase": "A",

     "scenario_id": "A_1_allsame",

| Phase | Rounds | Recommendations | Purpose |     "orders": [

|-------|--------|-----------------|---------|       {

| **A** | 1-15   | None            | Baseline player behavior |         "name": "Alice",

| **B** | 16-35  | Shown (2 orders marked) | Optimal recommendations visible |         "price": 15,

| **C** | 36-50  | None            | Post-recommendation behavior |         "restaurant": "SafeGrocer",

         "city": "NorthCity",

### Key Parameters         "items": ["Milk", "Bread"],

- **4 orders** shown per round         "recommended": false

- **Max bundle size**: 3 orders       }

- **Time per round**: 300 seconds (5 min countdown)     ],

- **Stores**: Target, Berkeley Bowl, Sprouts, Safeway     "max_bundle": 3

- **Cities**: Emeryville, Berkeley, Oakland, Piedmont   }

   ```

## Game Flow

3. **Key fields to modify**:

1. **Order Selection**: Player sees 4 orders on a map, selects 1-3 to bundle   - `orders`: Array of 3-5 order objects

2. **Shopping**: Navigate store aisles, pick items (2s per aisle)   - `orders[].recommended`: Set to `true` to show star badge (Phase B only)

3. **Checkout**: Complete purchase   - `orders[].restaurant`: Store name (affects travel time)

4. **Delivery**: Travel to destination city (4s travel time)   - `orders[].city`: "NorthCity" or "SouthCity" (affects travel time)

5. **Next Round**: Automatically advances after delivery   - `orders[].items`: Array of items (each item = 1 aisle, affects pick time)

   - `max_bundle`: Maximum orders players can bundle (1-3)

## Experiment Data

4. **After making changes**, update the developer reference table by regenerating the CSV:

The experiment file (`src/lib/bundle_experiment_50_rounds_short_times.json`) contains:   ```bash

   node generate_csv.mjs

```json   ```

{

  "round": 1,### Developer Reference Table

  "phase": "A",

  "scenario_id": "A01",A **visual reference table** is available for developers to track optimal strategies across all 50 rounds:

  "max_bundle": 3,

  "orders": [...],- **HTML Table**: `experiment_reference_table.html`

  "optimal": {  - Interactive color-coded table showing optimal bundles, earnings, and efficiency

    "combo": ["R1_A"],  - **How to view**: Run `npx serve -l 3000 .` then open `http://localhost:3000/experiment_reference_table.html`

    "efficiency_earnings_per_s": 1.8,  - Shows phase badges, recommendation alignment, and second-best strategies

    "total_earnings": 18

  },- **CSV File**: `experiment_reference.csv`

  "second_best": {...}  - Quick data analysis in Excel, Google Sheets, Python, or R

}  - Contains: Round, Phase, Optimal_Bundle_Size, Optimal_Earnings, Optimal_Efficiency, Alignment, etc.

```

- **Documentation**: `EXPERIMENT_REFERENCE_GUIDE.md`

## Optimal Bundle Types  - Complete guide with usage instructions and analysis examples



| Type | Bundle Size | Efficiency | Scenario |**Important**: These reference tools are **developer-only** and are **NOT visible to experiment participants**.

|------|-------------|------------|----------|

| Single High | 1 order | 1.8 $/s | One $18 order beats 3 small orders |### Timing Model & Optimal Strategies

| Overlap Duo | 2 orders | 1.667 $/s | Two orders sharing aisles |

| Chain Triple | 3 orders | 3.071 $/s | Three orders with sequential aisle overlap |The experiment uses this timing calculation for each bundle:

```

## Data LoggingTotal Time = 4s (travel) + 2s (overhead) + 2s × (number of unique aisles)

```

Player actions are logged to Firebase:

- Order selections**Example**:

- Bundle compositions- Bundle of 2 orders with 3 unique aisles total: `4 + 2 + (2 × 3) = 12 seconds`

- Shopping times- Efficiency = Total Earnings / Total Time

- Delivery completions

- Recommendation interactions (Phase B)**Note**: Changing the per-aisle time between 1-3 seconds preserves the same optimal choices for the current scenario designs - only efficiency values scale proportionally.



## Development**Modifying timing parameters**:

- Edit `cellDistance` values in `src/lib/bundle_experiment_50_rounds_short_times.json`

```bash- Current model: `{"NorthCity": 1, "SouthCity": 2}` where values represent travel time multipliers

npm run dev      # Start development server- After changes, verify optimal strategies haven't unexpectedly shifted using the reference table

npm run build    # Build for production

npm run preview  # Preview production build---

```

## Legacy Configuration (config.json)

## Deployment

You will need the following data inside your `config.json` file:

Auto-deploys to Vercel on push to main branch.

- `name`: string. Name of the configuration (e.g., "Phase 1 Lab Configuration")

## Reference Materials

- `timeLimit`: integer. How long the game should run in seconds

- `experiment_reference.csv` - Round-by-round reference table

- `experiment_reference_table.html` - Visual reference (open in browser)- `thinkTime`: integer. How many seconds the user gets to think before being able to select orders (timer is paused during this time)

- `docs/EXPERIMENT_DESIGN.md` - Full research design documentation

- `gridSize`: integer. Dimensions of the game grid.  
  - For example, `3` means a 3x3 grid.
  - Maximum value is 9

- `tips`: true/false. Whether tips are active during gameplay (i.e., prices change dynamically).  
  - Requires the `store` config to contain:
    - `tip`: An array of percentages to increase the price (e.g., `[0.1, 0.2, 0.15]`)
    - `tipinterval`: The interval (in seconds) between tip changes

- `waiting`: true/false. Whether prices fluctuate while players are selecting orders (before the game starts).  
  - Requires the `store` config to contain:
    - `waiting`: An array of percentages
    - `waitinginterval`: Time interval for changes in price during the wait period

- `refresh`: true/false. Whether orders can disappear (get taken) and then reappear as a new order.  
  - Requires:
    - `demand` in the order config: Probability (per second) that an order disappears
    - `refresh` in the store config: Time (in seconds) before a disappeared order is refreshed

- `expire`: true/false. Whether unselected order(s) can appear after a game round. They stop showing (expire) after x amount of rounds. If false, this is essentially the same as x = 1.

- `conditions`:
  - An array of condition objects that define setups
  - Each object needs `name`, `order_file`, and `store_file`
  - Each condition will use a different `order_file` and `store_file` combination when assigned during game start
  - If you are not testing conditions, this should be length 1
  - The conditions will always alternate between users

- `auth`: true if it requires login. (should always be true unless tutorial)

## Example

```json
{
    "name": "Phase 1 Lab Configuration",
    "timeLimit": 1200,
    "thinkTime": 10,
    "gridSize": 3,
    "tips": false,
    "waiting": false,
    "refresh": false,
    "expire": false,
    "conditions": [
        {
            "name": "Shorter cell distances",
            "order_file": "order.json",
            "store_file": "stores1.json"
        },
        {
            "name": "Longer cell distances",
            "order_file": "order.json",
            "store_file": "stores2.json"
        }
    ]
}

```

For data analysis, the first condition is denoted configuration "0" and the second condition is denoted configuration "2"
