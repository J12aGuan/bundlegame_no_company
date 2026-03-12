# Current Architecture (March 2026)

This document describes the **current** runtime architecture used by the app.

## Runtime Stack
- Frontend: SvelteKit static app
- Data/Auth: Firebase (Firestore/Auth)
- Hosting: Vercel

## Core Runtime Files
- `src/lib/bundle.js`: main game state, round/scenario selection, Firebase-backed config loading
- `src/lib/tutorial.js`: tutorial variant of game flow
- `src/lib/firebaseDB.js`: Firestore data access (users, actions, orders, master data datasets)
- `src/routes/bundlegame.svelte`: gameplay UI and round lifecycle
- `src/routes/admin/masterdata/+page.svelte`: admin management for configs and scenario datasets
- `src/routes/admin/analysis/+page.svelte`: live participant-vs-optimal admin analytics dashboard
- `src/lib/analysis/engine.js`: shared client-side analytics engine + decision-fact/stat models
- `src/lib/scripts/generateScenarios.js`: scenario generation + optimal bundle solving pipeline

## Data Model (MasterData)
The app no longer reads static JSON config files in `src/lib` for production behavior.
It reads from Firestore `MasterData`, especially:
- `centralConfig` (global game settings)
- `tutorialConfig` (tutorial settings)
- grouped dataset entries in `MasterData/datasets`

Grouped dataset entry shape:
- `scenarios[]` (round -> scenario_id, max_bundle, order_ids)
  - generated datasets also include `classification`, `score_gap`, `relative_gap`
- `orders[]` (order details)
- `optimal[]` (best_bundle_ids, second_best_bundle_ids)
- `metadata` (generation settings)

## Round Flow (Current)
1. App loads central config and active scenario dataset IDs.
2. Current round maps to a scenario via `round` and `scenario_id`.
3. Player chooses one or more orders (limited by `max_bundle`).
4. Gameplay executes; actions and outcomes are logged to `Users/{id}/Actions` and `Users/{id}/Orders`.
5. Round summary logs chosen orders and success/failure.

## Notes
Legacy docs from pre-MasterData static-file architecture are archived in `docs/archive/legacy-2026-03/`.

For analytics and RL export details, see `docs/current/ANALYTICS_AND_RL_EXPORTS.md`.
