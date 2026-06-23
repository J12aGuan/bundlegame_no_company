# scripts/ — standalone CLI tools

Every script here is a standalone Node CLI (run with `node scripts/<name>.mjs`). The ones wired into
`package.json` are the supported entry points; the rest are manual developer tools. Grouped by purpose:

## Test runners (wired into `npm run`)

| npm script | file | what it checks |
| --- | --- | --- |
| `test:scores` | `test-admin-scores.mjs` | admin score export shape |
| `test:protocol` | `test-research-protocol.mjs` | research protocol validation |
| `test:generator` | `test-scenario-generation.mjs` | scenario generation |
| `test:models` | `test-model-registry.mjs` | model registry maturity |

(The main suite is `npm run test:js` over `tests/js/`.)

## Live Firestore: exports, ops, research (wired into `npm run`)

| npm script | file | purpose |
| --- | --- | --- |
| `firestore:connection:check` | `firestore-connection-check.mjs` | verify Admin SDK credentials + connectivity |
| `firestore:export:raw` | `export-firestore-research.mjs` | full raw export of all collections |
| `firestore:export:publication` | `export-firestore-publication-safe.mjs` | pseudonymized publication-safe export |
| `scores:export` | `export-admin-scores.mjs` | admin score export |
| `research:summary` | `research-data-summary.mjs` | summary stats over research data |
| `research:worker` | `research-worker.mjs` | research job worker |
| `qualtrics:sync` | `sync-qualtrics-responses.mjs` | pull Qualtrics survey responses |
| `token` | `generate-auth-token.mjs` | mint an admin/research auth token |

Shared libraries (imported, not run directly): `firestore-admin-export-common.mjs`, `research-common.mjs`.

## Paper artifacts (wired into `npm run`)

| npm script | file |
| --- | --- |
| `paper:artifacts` | `generate-paper-artifacts.mjs` |
| `paper:figures-pdf` | `generate-paper-figures-pdf.mjs` |

## CHI study: design, simulation, identifiability (manual dev tools)

| file | purpose |
| --- | --- |
| `check-menu-span.mjs` | menu span / observability check |
| `demo-observability.mjs` | observability demo (see docs/IDENTIFIABILITY_THEORY.md) |
| `stress-chi-identifiability.mjs` | identifiability stress test |
| `sweep-chi-rediagnosis.mjs` | re-diagnosis tuning sweep (see docs/PREREGISTRATION_DYNAMIC.md) |
| `simulate-chi-study.mjs` | study-level simulation |
| `simulate-chi-dynamic.mjs` | dynamic-arm simulation |
| `simulate-chi-gameplay.mjs` | realistic noisy-population gameplay sandbox |
| `chi-participant-probe.mjs` | scripted-participant emulator probe (see docs/EMULATOR_SMOKE.md) |

## Seeding + emulator smoke (manual)

| file | purpose |
| --- | --- |
| `seed-emulator.mjs` | Admin-SDK seeder (`--foundational`, `--live` + `CHI_SEED_LIVE=1` for production) |
| `seed-chi-dataset.mjs` | CHI dataset seed helper (used by `seed-emulator.mjs`) |
| `drive-emulator-game.mjs` | drive the game on the emulator (docs/EMULATOR_SMOKE.md) |
| `readback-emulator.mjs` | read back emulator state (docs/EMULATOR_SMOKE.md) |

## Local-only helpers (gitignored)

Not in origin: `dump-chi-scenarios.mjs` and `print_frozen_numbers.mjs` (regenerate the enriched-menu
design dump + frozen numbers) and `_*.mjs` (ad-hoc local probes).

## Archived one-offs

Completed one-time Firestore migrations live under [`archive/`](archive/README.md). They were applied
once and are kept only for provenance; do not run them again.
