# Experiments map (single source of truth)

There are **three distinct experiments** in this repo. They share game code and a menu generator
but differ in purpose, timeline, protocol, arms, and status. This page is the canonical map; if any
other doc disagrees, this one wins. Last reconciled against live Firestore (`bundling-63c10`) on
**2026-06-23**.

## Mapping to the two studies and papers

The three experiment configurations roll up into **two studies**, each targeting one INFORMS BEST
submission:

| Study | Paper | Experiment configuration(s) below |
| --- | --- | --- |
| **Study 1 (Pilot)** | INFORMS Best Working Paper submission | Experiment 1 (Live recommendation, `mainGame`) |
| **Study 2 (CHI 35-round)** | INFORMS Best Undergraduate Research Prize | Experiment 2 (enriched 4-order) and Experiment 3 (CHI personalization), which share the 35-round dynamic protocol |

Study docs: [../study1_pilot_working_paper/README.md](../study1_pilot_working_paper/README.md) and
[../study2_chi35_undergrad_prize/README.md](../study2_chi35_undergrad_prize/README.md). The
per-experiment operational detail (timeline, seeding state, arms) follows below.

| # | Experiment | Timeline | Protocol id | Scenario set | Personalized? | Status |
|---|---|---|---|---|---|---|
| 1 | **Live recommendation (mainGame)** | already run | `bundlegame_abc_recommendation_v1` | `mainGame_2026_03_20_14_26_36` | no (A/B/C recommendation) | **has real data** |
| 2 | **Enriched 4-order + sign-survival gate** | **June 30 deadline** | `bundlegame_chi_dynamic_v1` **+ sign-survival gate** | enriched `buildChiScenarioSet` (seed 42), not yet seeded | yes (diagnosis-driven, gated) | code on `main`, **not seeded** |
| 3 | **CHI personalization (dynamic)** | **CHI September** | `bundlegame_chi_dynamic_v1` | `chi_dynamic_v1` (from `buildChiScenarioSet`) | yes (diagnosis-driven) | defined in code, **not live** |

> **Which is current?** Experiment 2 (the enriched 4-order menus run under the dynamic protocol with
> the sign-survival gate) is the **current/active instrument** the team is building toward. Seeding
> nuance: the enriched generator + gate are on `main`, but **not yet the seeded live set**, so a
> participant still boots the older `chi_foundational_v1` until a deliberate reseed. "Current in code"
> and "current for participants" are not the same thing yet.

> **Binding (resolved 2026-06-24).** Experiment 2 is the **dynamic protocol (`bundlegame_chi_dynamic_v1`)
> plus the sign-survival gate** (`src/lib/signSurvivalGate.js`) on the enriched 4-order menus, run with
> **FOUR equal-weight arms** (control / aggregate / marginal / oracle; the `component` arm was dropped),
> target ~100 per arm (~400 total). The gate is a server-side robustness layer on the diagnosis. Its
> NOMINAL scoring is identical to the study's oracle scorer `scoreBundle` (verified: nominal reproduces
> the oracle on all 35 rounds). It re-scores the diagnostic-block choices under a THREE-axis frozen grid
> -- savings credit on the shared-store saving {0.25, 0.5, 1.0} (nominal 1.0), within-store local-travel
> credit {0, 0.25} (nominal 0), and value curvature rho {0, 0.2, 0.4} (nominal 0); the nominal point
> (1.0, 0, 0) == scoreBundle. The attribution beta_k is the standardized signed excess
> mean_r(chosen_k - oracle_k under V) / global SD_k (unweighted), read on the earnings-identifying
> spanning menus. It coaches a coachable component (pick = W1, earnings = W3; cross = W2 logged, never
> coached) only if beta_k keeps the same sign across the whole grid AND its bootstrap (B=120) worst-case
> interval clears +/- floor (0.15 SD units, pilot-calibrated then frozen); otherwise `no_target` and the
> marginal arm falls back to the non-personalized counterfactual rendering. (NOTE: under a monotone V the
> rho axis does not move the oracle, so it does not change beta_k; the savings and local credits do.) The
> earlier foundational protocol (`bundlegame_chi_foundational_v1` / `chi_foundational_v1`) is the un-gated,
> non-personalized variant that is currently live; Experiment 2 does NOT reuse it.

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

## Experiment 2 — Enriched 4-order + sign-survival gate (June 30)

- **Purpose**: the near-term (June 30) study on the redesigned menus under the dynamic protocol, made
  robust by the sign-survival gate.
- **Protocol/arms**: `bundlegame_chi_dynamic_v1` (diagnosis-driven) with **FOUR equal-weight arms**
  (control / aggregate / marginal / oracle; the `component` arm was dropped), target ~100 per arm
  (~400 total; `main_target_n = 400`), **plus the sign-survival gate** as a server-side robustness
  layer on the diagnosis.
- **Menus**: the transfer-first enriched `buildChiScenarioSet` (seed 42): every menu >= 4 distinct
  orders; balanced oracle mix (realized seed-42 set: 14 single / 12 bundling-correct / 9 over-bundle); clean single-axis
  payout traps preserved; bundling-correct rounds appear transfer-first. The coaching/held-out blocks
  are difficulty-matched: each block's mean second-best gap is ~0.25 to 0.28 (A 0.27, B1 0.28,
  B2 0.27, B3 0.25, B4 0.26) after the B2 (was 0.39) and B4 (was 0.15) rebalance.
- **Sign-survival gate** (`src/lib/signSurvivalGate.js`, `SIGN_SURVIVAL_GATE`): its NOMINAL scoring
  reproduces the study oracle scorer `scoreBundle` exactly (verified on all 35 rounds). It re-scores
  the diagnostic-block choices under a THREE-axis frozen grid:
  `time = pick + local + cross - savingsCredit*shared_item_savings - localCredit*shared_store_local`,
  `score = earnings/time`, `V = score^(1-rho)`, for savingsCredit in {0.25, 0.5, 1.0} (nominal 1.0),
  localCredit in {0, 0.25} (nominal 0), rho in {0, 0.2, 0.4} (nominal 0); the nominal point
  (1.0, 0, 0) == scoreBundle. The attribution is the standardized signed excess
  `beta_k = mean_r(chosen_k - oracle_k under V) / global SD_k` (unweighted), read on the
  earnings-identifying spanning menus. It coaches a coachable component (pick = W1, earnings = W3;
  cross = W2 logged, never coached) only if beta_k keeps the same sign across the whole grid AND its
  bootstrap (B=120) worst-case 95% interval clears +/- floor (0.15 SD units; pilot-calibrated then
  frozen), picking the passing component with the largest robust magnitude, else `no_target` and the
  marginal arm falls back to the counterfactual rendering. Wired in `chiStudyRuntime.runDiagnosis`
  (the decision is logged as `sign_survival_gate` on each round-action; the field is on the
  `participantRoundActionWrite` allowlist) and `chiStudyRuntime.feedbackForDecision` (the fallback).
  Tests: `tests/js/sign-survival-gate.test.mjs` (the four planted-worker acceptance tests).
- **Status**: code merged, **not seeded** to Firestore.
- **Design artifacts**: `publishing/experiments/2_june30_enriched_4order/design/` (the per-round
  tables, CSVs, JSON, deep-dive, frozen numbers, analysis zip). Regenerate with
  `node scripts/dump-chi-scenarios.mjs` and `node scripts/print_frozen_numbers.mjs`.
- **Index**: `publishing/experiments/2_june30_enriched_4order/README.md`.

## Experiment 3 — CHI personalization / dynamic (September)

- **Purpose**: the personalized, diagnosis-driven CHI study for the September submission.
- **Protocol**: `bundlegame_chi_dynamic_v1` (`CHI_STUDY_PROTOCOL_ID`), version
  `bundlegame_chi_dynamic_counterfactual_35_round_v1`, 35 rounds. Diagnosis runs at r15/r25/r35 and
  re-targets; arms are the same four diagnosis-informed arms as Experiment 2 (control / aggregate /
  marginal / oracle; `component` was dropped from the dynamic protocol).
- **Scenario set**: `chi_dynamic_v1`, built from the same `buildChiScenarioSet` generator (so it
  inherits the enriched menus once reseeded).
- **Status**: defined and tested in code; **not live, not seeded**.
- **Index**: `publishing/experiments/3_chi_september_personalization/README.md`.

---

## Shared infrastructure (not experiment-specific)

- **Generator**: `src/lib/chiScenarioDesign.js` (`buildChiScenarioSet`, seed 42) feeds both CHI sets.
- **Diagnosis**: `src/lib/chiDiagnosis.js` (used by Experiments 2 and 3; dormant in the foundational
  protocol).
- **Sign-survival gate**: `src/lib/signSurvivalGate.js` (Experiment 2's robustness layer on the
  diagnosis; inert unless the dynamic protocol runs the diagnosis).
- **Analysis pipeline**: `publishing/data_analysis/`, `publishing/export_for_analysis/`.
- **Paper**: `publishing/paper/`, `publishing/paper_artifacts/`.
- **Seeding**: `scripts/seed-emulator.mjs` (Admin SDK; `--live` + `CHI_SEED_LIVE=1` for production).

## Open questions to resolve

1. ~~Experiment 2 protocol binding~~ **RESOLVED (2026-06-24):** dynamic protocol + sign-survival gate
   on the enriched 4-order menus.
2. Whether Experiments 2 and 3 share one seeded menu set or get separate `scenario_set` ids (both run
   the dynamic protocol; Experiment 2 adds the gate).
3. **Floor calibration**: the gate floor starts at 0.15 SD units. Calibrate it on the June 30 pilot,
   then FREEZE. Do not tune it (or the grid) on real data before then.
4. Re-seed plan: nothing is reseeded yet; live stays on `chi_foundational_v1` until a deliberate step.
