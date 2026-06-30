# Study 2: CHI 35-round (INFORMS Best Undergraduate Research Prize)

The dynamic counterfactual-feedback study on the 35-round `buildChiScenarioSet` (seed 42) menus.
Diagnosis-driven (W1 pick time / W2 cross-city / W3 earnings), deployed and instrumented. It backs the
**INFORMS Best Undergraduate Research Prize**.

- **Protocol**: `bundlegame_chi_dynamic_v1` (version `bundlegame_chi_dynamic_counterfactual_35_round_v1`),
  35 rounds; diagnosis runs at r15/r25/r35 and re-targets.
- **Scenario generator**: `src/lib/chiScenarioDesign.js` (`buildChiScenarioSet`, seed 42); diagnosis in
  `src/lib/chiDiagnosis.js`.
- **Operationally** this study spans the "enriched 4-order (June 30)" and "CHI personalization
  (September)" configurations in the code; see the engineering map [../shared/EXPERIMENTS.md](../shared/EXPERIMENTS.md).
- **Artifacts**: [`publishing/experiments/2_june30_enriched_4order/`](../../publishing/experiments/2_june30_enriched_4order/README.md)
  and [`publishing/experiments/3_chi_september_personalization/`](../../publishing/experiments/3_chi_september_personalization/README.md).

## Documents

| Document | Purpose |
| --- | --- |
| [PREREGISTRATION_DYNAMIC.md](PREREGISTRATION_DYNAMIC.md) | Pre-registration for the dynamic counterfactual-feedback study |
| [MODEL_NOTES.md](MODEL_NOTES.md) | The diagnosis model: feature/bias scope, identifiability, learning-index approximation |
| [IDENTIFIABILITY_THEORY.md](IDENTIFIABILITY_THEORY.md) | Formal identifiability statements behind the deployed diagnosis |
| [LIVE_CHI_DYNAMIC_V2_VERIFICATION.md](LIVE_CHI_DYNAMIC_V2_VERIFICATION.md) | Live deployment verification of the dynamic v2 protocol |

## See also

- Engineering map of all experiment configurations: [../shared/EXPERIMENTS.md](../shared/EXPERIMENTS.md)
- Reproduction commands: [../../ARTIFACTS.md](../../ARTIFACTS.md); table schemas: [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md)
- Cross-study infrastructure (architecture, models, governance): [../README.md](../README.md)
