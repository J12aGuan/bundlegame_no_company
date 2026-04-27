# Venue Positioning and Scoring

## Purpose

This note separates the class-facing BundleGame score from the research metrics that should be used in paper claims.

## Venue Positioning

Primary target: CHI/CSCW.

- CHI/CSCW: frame BundleGame as a human decision-making and decision-support study. Lead with learning curves, regret, optimality, participant strategies, and survey-linked completion.
- RecSys: frame BundleGame as an interactive recommender benchmark. Lead with recommendation baselines, off-policy evaluation, held-out reward/regret, and reproducible snapshots.
- FAccT/EAAMO: frame BundleGame as sociotechnical decision support. Lead with accountability, labor and participant burden, transparency, access/equity limits, and deployment risks.

## Research Metrics

For paper-facing analysis, do not use the admin `total_score` as the main outcome. Report decomposed metrics:

- `score_ratio_to_best`
- `percent_regret`
- exact-optimal rate
- near-optimal rate
- earnings
- rounds completed
- timing and burden measures
- survey completion and survey responses

For the current historical data, some rows lack usable per-round score ratios. In that case, use earnings and completion/progress metrics descriptively, and avoid claiming oracle-normalized decision quality for those rows.

## Admin Total Score

The admin CSV `total_score` is a class-relative delivery score for spreadsheet reporting:

```text
total_score = round(100 * (
  0.70 * outcome_score
  + 0.20 * optimal_score
  + 0.10 * progress_score
))
```

Definitions:

```text
outcome_score = average_score_ratio if available, otherwise earnings_normalized
earnings_normalized = (earnings - class_min_earnings) / (class_max_earnings - class_min_earnings)
optimal_score = optimal_rate / class_max_optimal_rate
progress_score = rounds_completed / class_max_rounds_completed
```

Interpretation:

- `outcome_score` carries most of the weight because delivery performance is the clearest class-facing outcome.
- `optimal_score` normalizes against the class maximum because exact optimal play is hard in this task.
- `progress_score` gives small credit for completing more rounds.
- Speed is not included because current historical rows cluster around the same total game time.

## Current Snapshot Summary

As of the latest score export:

- matched students: 57
- completed Qualtrics responses: 59 match-ready
- completed game runs without Qualtrics match: 13
- average earnings: about 771.74
- average rounds completed: about 16.14
- average optimal rate: about 0.1685

These class averages are exported separately from the student score rows so that class summaries are not mixed into participant-level data.
