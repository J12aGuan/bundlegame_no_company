# Current Architecture (March 2026)

This document describes the current runtime architecture used by the app.

## Runtime Stack

- Frontend: SvelteKit static app
- Data and auth: Firebase Firestore/Auth
- Hosting: Vercel

## Core Runtime Surfaces

- `src/lib/bundle.js`: main game state, scenario progress, and persistence orchestration
- `src/lib/tutorial.js`: tutorial-specific state and progression
- `src/lib/firebaseDB.js`: Firestore reads and writes for users, actions, and `MasterData`
- `src/lib/config.js`: runtime config helpers, including cross-city travel lookup
- `src/routes/home.svelte`: order selection flow before entering the store
- `src/routes/order.svelte`: order cards and modeled-time selection messaging
- `src/routes/bundlegame.svelte`: in-store flow, delivery flow, and round-completion logging
- `src/routes/admin/masterdata/+page.svelte`: admin UI for configs, datasets, Cities data, and timing validation
- `src/routes/admin/analysis/+page.svelte`: participant-vs-optimal analytics dashboard and exports

## Firestore Source of Truth

The live app no longer depends on local static JSON for production behavior. Runtime data comes from Firestore `MasterData`, especially:

- `centralConfig`
- `tutorialConfig`
- `cities`
- grouped dataset entries in `MasterData/datasets`

Grouped dataset entries hold:

- `scenarios[]`
- `orders[]`
- `optimal[]`
- `metadata`

## Round Flow

1. Load central config, tutorial config, Cities data, and the active scenario dataset.
2. Map the current round to a scenario via `round` and `scenario_id`.
3. Let the player select orders up to `max_bundle`.
4. Run the store flow, then the delivery flow, while logging timing buckets and outcomes.
5. Persist round progress and action summaries after completion or failure.

## Timing Model

The app keeps modeled time and runtime time separate.

- `estimatedTime` is the modeled base time stored on an order.
- The current model treats `estimatedTime` as `localTravelTime + pick-item estimate`.
- Modeled order time is `estimatedTime + cityTravelTime`.
- Runtime delivery leg time is `localTravelTime + cityTravelTime`.
- `cityTravelTime` comes from `MasterData/cities.travelTimes[fromCity][toCity]`.
- The delivery origin is seeded from the player's actual current city at checkout and then updated after each completed delivery.

Example:

- If Berkeley to Oakland is `10` and an Oakland order has `localTravelTime = 2`, the runtime delivery leg is `12` when the player starts that delivery in Berkeley.
- If the player is already in Oakland, the same leg is `2`.

## Validation and Persistence

- Missing city routes are surfaced instead of silently treated as zero.
- Selection-time validation blocks starting a scenario when required city routes are missing.
- Delivery-time validation blocks a delivery leg when the Cities matrix is incomplete.
- Admin validation highlights missing city rows and missing routes for the active scenario set.
- Per-scenario timing buckets such as `thinkingTime`, `startPickingConfirmationTime`, `cityTravelTime`, and `localDeliveryTime` accumulate during play and are persisted at round success, round failure, and final completion boundaries.

## Notes

- `docs/current/CONFIG_AND_DATASETS.md` is the best reference for Firestore document shapes and admin editing behavior.
- Legacy documentation from the pre-`MasterData` era is archived under `docs/archive/legacy-2026-03/`.
