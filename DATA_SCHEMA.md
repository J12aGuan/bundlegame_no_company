# BundleGame Data Schema

This guide describes the current data model for reviewers, reproducers, and future developers. It is the schema-oriented companion to [ARTIFACTS.md](ARTIFACTS.md).

## Schema Versions

| Area | Version / Source |
| --- | --- |
| Experiment protocol | `bundlegame_abc_50_round_v1` in `src/lib/researchStudy.js` |
| Legal action mask | `legal_bundle_mask_v1` |
| Scenario generator | `bundlegame_scenario_generator_v2` |
| Research feature version | `research_v2` |
| Raw/publication research export | `bundlegame_research_export_v1` |

Runtime, Firestore saves, and analytics should fail fast if the configured protocol or scenario snapshot conflicts with the canonical protocol.

## Firestore Collections

### `MasterData/centralConfig`

Runtime settings for the main task.

Important fields:

- `scenario_set`
- `game.timeLimit`
- `game.roundTimeLimit`
- `game.thinkTime`
- `game.penaltyTimeout`
- `game.ordersShown`
- `game.gridSize`
- `research_protocol.protocol_version`
- `research_protocol.expected_total_rounds`
- `research_protocol.phase_plan`
- `research_protocol.recommendation_exposure`

### `MasterData/tutorialConfig`

Tutorial settings and tutorial dataset selection.

### `MasterData/cities`

Cross-city travel-time source of truth.

```json
{
  "startinglocation": "Berkeley",
  "travelTimes": {
    "Berkeley": {
      "Oakland": 10
    },
    "Oakland": {
      "Berkeley": 10
    }
  }
}
```

Same-city travel is treated as `0`. Missing cross-city routes are validation problems, not implicit zeroes.

### `MasterData/datasets`

Grouped scenario datasets keyed by dataset root, for example `mainGame`.

Each dataset entry contains:

- `scenarios[]`: round and scenario metadata
- `orders[]`: order payloads
- `optimal[]`: oracle bundle rows and candidate-bundle metadata
- `metadata`: generator, protocol, and dataset provenance

### `Users/{participantId}`

Participant root document. Direct participant IDs and display labels are internal identifiers.

Important subcollections:

- `Orders`: individual order events or legacy order rows
- `Actions`: timestamped runtime events, including `round_summary`
- `Summary/summary`: per-dataset completion summary
- `Progress/progress`: per-dataset current progress
- `Action/actions`: compact per-scenario action summaries
- `DetailedAction/actions`: detailed timing/action payloads

### Study And Admin Collections

- `QualtricsResponses/{responseId}`: normalized completed survey rows
- `QualtricsSyncRuns/{runId}`: Qualtrics sync logs
- `ResearchProtocols/{protocolId}`: saved protocol rows
- `ResearchModels/{modelId}`: model registry rows
- `ResearchSnapshots/{snapshotId}`: frozen research snapshots
- `ResearchJobs/{jobId}`: queued Firestore analysis jobs
- `LiveSessions/{sessionId}` and `LiveSessions/{sessionId}/participants/{participantId}`: classroom live leaderboard state

## Scenario Dataset Tables

### `scenarios[]`

Expected fields:

- `round`
- `scenario_id`
- `phase`
- `order_ids`
- `max_bundle`
- optional `classification`, `score_gap`, `relative_gap`
- optional recommendation metadata for Phase B treatment arms

For the canonical study, exactly 50 scenario rows are expected.

### `orders[]`

Expected fields:

- `id`
- `city`
- `store`
- `items`
- `earnings`
- `estimatedTime`
- `localTravelTime`

Timing semantics:

- `estimatedTime` is modeled base time.
- Modeled order time is `estimatedTime + cityTravelTime`.
- Runtime delivery leg is `localTravelTime + cityTravelTime`.
- `cityTravelTime` comes from `MasterData/cities.travelTimes`.

### `optimal[]`

Expected fields:

- `scenario_id`
- `best_bundle_ids`
- `second_best_bundle_ids`
- `best_score`
- `second_best_score`
- `reward_components`
- `candidate_bundles[]`
- `reward_model_version`
- `route_optimizer_version`
- `legal_bundle_model_version`

Each `candidate_bundles[]` row should include:

- `rank`
- `legal`
- `legality_reason`
- `bundle_ids`
- `delivery_sequence_ids`
- `bundle_size`
- `score`
- `score_ratio_to_best`
- `regret_to_best`
- `earnings`
- `total_time_seconds`
- `travel_time_seconds`
- `local_travel_time_seconds`
- `cross_city_travel_time_seconds`
- `pick_time_seconds`
- `effective_pick_time_seconds`
- `shared_item_savings_seconds`
- `ending_city`
- `uncertainty_flags`

Candidate bundles are required for reproducible offline policy evaluation because they define the legal action set for each state.

## Runtime Decision Rows

The preferred participant decision source is `round_summary` in `Users/{participantId}/Actions`.

Core per-round fields:

- `round_index`
- `scenario_id`
- `phase`
- `chosen_orders`
- `success`
- `earnings`
- `duration`
- `createdAt`
- `current_city`
- `final_location`
- `study_protocol_id`
- `policy_arm`
- `policy_name`
- `policy_version`
- `dataset_snapshot_id`
- `legal_action_mask_version`
- `recommendation_source`
- `shown_recommendation_bundle_ids`
- `shown_ranked_bundles`

Older rows can be reconstructed from compact action summaries. Reconstructed rows should be labelled with `decision_source=action_summary_reconstructed` and are not equivalent to timestamped rows.

## Analytics Exports

The analytics pipeline emits these core files:

- `decision_fact.csv`: normalized decision facts and QA fields
- `analysis_master.csv`: one row per participant decision/round
- `policy_training.csv`: one row per state/action candidate for model training
- `study_randomization.csv`: participant arm assignment rows
- `participant_survey.csv`: survey rows linked to participant and policy arm
- `human_policy_eval.csv`: human outcome summaries by arm/phase
- `dataset_snapshot.json`: frozen snapshot manifest and QA gates
- `paper_manifest.json`: reproducibility package manifest
- `run_metadata.json`: pipeline inputs and counts

Recommendation/model outputs:

- `recommendation_workbench.csv`
- `recommendation_summary.csv`
- `policy_comparison.csv`
- `ope_summary.csv`
- `sandbox_summary.csv`

Monitoring outputs:

- `qa_issues.csv`
- `kpi_overall.csv`
- `kpi_by_round.csv`
- `kpi_by_participant.csv`
- `kpi_by_classification.csv`
- `kpi_by_scenario.csv`
- `kpi_timing_overall.csv`
- `kpi_timing_by_round.csv`
- `kpi_timing_by_classification.csv`
- `behavior_by_phase.csv`
- `behavior_by_recommendation_quality.csv`
- `behavior_by_trajectory_segment.csv`
- `participant_trajectories.csv`
- `trajectory_segments.csv`

## `policy_training.csv`

This is the model-facing masked action table. Required tuple fields:

- `participant_id` or `publication_participant_id`
- `state_id`
- `action_id`
- `next_state_id`
- `done`
- `round_index`
- `phase`
- `scenario_id`
- `state_policy_arm`
- `state_policy_name`
- `state_dataset_snapshot_id`
- `state_legal_action_mask_version`
- `action_legal`
- `action_bundle_ids`
- `action_delivery_sequence_ids`
- `observed_chosen_action`
- `reward_target`
- `observed_reward`

Every state should include every legal candidate bundle action for that scenario, with exactly one `observed_chosen_action=1` when the participant choice is recoverable.

## Raw And Publication Exports

`npm run scores:export` defaults to class/admin scores. Research table modes are:

```bash
npm run scores:export -- --mode raw_research_export
npm run scores:export -- --mode publication_export
```

Both modes write:

- `<mode>.json`
- `schema.json`
- `participant_summary.csv`
- `per_round_decisions.csv`
- `actions.csv`
- `recommendation_exposure.csv`
- `survey_linkage.csv`

`raw_research_export` keeps operational identifiers for internal QA. `publication_export` replaces direct participant IDs with stable pseudonyms and removes direct identifiers.

Publication decision and recommendation rows always preserve:

- `phase`
- `policy_arm`
- `scenario_id`
- `recommendation_source`
- `shown_recommendation_bundle_ids_json`
- `shown_ranked_bundles_json`
- `chosen_orders_json`
- `best_bundle_ids_json`
- `reward`
- `legal_action_mask_version`

Missing required values are recorded in `missing_required_fields_json`.

## Data Governance

Do not share raw Firestore exports, raw Qualtrics exports, `.env` files, result access keys, or admin/downloader credentials outside the approved research team.

Non-shareable direct identifiers include:

- participant names or display names
- raw `participant_id` values when they can identify a person
- game result access keys
- Qualtrics response IDs
- Qualtrics user IDs
- Qualtrics match keys
- raw survey payloads and free-text rows unless separately reviewed
- Firebase Auth emails, admin passwords, API tokens, and pseudonym salts

Use `publication_export` for reviewer or supplementary sharing. Set `PUBLICATION_PSEUDONYM_SALT` privately when stable pseudonyms are needed across exports. Keep the salt out of Git, browser-exposed env vars, and shared artifacts.
