# Study 1: Pilot (INFORMS Best Working Paper submission)

The live recommendation study on the 50-round A/B/C `mainGame` task. This is the only study with real
participant data, and it backs the **INFORMS Best Working Paper submission**.

- **Protocol**: `bundlegame_abc_recommendation_v1` (version `bundlegame_abc_50_round_v1`), 50 rounds:
  Phase A 1-15 (recommendations off), Phase B 16-35 (by assigned arm), Phase C 36-50 (off). Source of
  truth: `src/lib/researchStudy.js`.
- **Scenario set**: `mainGame_2026_03_20_14_26_36`.
- **Artifacts**: [`publishing/experiments/1_live_recommendation_mainGame/`](../../publishing/experiments/1_live_recommendation_mainGame/README.md).
- **Section 5 simulation** built on this pilot: [`analysis/sim/SIMULATION.md`](../../analysis/sim/SIMULATION.md).

## Documents

| Document | Purpose |
| --- | --- |
| [EXPERIMENT_PROTOCOL.md](EXPERIMENT_PROTOCOL.md) | Canonical 50-round A/B/C protocol, randomization, Qualtrics linkage, claim gates |
| [EXPERIMENT_DESIGN.md](EXPERIMENT_DESIGN.md) | Human-readable design summary (task, phases, outcome families) |
| [PREREGISTRATION.md](PREREGISTRATION.md) | Pilot pre-registration |
| [RESEARCH_PLAYBOOK.md](RESEARCH_PLAYBOOK.md) | How to use the pilot data without overstating claims |
| [PAPER_ANALYSIS_WORKFLOW.md](PAPER_ANALYSIS_WORKFLOW.md) | Analysis workflow checklist |
| [FULL_PAPER_READY_STUDY_ROADMAP.md](FULL_PAPER_READY_STUDY_ROADMAP.md) | Readiness path from pilot data to a full study package |
| `experiment_reference.csv` | Round-by-round reference table for the task |

## See also

- Engineering map of all experiment configurations: [../shared/EXPERIMENTS.md](../shared/EXPERIMENTS.md)
- Reproduction commands: [../../ARTIFACTS.md](../../ARTIFACTS.md); table schemas: [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md)
- Cross-study infrastructure (architecture, models, governance): [../README.md](../README.md)
