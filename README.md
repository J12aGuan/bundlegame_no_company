# Configuring the Game

## 50-Round Experiment Configuration

The game now includes a **50-round experiment** with structured scenarios testing bundling behavior and recommendation systems. This is the primary configuration for research purposes.

### Experiment Overview

- **Location**: `src/lib/bundle_experiment_50_rounds_short_times.json`
- **Structure**: 50 rounds across 3 phases
  - **Phase A (Rounds 1-15)**: Baseline - no recommendations
  - **Phase B (Rounds 16-35)**: System recommends 2-bundles with star badges
  - **Phase C (Rounds 36-50)**: Post-recommendation phase
- **Test Scenarios**: Each round includes:
  - 3-5 orders with specific store locations and items
  - Optimal bundle size (1, 2, or 3 orders)
  - Recommendation alignment (Phase B only)
  - Timing model: 4s travel + 2s overhead + 2s per aisle

### How to Modify Experiment Rounds

To change what you're testing in specific rounds:

1. **Edit the experiment file**: `src/lib/bundle_experiment_50_rounds_short_times.json`

2. **Each round has this structure**:
   ```json
   {
     "round": 1,
     "phase": "A",
     "scenario_id": "A_1_allsame",
     "orders": [
       {
         "name": "Alice",
         "price": 15,
         "restaurant": "SafeGrocer",
         "city": "NorthCity",
         "items": ["Milk", "Bread"],
         "recommended": false
       }
     ],
     "max_bundle": 3
   }
   ```

3. **Key fields to modify**:
   - `orders`: Array of 3-5 order objects
   - `orders[].recommended`: Set to `true` to show star badge (Phase B only)
   - `orders[].restaurant`: Store name (affects travel time)
   - `orders[].city`: "NorthCity" or "SouthCity" (affects travel time)
   - `orders[].items`: Array of items (each item = 1 aisle, affects pick time)
   - `max_bundle`: Maximum orders players can bundle (1-3)

4. **After making changes**, update the developer reference table by regenerating the CSV:
   ```bash
   node generate_csv.mjs
   ```

### Developer Reference Table

A **visual reference table** is available for developers to track optimal strategies across all 50 rounds:

- **HTML Table**: `experiment_reference_table.html`
  - Interactive color-coded table showing optimal bundles, earnings, and efficiency
  - **How to view**: Run `npx serve -l 3000 .` then open `http://localhost:3000/experiment_reference_table.html`
  - Shows phase badges, recommendation alignment, and second-best strategies

- **CSV File**: `experiment_reference.csv`
  - Quick data analysis in Excel, Google Sheets, Python, or R
  - Contains: Round, Phase, Optimal_Bundle_Size, Optimal_Earnings, Optimal_Efficiency, Alignment, etc.

- **Documentation**: `EXPERIMENT_REFERENCE_GUIDE.md`
  - Complete guide with usage instructions and analysis examples

**Important**: These reference tools are **developer-only** and are **NOT visible to experiment participants**.

### Timing Model & Optimal Strategies

The experiment uses this timing calculation for each bundle:
```
Total Time = 4s (travel) + 2s (overhead) + 2s × (number of unique aisles)
```

**Example**:
- Bundle of 2 orders with 3 unique aisles total: `4 + 2 + (2 × 3) = 12 seconds`
- Efficiency = Total Earnings / Total Time

**Note**: Changing the per-aisle time between 1-3 seconds preserves the same optimal choices for the current scenario designs - only efficiency values scale proportionally.

**Modifying timing parameters**:
- Edit `cellDistance` values in `src/lib/bundle_experiment_50_rounds_short_times.json`
- Current model: `{"NorthCity": 1, "SouthCity": 2}` where values represent travel time multipliers
- After changes, verify optimal strategies haven't unexpectedly shifted using the reference table

---

## Legacy Configuration (config.json)

You will need the following data inside your `config.json` file:

- `name`: string. Name of the configuration (e.g., "Phase 1 Lab Configuration")

- `timeLimit`: integer. How long the game should run in seconds

- `thinkTime`: integer. How many seconds the user gets to think before being able to select orders (timer is paused during this time)

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
