# Experiment 2 — Enriched 4-order (June 30)

The near-term study on the **redesigned, transfer-first menus**. Canonical details:
[`docs/current/EXPERIMENTS.md`](../../../docs/current/EXPERIMENTS.md).

| field | value |
|---|---|
| Timeline | **June 30 deadline** |
| Protocol id / arms | `bundlegame_chi_dynamic_v1` **+ sign-survival gate** (diagnosis-driven; marginal / component / oracle / aggregate / control) |
| Menus | enriched `buildChiScenarioSet` (seed 42), >= 4 orders per round |
| Status | code on `main`; **NOT seeded** to Firestore |

> **Binding (resolved 2026-06-24):** the dynamic protocol plus the **sign-survival gate**
> (`src/lib/signSurvivalGate.js`), a server-side robustness layer on the diagnosis. It re-scores the
> diagnostic-block choices under a frozen grid (gamma in {0.25,0.5,1.0}, rho in {0,0.2,0.4}; nominal
> 1.0,0) and coaches a component only if its standardized signed attribution is sign-stable across the
> grid AND its bootstrap (B=120) worst-case clears +/- floor (0.15 SD units, pilot-calibrated then
> frozen); otherwise `no_target` -> the marginal arm falls back to the counterfactual rendering. The
> per-decision gate decision persists as `sign_survival_gate` (on the round-action allowlist). See the
> canonical [experiments map](../../../docs/current/EXPERIMENTS.md).

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
