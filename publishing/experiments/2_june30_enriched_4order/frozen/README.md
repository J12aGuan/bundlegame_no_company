# Frozen CHI confirmatory sequence (picking-primary), seed 42

This is the frozen simulation input. The simulation loads
[`chi_scenario_set_seed42.json`](chi_scenario_set_seed42.json) directly — it does **not** read
the deployed Firestore set, so the simulation needs no re-seed. Regenerate with:

```
node scripts/emit-frozen-scenario-set.mjs
```

It is deterministic: `buildChiScenarioSet({seed:42})` (a seeded LCG + the pure `scoreBundle`)
produces byte-identical output on every run. Current JSON sha256:

```
6cf127d24fe20f57f1136fc27b2dafbeaa8da751d53d1a7aaecb29c430557823
```

## Task model (mirrors the validated pilot)

- **Per-store aisle layouts** ([`CHI_STORE_LAYOUTS`](../../../../src/lib/chiScenarioDesign.js)): each
  store is a 3×3 grid with a per-store cell rate (Berkeley Bowl 0.6 / Target 0.9 / Sprouts 0.75 /
  Safeway 0.7 s/cell, plus five new stores), so the same items cost different pick time per store.
- **Pick derives from the layout**: pilot rule = sequential aisle walk from the Entrance
  (`Σ manhattan × cellDistance/1000`) + 3 s handling per unique fruit. Orders carry real fruit items.
- **Scoring**: `time = pick + local + cross − 0.25·(shared-store group pick)`, `score = earnings/time`.
- **Travel (comfort-scaled)**: a single uniform `TIME_COMFORT_SCALE = 2/3` multiplies every time
  component (pick, local, cross) so rounds are shorter for UX. Raw geometry: within-city local 5 to 8 s,
  cross-city 8 to 18 s scaled by map distance (nearer cheaper), same-city 0. After the comfort scale the
  scored values are local 3.3 to 5.3 s and cross 5.3 to 12 s (worst hop 12 s, median 8 s, no leg over
  12 s). The scale is uniform so it cancels in earnings/time: every oracle, gap, regret and diagnosis
  ratio is invariant (oracle-stability 35/35 vs the pre-scale set; controlled-gap means unchanged).
  Within-city stays strictly below between-city (max local 5.2 s < min cross 5.33 s); max 4-order
  bundle about 40 s.

## Design (picking-primary)

- **Trap battery = cross + pick.** The local-axis payout trap was **dropped**: under the richer
  pick-dominated scale a clean local trap requires within-city > between-city geometry, which we
  removed. Cross traps are the earnings-identifying menus (low-pick high-pay H in a far city).
- **W1 (over-bundling / pick) is the coachable axis.** **W3 (payout) is measured, not coached.** On
  the earnings-identifying menus a payout-overweighter and a cross-neglecter choose identically
  (≈83% agreement) so W3 is confounded with cross; the gate safely abstains on payout
  (`no_target` → counterfactual fallback). The diagnosis still *measures* a payout signal.
- Five-block A/B1/B2/B3/B4 schedule, four orders/round, multiple stores per city, oracle
  two-sidedness (single/pair/triple), B4 stores disjoint from rounds 1–30.

## Property battery (all pass on this set)

- Controlled-rounds (single / over-bundle / trap / route) second-best-gap mean in **0.246–0.280**
  for all five blocks; bundle-correct rounds controlled by best-vs-single regret (≥ 0.12) instead.
- Planted **over-bundler → W1** at r15/r25/r35; **local- and cross-neglecter never W3**.
- 4 orders/round, oracle two-sidedness, B4 disjoint, 34/35 oracle category/size stable vs the prior
  set, max bundle ≈ 50 s.
- Detection validity: strong-over-bundler recall **86%**, B4 over-bundling transfer regret **≈41%/round**,
  B4 is the *same* trap kind as the B1/B3 coaching rounds (3-order over-bundle, oracle a strict
  subset; differs only in stores), and a real marginal-vs-aggregate information gap (marginal names
  the exact drop + rate gain; aggregate gives only the scalar rate).

## RECORDED, not fixed: W1-coachable subgroup is ~60% precision

The pre-registered primary subgroup (participants the gate diagnoses **W1-coachable at the initial
unaided Phase-A read**) is **contaminated**: in the mixed-profile sim its precision is **≈60%** —
about **40% are payout-rooted over-bundlers** caught as W1 via the structural W1/W3 confound (they
over-bundle for pay, not from pick-neglect). Recall on genuine pick-neglecters is ~67% (86% for the
strong ones).

This is a **measurement property of the gate under the dropped-W3 design, not a sequence defect**,
and it is **left as-is** (no floor / density / magnitude change). Any subgroup analysis — simulated
or live — must therefore:

1. treat the W1-coachable subgroup as a **contaminated** intent-to-treat-within-diagnosed set, and
2. report the **W1-true effect separately** (in the simulation the true bias weights are known, so
   the true-W1 subgroup is recoverable; live, it is a sensitivity bound).

Use the conservative end of any assumed effect band to absorb this dilution when sizing.
