# Full-Paper-Ready Study Roadmap

## Current State

BundleGame is ready for pilot and benchmark analysis, but the existing `mainGame` data should not be used alone for strong recommendation-treatment claims. Treat the current class data as useful for descriptive behavior, baseline modeling, simulator fitting, and workflow validation.

The full-paper target requires a new treatment-aware study run with stable randomization, complete round timestamps, linked survey responses, frozen snapshots, and separated human/model/simulator evidence.

## Main Claims To Support

- Human decision quality over rounds: score ratio, regret, exact-optimal rate, near-optimal rate, rounds completed, failure rate, and timing/burden.
- Recommendation effects: arm-level comparison between control and recommendation policies during the assisted phase.
- Participant experience: trust, usefulness, workload, and completion-linked survey responses.
- Policy evaluation: human choices compared with historical-human, oracle, heuristic, behavior-clone, reward-model, contextual-bandit, CQL, and IQL baselines.
- Simulator-only stress tests: clearly labeled and never mixed into human-evidence tables.

## Required Study Setup

Before collecting main-study data:

- Prepare consent, IRB, or course-study approval as appropriate.
- Lock one enabled `ResearchProtocols` row.
- Use the canonical 50-round A/B/C structure from `src/lib/researchStudy.js`:
  - Phase A: rounds 1-15, no recommendations.
  - Phase B: rounds 16-35, randomized treatment/control arm.
  - Phase C: rounds 36-50, no recommendations for transfer or retention measurement.
- Use participant-level assignment only; never switch arms mid-session.
- Use default arms:
  - `control`
  - `contextual_bandit`
  - `rl_cql`
- Register at least one active `ResearchModels` row before launch.
- Confirm Qualtrics embedded data fields are live:
  - `bundleGameUserId`
  - `bundleGameResultCode`
  - `bundleGameSaveStatus`

## Readiness Gates

Use `/admin/research` after each test run. The main study is not ready for strong treatment claims unless:

- `missing_recommendation_labels` is absent.
- `missing_timestamps` is absent.
- `completed_game_mismatch` is absent.
- Phase B rows contain policy arm, policy name, policy version, recommendation source, shown recommendation bundle/ranking, legal action mask version, and dataset snapshot id.
- Survey coverage is at least 80% of included participants, or missingness is explicitly reported.
- Train/validation/test splits are participant-level only.
- Firestore-backed snapshots can be saved and queued for the research worker.
- The protocol validator reports no mismatch across `MasterData/centralConfig`, the grouped scenario dataset metadata, and the enabled `ResearchProtocols` row.

Claim policy:

- If recommendation labels are missing, do not make treatment-effect claims.
- If timestamps are missing, do not make temporal or learning claims from those rows.
- If completion flags mismatch round coverage, do not use completion as a headline metric.
- If simulator outputs are used, label them as simulation-only.

## Data Collection Sequence

1. Run a 3-5 participant pilot.
2. Run `npm run qualtrics:sync`.
3. Open `/admin/research`, run analysis, and check Study Readiness plus Claim Gate.
4. Export and inspect:
   - `analysis_master.csv`
   - `policy_training.csv`
   - `study_randomization.csv`
   - `participant_survey.csv`
   - `human_policy_eval.csv`
   - `dataset_snapshot.json`
   - `paper_manifest.json`
5. Fix any blocker before the main study.
6. Run the main study only after the pilot passes readiness gates.
7. Freeze the exact code commit hash and snapshot id used for each analysis milestone.

## Modeling Order

Run models in this order:

1. Historical human.
2. Oracle optimal.
3. Heuristic baseline.
4. Behavior cloning.
5. Direct reward model.
6. Contextual bandit or slate ranker.
7. Conservative offline RL: CQL primary, IQL ablation.
8. DQN only for simulator-only experiments unless later real data volume is high enough.

Report model outputs separately from human-study results:

- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`

## Figures And Tables

Required analysis outputs:

- Round attrition.
- Optimality by round.
- Regret by phase and arm.
- Survey summaries by arm.
- Policy comparison table.
- OPE table.
- Simulator-only ablation table.
- Data exclusion and QA blocker table.

## Paper Package

Archive for each manuscript milestone:

- Frozen snapshot exports.
- Code commit hash.
- Study protocol JSON.
- Survey instrument.
- Model configs and seeds.
- Model outputs and artifact paths.
- Figure-generation scripts or notebooks.
- QA report and data exclusion notes.
- Accessible figures and table text.
- Anonymized supplementary package where allowed.

## Submission Readiness Checklist

- Human-evidence tables and simulator-only tables are separated.
- Participant splits are participant-level only.
- Recommendation actions use legal-action masking.
- All treatment claims pass snapshot readiness gates.
- Survey, protocol, and model-registry artifacts are frozen with the snapshot.
- The manuscript includes limitations, ethics/consent handling, data exclusions, reproducibility notes, and accessibility-ready figures/tables.
