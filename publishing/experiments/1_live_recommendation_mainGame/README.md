# Experiment 1 — Live recommendation (mainGame)

The A/B/C recommendation study that has **already run**. This is the only experiment with real
participant data. Canonical details: [`docs/shared/EXPERIMENTS.md`](../../../docs/shared/EXPERIMENTS.md).

| field | value |
|---|---|
| Protocol id | `bundlegame_abc_recommendation_v1` (version `bundlegame_abc_50_round_v1`, 50 rounds) |
| Scenario set | `mainGame_2026_03_20_14_26_36` (orders `mainGameOrder*`, scenarios `mainGameScenario*`) |
| Personalized? | No (A/B/C recommendation arms) |
| Status | **Has real data** |

## Data (as run, verified 2026-06-23)

- 3,858 round records across 30 users. **11 properly tagged study sessions** (9 on this protocol, 2 on
  an earlier `bundlegame_chi_cscw_protocol`) plus ~17 untagged dev/test playthroughs.
- `policy_arm` is empty in every persisted round record (arm was not written into the action docs).
- Live raw export: `publishing/data_analysis/firestore_raw_export/<timestamp>/` (gitignored).
  Refresh with `node scripts/export-firestore-research.mjs --project-id bundling-63c10`.

## Code entry points

- Protocol: `BUNDLEGAME_STUDY_PROTOCOL_ID` in [`src/lib/researchStudy.js`](../../../src/lib/researchStudy.js).
- Analysis pipeline: `publishing/data_analysis/`, `publishing/export_for_analysis/`.
