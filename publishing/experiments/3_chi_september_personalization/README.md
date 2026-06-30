# Experiment 3 — CHI personalization / dynamic (September)

The **personalized, diagnosis-driven** CHI study for the September submission. Canonical details:
[`docs/shared/EXPERIMENTS.md`](../../../docs/shared/EXPERIMENTS.md).

| field | value |
|---|---|
| Timeline | **CHI September** |
| Protocol id | `bundlegame_chi_dynamic_v1` (version `bundlegame_chi_dynamic_counterfactual_35_round_v1`, 35 rounds) |
| Scenario set | `chi_dynamic_v1` (from `buildChiScenarioSet`; inherits the enriched menus once reseeded) |
| Personalized? | Yes (diagnosis-driven) |
| Status | defined and tested in code; **not live, not seeded** |

## How it differs from Experiment 2

Same 35-round A/B menu structure, but personalized: the cost-blindness **diagnosis** runs at
r15 / r25 / r35 and re-targets, and the ON-block feedback arm is diagnosis-informed
(control / aggregate / marginal / oracle; the `component` arm was dropped). Experiment 2's foundational variant keeps the
diagnosis dormant; this one runs it live.

## Code entry points

- Protocol: `CHI_STUDY_PROTOCOL_ID` + `buildChiStudyProtocol` in
  [`src/lib/researchStudy.js`](../../../src/lib/researchStudy.js).
- Diagnosis: [`src/lib/chiDiagnosis.js`](../../../src/lib/chiDiagnosis.js) (ridge conditional logit,
  spanning-subspace read, abstention gate).
- Runtime gating: [`src/lib/chiStudyRuntime.js`](../../../src/lib/chiStudyRuntime.js).
- Pre-registration: [`docs/study2_chi35_undergrad_prize/PREREGISTRATION_DYNAMIC.md`](../../../docs/study2_chi35_undergrad_prize/PREREGISTRATION_DYNAMIC.md).

## Design artifacts

The menus come from the same generator as Experiment 2, so the design tables in
`../2_june30_enriched_4order/design/` describe this study's menus too (until the two are seeded as
separate `scenario_set` ids).
