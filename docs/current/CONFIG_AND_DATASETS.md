# Current Config & Dataset Management (March 2026)

## Source of Truth
Configuration and round datasets are managed in Firestore, not local static config JSON.

## Key Firestore Documents
- `MasterData/centralConfig`
- `MasterData/tutorialConfig`
- `MasterData/datasets` with grouped dataset entries

## Active Dataset Selection
- Main game uses `centralConfig.scenario_set`
- Tutorial uses `tutorialConfig.scenario_set`

Those IDs point to grouped dataset entries under `MasterData/datasets`.

## Dataset Entry Shape
Each grouped entry stores:
- `scenarios`: round metadata and order IDs
- `orders`: order payloads (city, store, items, earnings, estimatedTime)
- `optimal`: best and second-best bundle IDs per scenario
- `metadata`: optional generation metadata

## Admin UI
Use `src/routes/admin/masterdata/+page.svelte` to:
- view/edit central and tutorial configs
- browse dataset names
- generate new scenario sets
- save/delete grouped datasets

## Export / Analysis
- `/downloader` exports participant user data, actions, and orders
- analysis pipeline lives in `data analysis/analytics_v1`

## Operational Guidance
- Treat local JSON files as fixtures/reference unless explicitly wired into runtime code.
- When changing schema, update both admin UI and analytics parsing together.
