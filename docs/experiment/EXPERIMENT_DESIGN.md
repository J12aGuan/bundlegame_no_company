# Experiment Design

This is the human-readable study design summary. The implementation source of truth is [../current/EXPERIMENT_PROTOCOL.md](../current/EXPERIMENT_PROTOCOL.md) and `src/lib/researchStudy.js`.

## Task

Participants play a delivery bundling game. Each round presents a small set of delivery orders. The participant chooses which orders to bundle, then completes a store and delivery flow. The system records the chosen bundle, timing, reward, comparison to the oracle bundle, and recommendation exposure when applicable.

## Current Protocol

| Phase | Rounds | Recommendation Exposure | Purpose |
| --- | --- | --- | --- |
| A | 1-15 | Off | Baseline decision behavior |
| B | 16-35 | Allowed by assigned arm | Recommendation exposure and arm comparison |
| C | 36-50 | Off | Transfer/retention behavior after exposure |

Default arms:

- `control`
- `contextual_bandit`
- `rl_cql`

Assignment is participant-level and should not change during a session.

## Scenario Structure

Each scenario row defines:

- round index
- phase
- scenario id
- order ids shown to the participant
- maximum bundle size
- optional classification and recommendation metadata

Each order row defines:

- city
- store
- earnings
- item payload
- modeled base time
- local delivery time

The city travel matrix in `MasterData/cities` supplies cross-city travel time.

## Oracle And Candidate Bundles

Generated scenario sets store every legal candidate bundle for each scenario in `optimal[].candidate_bundles[]`. Candidate metadata includes:

- bundle ids
- optimized delivery sequence
- earnings
- travel time
- pick time
- shared-item savings
- total time
- score ratio to best
- regret to best
- uncertainty flags

The legal action mask currently uses same-store bundle legality. Offline model training and policy evaluation should use the stored candidate bundle set when available.

## Main Outcome Families

Use decomposed metrics rather than the admin class score for research claims:

- score ratio to best
- percent regret
- exact-optimal rate
- near-optimal rate
- chosen bundle size
- failure rate
- rounds completed
- timing and burden measures
- recommendation exposure and compliance
- survey-linked trust, usefulness, and workload

## Current Evidence Limits

Historical `mainGame` rows are useful for descriptive behavior, benchmark baselines, and pipeline validation. Strong recommendation-treatment claims require a treatment-aware dataset with complete Phase B labels, timestamps, arm assignments, and survey linkage.

See [../../ARTIFACTS.md](../../ARTIFACTS.md) for reproduction commands and [../../DATA_SCHEMA.md](../../DATA_SCHEMA.md) for table schemas.
