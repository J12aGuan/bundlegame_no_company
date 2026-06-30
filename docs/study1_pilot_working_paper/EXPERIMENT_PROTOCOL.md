# Experiment Protocol

This document is the current protocol reference for BundleGame. The implementation source of truth is `src/lib/researchStudy.js`.

## Canonical Structure

| Field | Value |
| --- | --- |
| Protocol id | `bundlegame_abc_recommendation_v1` |
| Protocol version | `bundlegame_abc_50_round_v1` |
| Total rounds | `50` |
| Legal action mask | `legal_bundle_mask_v1` |
| Default arms | `control`, `contextual_bandit`, `rl_cql` |

Phase plan:

| Phase | Rounds | Recommendation Exposure |
| --- | --- | --- |
| A | 1-15 | Off |
| B | 16-35 | Allowed by participant arm |
| C | 36-50 | Off |

Only Phase B treatment arms should show recommendation bundles. Control participants should not see recommendations.

## Runtime Requirements

Every collected round should record:

- participant id
- session or dataset version
- scenario id
- round index
- phase
- timestamp
- duration
- completed/failure state
- chosen bundle
- oracle bundle
- score ratio to best
- regret
- exact/near optimal flags
- assigned arm
- policy name and version
- recommendation source
- shown recommendation bundle or ranking
- legal action mask version
- dataset snapshot id when available

## Randomization

Arm assignment must be participant-level:

- one stable arm per participant
- assignment recorded before gameplay starts
- assignment never changes mid-session
- assignment appears in `study_randomization.csv`

The current default arm set is:

- `control`: no recommendation display
- `contextual_bandit`: analysis-time contextual-bandit baseline
- `rl_cql`: planned offline-RL treatment arm; should not be treated as trained unless a model artifact is registered

## Qualtrics Linkage

Qualtrics survey flow should include these embedded data fields:

- `bundleGameUserId`
- `bundleGameResultCode`
- `bundleGameSaveStatus`

The embedded game sends `postMessage` completion events. The Qualtrics question JavaScript should listen for those messages and populate the embedded fields before letting the participant advance.

Sync completed responses with:

```bash
npm run qualtrics:sync
```

Matched survey rows are written to `QualtricsResponses`.

## Snapshot Gates

`dataset_snapshot.json` blocks strong claims when any of these are present:

- `missing_recommendation_labels`
- `missing_timestamps`
- `completed_game_mismatch`

Interpretation:

- If recommendation labels are missing, do not make recommendation-treatment claims.
- If timestamps are missing, do not make temporal or learning claims from those rows.
- If completion flags mismatch round coverage, do not use completion as a headline metric.

## Validation Layer

The following paths validate the protocol:

- runtime config loading
- Firestore scenario saves
- research protocol saves
- `computeAnalytics()`
- JS regression tests under `tests/js/`

Validation rejects:

- non-50-round protocol definitions
- missing or duplicate scenario rounds
- phase labels that conflict with round number
- recommendation flags outside Phase B
- Firestore protocol config that drifts from the code-level canonical protocol

## Current Evidence Status

Historical `mainGame` rows are useful for descriptive behavior, benchmark baselines, export testing, and workflow validation. Strong treatment-effect claims require a new treatment-aware dataset that passes the snapshot gates above.
