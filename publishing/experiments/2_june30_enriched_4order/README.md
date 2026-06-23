# Experiment 2 — Enriched 4-order (June 30)

The near-term study on the **redesigned, transfer-first menus**. Canonical details:
[`docs/current/EXPERIMENTS.md`](../../../docs/current/EXPERIMENTS.md).

| field | value |
|---|---|
| Timeline | **June 30 deadline** |
| Protocol id / arms | **UNIDENTIFIED (TBD)** |
| Menus | enriched `buildChiScenarioSet` (seed 42), >= 4 orders per round |
| Status | generator + tests on `main` (commit `1102fc1`); **NOT seeded** to Firestore |

> The protocol/arm binding for this study is **not yet decided**. The non-personalized foundational
> protocol (`bundlegame_chi_foundational_v1` / `chi_foundational_v1`) exists and is what is currently
> live, but whether the June 30 study reuses it or gets a new id is TBD. See the open questions in the
> canonical experiments map.

## The enrichment (what changed)

Raise every menu to >= 4 distinct orders (no 2-order binary picks) and add bundling-correct rounds
where the oracle is a genuine pair/triple with >= 12% single-order regret. Result: a balanced oracle
mix so the set tests under-bundling, not only over-bundling.

- Oracle mix: **13 single / 12 bundling-correct / 10 over-bundle** (sizes 23 single, 7 pair, 5 triple).
- Clean single-axis payout traps and the over-bundling-regret guarantee preserved; bundling-correct
  rounds appear transfer-first (B4 carries two). Deterministic at seed 42; integrity check PASS.

## Design artifacts (`design/`, gitignored, regenerable)

- `ANALYSIS_OVERVIEW.md` — schedule, oracle mix, per-round table, what each round tests.
- `chi_scenario_orders.csv` / `chi_scenario_bundles.csv` — the per-order and per-bundle modeling views.
- `chi_scenario_set.json` — the full structured set.
- `FROZEN_NUMBERS.txt` — design-adequacy metrics (planted biases, not human evidence).
- `CHI_SCENARIO_DESIGN_DEEPDIVE.md`, `CURRENT_STATE.md`, `round_explainer.html`.
- `chi_menu_analysis_overview.zip` — the bundled analysis overview.

Regenerate: `node scripts/dump-chi-scenarios.mjs`, then
`node scripts/print_frozen_numbers.mjs > publishing/experiments/2_june30_enriched_4order/design/FROZEN_NUMBERS.txt`.

## Code entry points

- Generator: [`src/lib/chiScenarioDesign.js`](../../../src/lib/chiScenarioDesign.js) (`buildChiScenarioSet`).
- Persisted shape: [`src/lib/chiSeed.js`](../../../src/lib/chiSeed.js).
