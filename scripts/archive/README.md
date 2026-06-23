# scripts/archive/ — completed one-off migrations

These are one-time Firestore migrations/backfills that have already been applied. They are kept for
provenance only. **Do not run them again** — they mutate production data and assume a prior schema.

| file | what it did (once) |
| --- | --- |
| `remove-scenario-difficulty-fields.mjs` | dropped legacy per-scenario difficulty fields |
| `remove-scenario-earnings-step.mjs` | dropped a legacy scenario earnings-step field |
| `remove-summary-timestamps.mjs` | removed stale Summary timestamps |
| `remove-tutorial-timelimit.mjs` | removed the tutorial time-limit field |
| `backfill-user-summary.mjs` | backfilled per-user Summary documents |

If you need a new migration, write a fresh, dated script in `scripts/` rather than re-running these.
