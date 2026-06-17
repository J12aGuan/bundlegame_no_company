# BundleGame — paper figure screenshots

Captured **automatically** with Playwright (Chromium) against the real app
(`npm run dev`, live `MasterData` scenarios). Fixed viewport **1440×900,
deviceScaleFactor 2** → full-screen PNGs are **2880×1800**, lossless, cropped to
the app (no browser chrome). Light theme (the app's only theme). Reproduce with
`node paper/figures/screenshots/capture.mjs` (see "How these were made").

Dataset: `mainGame_2026_03_20_14_26_36`. Scenario menus are pinned deterministically
by round (no random reshuffle). No participant name/ID appears (a no-auth dev
session was used; see notes). Images are **unannotated** — add callouts in LaTeX.

## Images

| File | Route / state | scenario_id (round) | Suggested caption |
|---|---|---|---|
| `task_decision_empty.png` | `/` → decision screen, no orders selected | mainGameScenario10 (r10) | The core decision screen: a 4-order menu (store, city, payout, modeled handling+travel time, items), the route map, the round timer and running score (header), before any selection. |
| `task_decision_midbundle.png` | `/` → decision screen, 3 orders added | mainGameScenario10 (r10) | Building a bundle: three same-store orders selected; the confirm button reports the modeled bundle time, cross-city travel, and shared-item savings. |
| `order_card.png` | close-up of one order card (unselected) | mainGameScenario10 / Order37 | A single order card showing all attributes: store, city, payout, modeled time (base + cross-city), and item list. |
| `map_stores_cities.png` | the route map panel of the decision screen | n/a (4-city world) | The spatial world: four stores across four cities (Berkeley, Oakland, Emeryville, Piedmont); the green marker is the worker's current city. Driving between cities is the routing cost. |
| `score_feedback.png` | `/` → decision screen header (unaided feedback) | mainGameScenario10 (r10) | The only feedback in the unaided pilot is the running score and timer in the header (Round, Time left, Earned); no recommendation or explanation is shown. |
| `menu_compact.png` | decision screen, compact menu | **mainGameScenario14 (r14)** | A compact menu: all four orders sit within a single city (Emeryville / Target), so routing is not stressed. |
| `menu_dispersed.png` | decision screen, dispersed menu | **mainGameScenario7 (r7)** | A dispersed menu: orders span two cities (Oakland / Emeryville), so bundling incurs cross-city travel. |
| `menu_payout_trap.png` | decision screen, payout-trap menu | **mainGameScenario8 (r8)** | A payout trap: the highest-paying bundle (the three top orders, $47) is ~32% worse on the efficiency score than the optimal $31 bundle, which earns less but is much faster. |
| `instructions.png` | `/tutorial` → tutorial decision screen | tutorial set (r1/5) | The tutorial that teaches the rules through guided play; round 1 prompts "Select 1 Order to Start" (rules are reinforced; the formal comprehension check is in Qualtrics — see below). |
| `score_gameover.png` | `/` → game-over "Your Stats" (after one real completed round) | mainGameScenario1 (Order1) | The end-of-session screen: real stats (Earnings $22, Finished Orders 1), the session-end research survey, and the Qualtrics hand-off. |
| `task_instore_picking.png` | in-store item-picking screen (GameState 1) | mainGameScenario1 (Berkeley Bowl) | (Bonus) After choosing a bundle, the worker walks the store aisle grid, picks each item by name + quantity, and adds it to the bag (the handling-time mechanic). |
| `task_instore_picking_start.png` | in-store "Start Picking" prompt (GameState 0) | mainGameScenario1 | (Bonus) The entry to the in-store picking phase. |
| `task_delivery.png` | delivery screen (GameState 5) | mainGameScenario1 | (Bonus) After checkout, each order is driven to its city; delivery time = local delivery + cross-city travel. |
| `menu_worked_example.png` | decision screen, all four orders, none selected | **mainGameScenario12 (r12)** | Worked example: a four-order menu, all from Target / Emeryville ($16/$14/$22/$14), before any selection. |
| `menu_worked_example_selected.png` | same menu, orders 45+47+48 selected | **mainGameScenario12 (r12)** | The bundle a participant chose (orders 45, 47, 48 = $52); the confirm bar shows the bundle's modeled completion time 52s (city 7s, shared-item savings 6s). Order 46 ($14) is left unselected. |
| `00_landing.png` | `/` landing (entry) | n/a | (Bonus) The participant entry screen. Not requested; included for completeness. |

### Scenario provenance (for the three manipulation menus)
- **Compact — `mainGameScenario14` (round 14):** 4 orders, all *Target / Emeryville* (1 store, 1 city). $21/$14/$22/$18. (The primary task figures use the equally-compact `mainGameScenario10`, all *Safeway / Piedmont*, $14/$20/$19/$23 — a distinct single-city menu chosen for legibility.)
- **Dispersed — `mainGameScenario7` (round 7):** *Sprouts/Oakland* ×3 + *Target/Emeryville* ×1 (2 cities). Orders 25–28, $12/$17/$21/$21.
- **Payout trap — `mainGameScenario8` (round 8):** 4 orders, all *Sprouts/Oakland*. The max-earnings legal bundle = $47 (orders 29+30+31) but scores only 0.68 of optimal; the oracle bundle earns $31 and is faster. Orders 29–32, $17/$15/$15/$14.

## Screens NOT captured (and why)
- **`comprehension_q` — administered outside the app (Qualtrics), so skipped.** The comprehension battery (`comp1`–`comp5`) and quiz items (`Q44/Q50/Q54`) live in the Qualtrics survey, not the SvelteKit app (verified: `QualtricsResponses.raw_fields`). Wording is documented in `publishing/export_for_analysis/survey_codebook.csv` / `comprehension_key.csv`. There is no in-app comprehension screen to capture.
- **`leaderboard` — exists but is admin-gated and needs an active live session.** Route: **`/admin/live`** (`src/routes/admin/live/+page.svelte`), the classroom live leaderboard. It requires Firebase Auth with the `admin:true` claim and a populated `LiveSessions/{id}/participants` collection. It was not auto-captured (admin login + a seeded live session are required). To capture manually: sign in at `/admin` with an admin account, open `/admin/live`, start/seed a live session, then screenshot at the same 1440×900@2x.

## Screen → route/component map (for reference)
- **Decision screen** = `src/routes/home.svelte` (rendered by `src/routes/+page.svelte` when `game.inSelect`). Order menu + bundle builder + embedded Leaflet/MapTiler map. Header (Round/Time/Earned/Location) is in `+page.svelte`.
- **Order card** = `src/routes/order.svelte`.
- **Map** = the `#map` panel inside `home.svelte` (Leaflet + MapTiler; cities Berkeley/Oakland/Emeryville/Piedmont).
- **In-store item picking** = `src/routes/bundlegame.svelte` (rendered when `game.inStore`; not in the requested list).
- **Score / game-over** = the `GameOver` branch of `+page.svelte` ("Your Stats": Earnings, Finished Orders). The running score lives in the header.
- **Tutorial / instructions** = `src/routes/tutorial/+page.svelte`.
- **Leaderboard** = `src/routes/admin/live/+page.svelte`.

## How these were made (reproducibility)
1. `npm ci`
2. `npm i -D playwright && npx playwright install chromium`
3. `npm run dev`  (dev server on `http://localhost:5173`)
4. `node paper/figures/screenshots/capture.mjs`

Notes:
- **Auth bypass (no production writes):** the main game requires a participant token
  (`centralConfig.game.auth = true`). To render the real menus without a token and
  **without writing any session to Firestore**, the capture flips the dev-only
  `needsAuth` store to `false` (the no-auth `loadGame()` path only *reads* config;
  saves are gated on `needsAuth && id && scenarioSetVersionId`, so nothing is
  persisted). No real participant identity is used.
- **Dev hook:** a guarded block was added at the end of `src/lib/bundle.js`
  (`if (import.meta.env.DEV && window) window.__bundle = {…}`) exposing the runtime
  stores so the script can pin scenarios deterministically. It is **stripped from
  production builds** (`import.meta.env.DEV` is false) and never ships to participants.
  Remove it if you prefer; the capture script depends on it only for scenario pinning.
- **Clean figures:** the script hides the study-internal "Study Arm" metadata box so
  the figures show the plain participant task (the unaided pilot shows no recommendation
  panel regardless).
- **Game-over / in-store figures** (`score_gameover.png`, `task_instore_picking*.png`,
  `task_delivery.png`) are produced by `capture_gameover.mjs`, which plays one real
  round (pick + deliver) and shrinks the scenario set to one (via the dev hook) so the
  round completes into the game-over screen. Earnings are real ($22 from the completed
  order). No session was persisted (no-auth path: no result code appeared, no Firestore
  write). Run: `node paper/figures/screenshots/capture_gameover.mjs`.
