# Experiments map (single source of truth)

There are **three distinct experiments** in this repo. They share game code and a menu generator
but differ in purpose, timeline, protocol, arms, and status. This page is the canonical map; if any
other doc disagrees, this one wins. Last reconciled against live Firestore (`bundling-63c10`) on
**2026-06-23**.

| # | Experiment | Timeline | Protocol id | Scenario set | Personalized? | Status |
|---|---|---|---|---|---|---|
| 1 | **Live recommendation (mainGame)** | already run | `bundlegame_abc_recommendation_v1` | `mainGame_2026_03_20_14_26_36` | no (A/B/C recommendation) | **has real data** |
| 2 | **Enriched 4-order** | **June 30 deadline** | **UNIDENTIFIED (TBD)** | enriched `buildChiScenarioSet` (seed 42), not yet seeded | TBD | generator on `main`, **not seeded** |
| 3 | **CHI personalization (dynamic)** | **CHI September** | `bundlegame_chi_dynamic_v1` | `chi_dynamic_v1` (from `buildChiScenarioSet`) | yes (diagnosis-driven) | defined in code, **not live** |

> **Which is current?** Experiment 2 (the enriched 4-order menus) is the **current/active instrument**
> the team is building toward. Note the seeding nuance: the enriched generator is on `main`, but it is
> **not yet the seeded live set**, so a participant still boots the older `chi_foundational_v1` until a
> deliberate reseed. "Current in code" and "current for participants" are not the same thing yet.

> **Unresolved binding (intentional).** Experiment 2's protocol/arm binding is **not yet decided**.
> The non-personalized foundational protocol (`bundlegame_chi_foundational_v1` / scenario set
> `chi_foundational_v1`) currently EXISTS in code and is what `centralConfig.scenario_set` points to
> live, but whether the June 30 study reuses it, gets a new id, or is something else is **TBD**. Do
> not assume `chi_foundational_v1` == the June 30 study until this line is updated.

## What is actually live right now (verified)

- `MasterData/centralConfig.scenario_set` = **`chi_foundational_v1`** (the OLD 2-to-3-orders-per-round
  set). A new participant boots that.
- **Zero** real participants have played any CHI set (`chi_foundational_v1` or `chi_dynamic_v1`).
- Every real result on the project (3,858 round records across 30 users) is from **Experiment 1**
  (`mainGame_2026_03_20_14_26_36`): 11 properly tagged study sessions (9 recommendation, 2 an earlier
  CHI-CSCW protocol) plus ~17 untagged dev/test playthroughs. `policy_arm` is empty in every record.
- The enriched 4-order menus (Experiment 2) are on `main` (commit `1102fc1`) but **not seeded**, so
  they change nothing a participant sees until a deliberate reseed.

---

## Experiment 1 — Live recommendation (mainGame)

- **Purpose**: the A/B/C recommendation study that has already collected data.
- **Protocol**: `bundlegame_abc_recommendation_v1` (`BUNDLEGAME_STUDY_PROTOCOL_ID`),
  version `bundlegame_abc_50_round_v1`, 50 rounds. See [researchStudy.js](../../src/lib/researchStudy.js).
- **Scenario set**: `mainGame_2026_03_20_14_26_36` (orders `mainGameOrder1..N`, scenarios
  `mainGameScenario1..N`).
- **Results**: raw export under `publishing/data_analysis/firestore_raw_export/<timestamp>/`
  (gitignored). Pull a fresh copy with `node scripts/export-firestore-research.mjs --project-id bundling-63c10`.
- **Artifacts/index**: `publishing/experiments/1_live_recommendation_mainGame/README.md`.

## Experiment 2 — Enriched 4-order (June 30)

- **Purpose**: the near-term (June 30) study on the redesigned menus.
- **Protocol/arms**: **UNIDENTIFIED / TBD** (see the note above).
- **Menus**: the transfer-first enriched `buildChiScenarioSet` (seed 42): every menu >= 4 distinct
  orders; balanced oracle mix (13 single / 12 bundling-correct / 10 over-bundle); clean single-axis
  payout traps preserved; bundling-correct rounds appear transfer-first. Generator + tests on `main`.
- **Status**: code merged (`1102fc1`), **not seeded** to Firestore.
- **Design artifacts**: `publishing/experiments/2_june30_enriched_4order/design/` (the per-round
  tables, CSVs, JSON, deep-dive, frozen numbers, analysis zip). Regenerate with
  `node scripts/dump-chi-scenarios.mjs` and `node scripts/print_frozen_numbers.mjs`.
- **Index**: `publishing/experiments/2_june30_enriched_4order/README.md`.

## Experiment 3 — CHI personalization / dynamic (September)

- **Purpose**: the personalized, diagnosis-driven CHI study for the September submission.
- **Protocol**: `bundlegame_chi_dynamic_v1` (`CHI_STUDY_PROTOCOL_ID`), version
  `bundlegame_chi_dynamic_counterfactual_35_round_v1`, 35 rounds. Diagnosis runs at r15/r25/r35 and
  re-targets; arms are diagnosis-informed (marginal / component / oracle / aggregate / control).
- **Scenario set**: `chi_dynamic_v1`, built from the same `buildChiScenarioSet` generator (so it
  inherits the enriched menus once reseeded).
- **Status**: defined and tested in code; **not live, not seeded**.
- **Index**: `publishing/experiments/3_chi_september_personalization/README.md`.

---

## Shared infrastructure (not experiment-specific)

- **Generator**: `src/lib/chiScenarioDesign.js` (`buildChiScenarioSet`, seed 42) feeds both CHI sets.
- **Diagnosis**: `src/lib/chiDiagnosis.js` (used live by Experiment 3; dormant in the foundational
  protocol).
- **Analysis pipeline**: `publishing/data_analysis/`, `publishing/export_for_analysis/`.
- **Paper**: `publishing/paper/`, `publishing/paper_artifacts/`.
- **Seeding**: `scripts/seed-emulator.mjs` (Admin SDK; `--live` + `CHI_SEED_LIVE=1` for production).

## Open questions to resolve

1. **Experiment 2 protocol binding** (the load-bearing TBD): which protocol + arms does the June 30
   study use? Update the table and this file once decided.
2. Whether Experiments 2 and 3 share one seeded menu set or get separate `scenario_set` ids.
3. Re-seed plan: nothing is reseeded yet; live stays on `chi_foundational_v1` until a deliberate step.
