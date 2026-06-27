# Code map — what each part of the repo does

A newcomer's index to the codebase: where to find what, one line per module. For runtime concepts
(round flow, timing) see [ARCHITECTURE.md](ARCHITECTURE.md); for the three studies see
[EXPERIMENTS.md](EXPERIMENTS.md). This map should stay aligned with the tree; update it when modules
move.

## Top-level layout

| Path | What it holds |
| --- | --- |
| `src/` | The SvelteKit app: routes (pages) and `lib/` (all logic). |
| `scripts/` | Standalone CLI tools: tests, exports, seeding, simulations, migrations. See [`scripts/README.md`](../../scripts/README.md). |
| `tests/` | JS test suites (`tests/js/*.test.mjs`, run by `npm run test:js`). |
| `static/` | Static assets served verbatim (favicon and image assets). |
| `docs/` | Documentation. `current/` = live app; `archive/` = historical. |
| `publishing/` | Research artifacts, exports, and paper materials, organized by experiment. See [`publishing/README.md`](../../publishing/README.md). |
| `analysis/` | Standalone Section 5 simulation pipeline (`analysis/sim/`): the worker model + the policy feedback experiment over the frozen pilot data. See [`SIMULATION.md`](../../analysis/sim/SIMULATION.md). |
| `offline_rl/`, `offline_rl_deep/` | Standalone Python offline-RL packages (masked discrete-action; `_deep` is the PyTorch variant). Tested via `make test-python`. |
| `firestore.rules`, `firebase*.json`, `.firebaserc` | Firebase config and Firestore security rules. The backend is Firestore + rules only (no Cloud Functions). |
| `Makefile`, `package.json`, `vite.config.js`, `svelte.config.js` | Build, test, and CI entry points. |

### The three analysis locations (do not confuse them)

| Path | Purpose |
| --- | --- |
| `analysis/sim/` | Section 5 paper **simulation**: 85 pilot bots + the five-policy feedback experiment over the frozen pilot data. One command: `python analysis/sim/run_all.py`. See [`analysis/sim/SIMULATION.md`](../../analysis/sim/SIMULATION.md). |
| `publishing/analysis/` | Study **planning**: power analysis and the confirmatory-study plan (`power_analysis.py`, `confirmatory_plan.py`). |
| `publishing/data_analysis/` | The **analytics pipeline**: the `analytics_v1` Python package, fixtures, and Firestore export tooling that turns live data into model-ready tables. |

## `src/lib/` — application logic

### Core game runtime
| Module | Responsibility |
| --- | --- |
| `bundle.js` | Main game runtime: `loadGame`, the `scenario_set` read path, arm assignment, per-round persistence, and the per-decision log. |
| `config.js` | Runtime config defaults (penalty timeout, etc.), overridden from Firebase central config. |
| `bundleTime.js` | Timing model: estimates shared-item savings for same store+city groups. |
| `globalError.js` | Best-effort error logging that never interferes with gameplay. |

### Data + Firebase
| Module | Responsibility |
| --- | --- |
| `firebaseConfig.js` | Firebase SDK initialization. |
| `firebaseDB.js` | Firestore data-access layer: datasets, central config, user/round writes, and CHI per-decision feedback persistence. |
| `qualtrics.js` | Qualtrics survey linkage (result codes, embedded data). |
| `userRunMetrics.js` | Per-user run metric aggregation. |

### CHI study (Experiments 2 and 3)
| Module | Responsibility |
| --- | --- |
| `chiScenarioDesign.js` | The seed-42 menu generator `buildChiScenarioSet` + the design integrity check. |
| `chiSeed.js` | Pure seeding bridge: the persisted scenario shape + `buildChiSeedPayload`. |
| `chiStudyRuntime.js` | Runtime orchestration: block resolution, feedback gating (ON blocks only), re-diagnosis tuning. |
| `chiDiagnosis.js` | Cost-blindness diagnosis: ridge conditional logit, spanning-subspace read, abstention gate. |
| `marginalFeedback.js` | Per-arm feedback dispatch, including the counterfactual marginal-move renderer. |
| `menuSpan.js` | Numeric identifiability / observability check for the menus. |

### Research protocols, admin, analysis
| Module | Responsibility |
| --- | --- |
| `researchStudy.js` | The three study protocols + arm assignment + protocol validation (see the `EXPERIMENT N of 3` headers). |
| `adminAuth.js` | Admin-page authentication gate. |
| `adminScores.js` | Admin score-export shaping. |
| `authToken.js` | Admin/research auth token handling. |
| `analysis/engine.js` | Statistical analysis engine for the admin analysis dashboard. |
| `analysis/upload.js` | Data upload + parsing for the admin analysis page. |

### Legacy scenario generation (mainGame / Experiment 1)
| Module | Responsibility |
| --- | --- |
| `scripts/generateScenarios.js` | The mainGame (non-CHI) scenario generator. |
| `scripts/scenarioData.js` | Static scenario data constants. |
| `scripts/scenarioTime.js` | Scenario timing helpers. |

## `src/routes/` — pages

| Route | Purpose |
| --- | --- |
| `+page.svelte`, `bundlegame.svelte`, `order.svelte`, `home.svelte` | The participant game. |
| `ChiFeedbackPanel.svelte` | The CHI ON-block feedback panel. |
| `tutorial/`, `result/` | Tutorial flow and the participant result page. |
| `admin/` | Admin console: `analysis/`, `live/`, `masterdata/`, `research/`, `results/`. |
| `chi-play-dev/`, `chi-preview/`, `downloader/` | Developer/preview tools (not participant-facing). |

## Tests

`tests/js/*.test.mjs`, run by `npm run test:js`. Plus standalone test scripts wired into
package.json: `test:scores`, `test:protocol`, `test:generator`, `test:models`. Python tests via
`make test-python`.
