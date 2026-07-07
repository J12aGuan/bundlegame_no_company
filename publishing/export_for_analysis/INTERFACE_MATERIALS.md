# Interface and menu materials (e-companion)  — F11

Consolidated study materials for the deployed pilot (the 27-menu, 1,268-round unaided deployment).

## 1. Menu table

`deployed_menu_table_27.csv` (this directory): one row per deployed menu, in round order, with
`round, scenario_id, n_orders, cities, order_payouts, benchmark_bundle, benchmark_size, best_to_2nd_margin`.
Per-order item lists are in `orders.csv`.

Composition of the 27 menus (deployed scorer):
- dispersed (≥2 cities) 14 | compact (1 city) 13
- payout-trap menus (a higher-paying feasible bundle than the benchmark exists) 23/27
- best-to-second-best relative score gap 0.001–0.225 (median 0.040)
- benchmark size 16 single / 8 pair / 3 triple

## 2. Verbatim instructions

The instruction screen shown to participants is the rendered screenshot
`publishing/paper/figures/screenshots/instructions.png` (verbatim source); the implementation is
`src/routes/tutorial/+page.svelte` over the game component. Two tutorial rounds preceded the main task.

## 3. Comprehension items (verbatim, with answer key)

From `survey_codebook.csv` (item text/options) and `comprehension_key.csv` (correct responses).

1. **comp1 (QID26) — "How many orders may you select?"**
   1) 1, 2, or 3 orders from the same store ✓  2) 1, 2, or 3 orders from any store
   3) 1–4 orders  4) Only 1 order
2. **comp2 (QID28) — "What are all the ways to travel? Select all that apply."**
   1) Click a location on the map  2) Use the travel buttons at the bottom  3) Travel happens automatically
   4) There is no traveling.  *(Answer not recoverable — GradingData empty; verify in-app.)*
3. **comp3 (QID29) — "How much $ does a bundled order earn?"**
   1) The average earnings  2) The highest-earning order  3) The earnings multiplied
   4) The sum (total) earnings of the orders ✓
4. **comp4 (QID60) — "Inside a store, at the apple aisle, how do you add an apple to your bag?"**
   3) Type "apple" in the item box, select the quantity, then add to bag ✓ (others incorrect)
5. **comp5 (QID31) — "How can I remove apples from my bag? Select all that apply."**
   6) Click the − button next to the item ✓  7) Click the red X next to the item ✓
   8) Click the + button (incorrect)  9) Click the item again in the store (incorrect)

## 4. Incentive language

The leaderboard / top-decile bonus was administered outside this codebase and the live incentive text is
not recoverable (no incentive document survives). The standings are reconstructed in
`participant_standings.csv` (F9): cumulative earnings-rate score under the deployed scorer
(Σ round earnings / Σ round effective time), with rank and percentile. State the incentive descriptively
as a leaderboard on cumulative earnings rate; do not quote a verbatim bonus rule.

## 5. Screenshots (platform-identifying info absent)

`publishing/paper/figures/screenshots/`: `00_landing.png` (landing), `instructions.png` (instructions),
`map_stores_cities.png` (the map with stores/cities). Three representative figures for the e-companion.
