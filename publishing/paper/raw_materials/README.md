# BundleGame paper raw materials

Generated from the **deployed** experiment data — the 50-round `mainGame` set
(`scenario_set_version_id = mainGame_2026_03_20_14_26_36`), produced by
`src/lib/scripts/generateScenarios.js` at commit `17989b5`. Ground-truth inputs:
`publishing/export_for_analysis/_raw_pull/{stores.json, cities.json, scenario_bundle.json}` and
`publishing/export_for_analysis/scenario_design.csv`.

**Verified against LIVE Firebase (project `bundling-63c10`) on 2026-06-13:** the active
`MasterData/centralConfig.scenario_set` is `mainGame`, and the live store grids, cities
travel matrix, the 200 `mainGame` orders, and all 50 oracle (best/second/ending-city)
entries are **byte-identical** to `sources/` — the live docs were last updated mid-March
and have not changed since. So these artifacts and the deployed re-scoring reflect exactly
what production runs.

## Folder layout (self-contained)
```
raw_materials/
  README.md                     this file
  CONTRADICTIONS_FOR_AGENT.md   the corrections list (read first)
  data/                         exported data artifacts
    stores.csv  time_model.json  round_design.csv
    candidates_deployed.csv     candidates.csv re-scored with the DEPLOYED scorer (+5 cols)
    oracle_match_by_round.csv   per-round deployed-vs-mirror oracle identity match
    deployed_rescore_report.md  fidelity + headline numbers
  figures/screenshots/          PNGs + .txt sidecars (all 2880x1800)
  scripts/                      builders (re-runnable against sources/)
    build_raw_materials.py  render_store_figures.mjs  capture_live_game.mjs
    rescore_candidates_deployed.py
  sources/                      the EXACT de-identified inputs everything derives from
    stores.json  cities.json  scenario_bundle.json  scenario_design.csv
```
Re-run: `python scripts/build_raw_materials.py` (writes `data/`), then
`node scripts/render_store_figures.mjs` (writes the `*_annotated`/`overlap_pair_*`
figures). `scripts/capture_live_game.mjs` reproduces the genuine in-game shots (needs a
running dev server + a valid participant token).

## Artifacts
| File | What it is |
|---|---|
| `data/stores.csv` | Store/city roster + grid dimensions, entrance, cellDistance, items. |
| `data/time_model.json` | Full pick / local / cross-city time model + per-store layouts with per-item access seconds + the three overlap-savings variants (deployed vs analytics-mirror vs CHI). |
| `data/round_design.csv` | One row per round (1–50): orders, stores/cities, layout, oracle + 2nd-best (recomputed, **verified 50/50 vs the deployed `best_bundle_ids`**), score gap, max overlap savings, a **computed** payout-trap analysis, and `recommendations_shown_in_run=False` (all rounds). |
| `figures/screenshots/store_interior_*.png` + `.txt` | **GENUINE in-game** store interiors (4), captured by authenticated play-through (participant `bobalab`, control arm). |
| `figures/screenshots/store_interior_*_annotated.png` | Supplementary renders of the same 4 grids with per-item nearest-access seconds overlaid. |
| `figures/screenshots/overlap_pair_*.png` + `.txt` | 4 overlap-pair figures (annotated renders; the live picking UI does not visually mark shared items). |
| `figures/screenshots/decision_screen.png` | Genuine decision screen showing the "NO RECOMMENDATION" study-arm panel. |
| `sources/*` | Exact inputs (deployed store grids, city travel matrix, scenario bundle, generator design flags). |

## Corrections to stated assumptions
- **Store count / cities — CONFIRMED (4 stores, 4 cities).** Target/Emeryville,
  Berkeley Bowl/Berkeley, Sprouts Farmers Market/Oakland, Safeway/Piedmont. One
  store per city. Start city = **Berkeley**. (Your store *names* weren't specified;
  the cities match exactly.)
- **A/B/C phase split — CONFIRMED for the deployed game.** Phase A = rounds **1–15**
  (recommendations OFF / unaided), B = **16–35** (recommendations ON), C = **36–50**
  (OFF). 50 rounds total (`researchStudy.js`). Your "Phase A = 1–15, unaided Stage 1"
  is correct. ⚠️ Do **not** confuse with `src/lib/chiScenarioDesign.js`, a *separate,
  non-deployed* 30-round redesign (A 1–10 / B 11–20 / C 21–30, 8 stores / 6 cities).
- **Recommendations — OFF in every actual round.** The live session confirms participant
  arm = **control** and *"NO RECOMMENDATION — this round is running without a displayed
  recommendation."* The protocol/export marks rounds 16–35 (Phase B) as recommendation-
  *eligible*, but none were shown in this run. `round_design.csv` therefore carries
  `recommendations_shown_in_run=False` (all 50) and a separate `phase_recommendations_eligible`
  (protocol intent). Treat the whole run as unaided.
- **0.25× rule — NOT in the deployed scoring.** The deployed oracle uses only
  redundant-pick (shared item-access) savings at **rate 1.0** (`bundleTime.js`,
  `SHARED_ITEM_ACCESS_SAVE_RATE = 1`). The `0.25` (`LOCAL_TRAVEL_BUNDLE_SAVE_RATE`)
  exists only in the **offline analytics mirror** (`time_model.py`, adds
  `local_travel × 0.25`) and the **non-deployed CHI redesign** (`chiScenarioDesign.js`,
  `pick × 0.25`). Consequence: oracle *bundle identity* matches across models (we
  verified 50/50), but score-*gap magnitudes* in `round_design.csv` (deployed model)
  differ from `publishing/export_for_analysis/scenarios.csv` (0.25 mirror).
- **No generator-designed traps / "what-it-tests" tags.** The deployed generator is
  procedural+seeded; `scenario_design.csv` has `trap_designed=False` and blank
  `intended_difficulty` for all 50 rounds. The only per-round design labels are
  `phase`, `generator_city_rule` (odd=`random_fair_target_city`, even=
  `anchored_to_prev_best_city`), and `dispersion_designed`/`overlap_designed`. The
  payout-trap fields in `round_design.csv` are **computed** by us (max-earning legal
  bundle vs oracle), clearly named `maxpay_*` / `*_trap_*`.
- **Legal bundles are single-store only.** A multi-order bundle is legal only if all
  orders share one store (`same_store_multi_order_v1`), max bundle size 3, menu = 4
  orders. "Dispersed" menus still only allow same-store bundling.

## Deployed re-scoring of candidates.csv (`data/candidates_deployed.csv`)
Re-scored all 13,412 mainGame candidate rows with the **deployed** scorer (rate 1.0, no
0.25), preserving each participant's actual carried `current_city` (recovered exactly from
the singleton candidates' cross-city). Fidelity: reproduced the mirror on **13,434/13,434**
rows (max error 0.00000) before switching the rule. Added columns: `deployed_score`,
`deployed_total_time_seconds`, `deployed_regret_to_best`, `deployed_score_ratio_to_best`,
`is_oracle_deployed`. Findings:
- **Oracle bundle identity changes in 635/1257 (50.5%) of decisions** — the mirror's
  0.25 local-travel discount inflated multi-order bundles, so the mirror oracle is more
  often a bundle; the deployed oracle is more often a smaller bundle/singleton. Rounds 7,
  19, 24 flip for **every** participant.
- **Exact-optimal rate (chosen == oracle) roughly halves: 34.05% (mirror) → 17.42%
  (deployed), −16.6 pp.** (The 36.6% you cited is close to the mirror baseline; the
  deployed-scorer truth is ~17%. Analyses built on the 0.25 mirror overstate optimality.)
- Singleton candidates are unaffected (no bundling savings); only multi-order bundles
  lose value under the deployed rule.

## Headline numbers (from `round_design.csv`)
- Layout: 25 dispersed (odd rounds, 2 cities) / 25 compact (even rounds, 1 city).
- **Optimal is to NOT bundle (single order) in 23/50 rounds**; oracle size 2 in 20, size 3 in 7.
- **Computed payout trap in 40/50 rounds** (A 12/15, B 16/20, C 12/15): the
  highest-paying legal bundle is sub-optimal, over-paying by \$2–\$46.
- Mean relative oracle-vs-2nd gap ≈ 0.062; max overlap savings available 1.2–9.9 s.
- Layout spread (mean / max nearest-access s): Target 1.62 / 2.70 · Berkeley Bowl 1.08 / 1.80 · Sprouts 1.29 / 2.25 · Safeway 0.93 / 1.40.

## Task 4 note (figures provenance)
The `store_interior_*.png` are **genuine in-game screenshots** from an authenticated
play-through (`capture_live_game.mjs`, participant `bobalab`, control arm). The driver
logs in, plays real rounds (select one order → travel → pick exact items → checkout →
deliver), and screenshots each store's actual aisle grid the first time it is entered:
Berkeley Bowl (r2/r4), Sprouts (r5), Target (r7), Safeway (r9). Progress saves per
completed round, so the run consumed real rounds of `bobalab`'s session.

The `*_annotated.png` and `overlap_pair_*.png` are deterministic renders of the same
deployed grids with per-item access seconds / shared-item highlighting overlaid — kept
because the live picking UI does not visually mark which items two orders share (the
overlap savings concept), and Berkeley Bowl's best overlap round had already been
consumed before that capture was attempted. All figures share an identical 2880×1800
frame.
