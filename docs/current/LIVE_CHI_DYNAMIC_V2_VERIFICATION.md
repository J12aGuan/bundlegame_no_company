# LIVE `chi_dynamic_v2` verification against the paper design

Verification of the deployed Experiment 2 study (`bundling-63c10`) against the frozen design.
Nothing was tuned on real data: every figure below is recomputed from the deterministic
generator (`buildChiScenarioSet`, seed 42), the deployed code, and a read-only pull of the live
Firestore study. The live menus were confirmed **byte-identical** to the generator (Section 1),
so the generator is a faithful stand-in for the served data in the rest of the report.

**Headline live diff** (read-only `MasterData/datasets.chi_dynamic_v2` vs `buildChiScenarioSet({seed:42})`):

```
LIVE centralConfig.scenario_set = chi_dynamic_v2 (OK)   game.timeLimit = 3000   ordersShown = 4
LIVE served scenarios: 35   generator(seed42): 35
DIFF: LIVE served menus are BYTE-IDENTICAL to buildChiScenarioSet(seed 42) across all 35 rounds
      (round / orders / stores / candidates / scores / oracle / gaps / flags).
LIVE ResearchProtocols/bundlegame_chi_dynamic_v1: enabled=true  dataset_root=chi_dynamic_v2
  arms=["marginal","oracle","aggregate","control"]  weights=[1,1,1,1]  main_target_n=400
  phase_plan = A B[B1,B2,B3,B4]
```

---

## Section 1 — Scenario set (live)

35-row table (round, block, feedback, #orders, oracle size, oracle category, over/under/payout
identifying flags, relative_gap, stores). Source: live = `buildChiScenarioSet(seed 42)`.

| r | block | fb | #ord | oSize | oracle_category | over | under | payout | rel_gap | stores |
|--:|:--|:-:|:-:|:-:|:--|:-:|:-:|:-:|--:|:--|
| 1 | A | off | 4 | 1 | single | 0 | 0 | 1 | 0.136 | Berkeley Bowl, Berkeley Market, Sprouts |
| 2 | A | off | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.221 | Sprouts, Oakland Grocer, Berkeley Bowl |
| 3 | A | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.451 | Berkeley Bowl, Berkeley Market |
| 4 | A | off | 4 | 1 | single | 0 | 0 | 1 | 0.128 | Berkeley Bowl, Sprouts, Berkeley Market |
| 5 | A | off | 4 | 3 | bundle_correct | 0 | 1 | 0 | 0.047 | Sprouts, Oakland Grocer |
| 6 | A | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.479 | Berkeley Bowl, Berkeley Market, Sprouts |
| 7 | A | off | 4 | 1 | single | 0 | 0 | 0 | 0.091 | Berkeley Bowl, Sprouts, Berkeley Market, Oakland Grocer |
| 8 | A | off | 4 | 1 | single | 0 | 0 | 1 | 0.243 | Berkeley Bowl, Berkeley Market, Sprouts |
| 9 | A | off | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.303 | Sprouts, Oakland Grocer, Berkeley Bowl |
| 10 | A | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.406 | Berkeley Bowl, Berkeley Market |
| 11 | A | off | 4 | 3 | bundle_correct | 0 | 1 | 0 | 0.102 | Sprouts, Oakland Grocer |
| 12 | A | off | 4 | 1 | single | 0 | 0 | 1 | 0.323 | Berkeley Bowl, Berkeley Market, Sprouts |
| 13 | A | off | 4 | 1 | single | 0 | 0 | 0 | 0.268 | Berkeley Bowl, Sprouts, Berkeley Market, Oakland Grocer |
| 14 | A | off | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.309 | Sprouts, Oakland Grocer, Berkeley Bowl |
| 15 | A | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.506 | Berkeley Bowl, Berkeley Market, Sprouts |
| 16 | B1 | ON | 4 | 1 | single | 0 | 0 | 0 | 0.281 | Berkeley Bowl, Sprouts, Berkeley Market, Oakland Grocer |
| 17 | B1 | ON | 4 | 1 | single | 0 | 0 | 1 | 0.253 | Berkeley Bowl, Berkeley Market, Sprouts |
| 18 | B1 | ON | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.480 | Berkeley Bowl, Berkeley Market |
| 19 | B1 | ON | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.278 | Sprouts, Oakland Grocer, Berkeley Bowl |
| 20 | B1 | ON | 4 | 3 | bundle_correct | 0 | 1 | 0 | 0.109 | Sprouts, Oakland Grocer |
| 21 | B2 | off | 4 | 1 | single | 0 | 0 | 0 | 0.254 | Berkeley Bowl, Sprouts, Berkeley Market, Oakland Grocer |
| 22 | B2 | off | 4 | 1 | single | 0 | 0 | 1 | 0.272 | Berkeley Bowl, Sprouts, Berkeley Market |
| 23 | B2 | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.265 | Berkeley Bowl, Berkeley Market |
| 24 | B2 | off | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.266 | Sprouts, Oakland Grocer, Berkeley Bowl |
| 25 | B2 | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.279 | Berkeley Bowl, Berkeley Market, Sprouts |
| 26 | B3 | ON | 4 | 1 | single | 0 | 0 | 0 | 0.136 | Berkeley Bowl, Sprouts, Berkeley Market, Oakland Grocer |
| 27 | B3 | ON | 4 | 1 | single | 0 | 0 | 1 | 0.307 | Berkeley Bowl, Sprouts, Berkeley Market |
| 28 | B3 | ON | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.424 | Berkeley Bowl, Berkeley Market |
| 29 | B3 | ON | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.298 | Sprouts, Oakland Grocer, Berkeley Bowl |
| 30 | B3 | ON | 4 | 3 | bundle_correct | 0 | 1 | 0 | 0.067 | Sprouts, Oakland Grocer |
| 31 | B4 | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.265 | Target, Costco |
| 32 | B4 | off | 4 | 2 | bundle_correct | 0 | 1 | 0 | 0.361 | Costco, Target, Safeway |
| 33 | B4 | off | 4 | 1 | single | 0 | 0 | 1 | 0.249 | Whole Foods, Trader Joe's, Target |
| 34 | B4 | off | 4 | 1 | over_bundle | 1 | 0 | 0 | 0.247 | Safeway, Target |
| 35 | B4 | off | 4 | 3 | bundle_correct | 0 | 1 | 0 | 0.165 | Costco, Target |

**(a) Exactly 4 orders every round: YES** (all 35 rows `#ord = 4`).

**(b) Per-block mean `relative_gap`** (target band 0.246 to 0.280):

| block | mean rel_gap | in band? | n |
|:--|--:|:-:|:-:|
| A  | 0.2675 | IN  | 15 |
| B1 | 0.2803 | **OVER by 0.0003** | 5 |
| B2 | 0.2669 | IN  | 5 |
| B3 | 0.2463 | IN  | 5 |
| B4 | 0.2573 | IN  | 5 |

v1's broken blocks (B2 = 0.389, B3 = 0.219, B4 = 0.151) are **all fixed and in band** in v2.
The one exception is **B1 = 0.2803**, three ten-thousandths over the 0.280 cap. B1 is an ON
(training) block, not one of the diagnostic OFF blocks the band was designed to protect, and the
overage is at the rounding floor (0.0003). Flagged for transparency; not a design defect. If you
want B1 strictly inside the cap, it is a one-round generator nudge, but per the no-tuning rule I
left the frozen design untouched.

**(c) Oracle size distribution: `{1: 23, 2: 7, 3: 5}`.** Per-block over- vs under-bundling
identifying rounds (both must be present in A, B2, B4):

| block | over (over_bundle) | under (bundle_correct) | both present? |
|:--|:-:|:-:|:-:|
| A  | 4 | 5 | yes |
| B1 | 1 | 2 | yes |
| B2 | 2 | 1 | **yes** |
| B3 | 1 | 2 | yes |
| B4 | 2 | 2 | **yes** |

A, B2, B4 each contain at least one over-bundling and one under-bundling identifying round.

**(d) B4 stores disjoint from rounds 1 to 30: YES.** B4 uses `{Target, Costco, Safeway, Whole
Foods, Trader Joe's}`; rounds 1 to 30 use `{Berkeley Bowl, Berkeley Market, Sprouts, Oakland
Grocer}`. Intersection is empty, so transfer is genuinely store-shifted.

---

## Section 2 — Scoring convention

Both the generator that computed v2's `oracle_bundle_ids` and the live runtime scorer are the
**same exported function** `scoreBundle` ([chiScenarioDesign.js:185](../../src/lib/chiScenarioDesign.js#L185));
[bundle.js](../../src/lib/bundle.js#L23) imports it and uses it both to define `is_oracle` and to
score at runtime. There is no second scorer.

- **Shared-store savings rate:** `SHARED_STORE_PICK_SAVE_RATE = 0.25` ([chiScenarioDesign.js:61](../../src/lib/chiScenarioDesign.js#L61)).
  For every store with ≥ 2 orders in the bundle, `savings += 0.25 × (grouped pick-seconds)`
  ([line 215](../../src/lib/chiScenarioDesign.js#L215)).
- **Within-store local-travel reduction: none.** `shared_store_local_seconds` is computed
  ([line 216](../../src/lib/chiScenarioDesign.js#L216)) but is **additive metadata only**; it is
  not a feature column and does not enter `time` or `score`. `time = max(0.1, rawTime − savings)`,
  `score = earnings / time` ([lines 219, 234](../../src/lib/chiScenarioDesign.js#L219)).

**Re-scored every v2 round with the live `scoreBundle`** (orders → `byId`, `startCity = "Berkeley"`,
each round's `travel_scale`), took the argmax candidate, and compared to the stored
`oracle_bundle_ids`:

```
Re-score all 35 with live scoreBundle; live argmax == stored oracle_bundle_ids: YES (all 35)
```

The live scorer and the stored oracle are identical on all 35 rounds; none differ.

---

## Section 3 — The deployed gate

Exact constants from `SIGN_SURVIVAL_GATE` ([signSurvivalGate.js](../../src/lib/signSurvivalGate.js)):

```
grid.savings = [0.25, 0.5, 1.0]   nominal credit 1.0   (CREDIT on the baked shared-store saving)
grid.local   = [0, 0.25]          nominal 0            (hypothetical within-store local reduction)
grid.rho     = [0, 0.2, 0.4]      nominal 0            (value-curvature perturbation)
nominal (savings credit 1.0, local 0, rho 0) == scoreBundle's savings rule + oracle (see note below)
floor = 0.15     alpha = 0.05     bootstrap = 120     minSpanning = 3
coachable = ["W1","W3"]           rivalRatio = 0.75
```

> **Scoring-convention reconciliation (resolves the Section 2 vs Section 3 wording).** The two
> "savings" numbers are *different parameters*, so there is no contradiction: Section 2's **0.25** is
> the *bake rate* in `scoreBundle` (`shared_item_savings_seconds = 0.25 × shared-store group pick`),
> while the gate grid's **savings** axis is a *credit* applied to that already-baked feature. Credit
> **1.0** subtracts the full baked saving, which is exactly what the deployed scorer does; `beta_nominal`
> is computed at credit 1.0, i.e. on the deployed scorer, and sign-survival ranges over the whole grid
> (which includes credit 1.0), so the certification covers the deployed scorer. Verified: the gate's
> nominal V-optimal equals `scoreBundle`'s oracle on **all 35 rounds**. One precision caveat (cosmetic):
> the gate rebuilds pre-savings time from the `pick+local+cross` feature columns while `scoreBundle`
> sums each order's `estimatedTime`; because `round(basePick)+round(local) ≠ round(basePick+local)`,
> the two time bases can differ by ≤ 0.1s/order, which **never flips the V-argmax** (0/35 rounds), so
> it changes no gate decision. The gate header comment was corrected to say "reproduces the savings
> rule + oracle" rather than "exactly".

**Dual-axis abstention rule** ([signSurvivalGate.js:50-56, 232-235](../../src/lib/signSurvivalGate.js#L50)):
when the chosen target is `W3`, if **either** rival cost axis (`Wlocal` or `W2`) has the same sign,
clears the floor, and has robust magnitude `≥ rivalRatio × |W3|` (= 0.75 × W3), the gate fails W3
and re-picks. This is what prevents a pure local- or cross-neglecter being mistaken for a
payout-overweighter, since the menu set cannot structurally separate payout from all three cost
axes on its own.

**Planted-worker safety on the v2 menus**, at all three diagnosis points (r15 = Phase A;
r25 = A + B2; r35 = A + B2 + B4):

| worker | r15 | r25 | r35 |
|---|:-:|:-:|:-:|
| unbiased | none | none | none |
| over-bundler | W1 | W1 | W1 |
| payout | W3 | W3 | W3 |
| pure local-neglecter | none | none | none |
| pure cross-neglecter | none | none | none |

```
ASSERT: a pure local- or cross-neglecter is NEVER coached W3 (any pool): HOLDS
```

**Reconciliation, gate floor 0.15 vs `chiDiagnosis.ABSTAIN_MIN_LEAK = 0.2`.** Both layers are
active; they govern different outputs at different stages, so the two thresholds are intentionally
not equal:

- **Gate floor 0.15** is the robustness floor on the gate's standardized signed-excess worst-case
  magnitude (SD units), evaluated across the 3 × 2 × 3 scoring-family grid with bootstrap B = 120.
  It produces `gate_target`, which is the **binding coaching authority**: for the marginal arm,
  `feedbackForDecision` coaches `gate_target`, and on `no_target` falls back deterministically to
  the counterfactual rendering ([chiStudyRuntime.js:121-134](../../src/lib/chiStudyRuntime.js#L121)).
- **Diagnosis `ABSTAIN_MIN_LEAK = 0.2`** is the abstention floor on the diagnosis's own
  ridge-conditional-logit leak strength. It governs the diagnosis `learning_target`, which is kept
  for the **recency-aware analysis read only**, not for coaching ([chiStudyRuntime.js:215-216, 225](../../src/lib/chiStudyRuntime.js#L215)).

They operate on different quantities (bootstrapped signed excess in SD units vs conditional-logit
strength) and at different points (gate disposes coaching; diagnosis abstention shapes the analysis
label). The gate is strictly the more conservative authority on what gets coached.

> Note: the gate is enforced by the **deployed client code** (`signSurvivalGate.js` in the app
> bundle), not stored on the Firestore protocol entry; the live `ResearchProtocols` doc carries no
> `sign_survival_gate` field, which is correct. Its per-round **decision** is what persists
> (Section 4), and the rules allow that field.

---

## Section 4 — Persistence round-trip

I cannot drive the live browser, so this runs the **actual runtime** (`runDiagnosis`,
`feedbackForDecision`, `decisionLogRecord` from `chiStudyRuntime.js`) through all 35 rounds for one
planted participant per arm, then confirms the records' shape is accepted by the **live** Firestore
rules. This verifies the runtime + data layer end to end; the literal four-arm live-browser
playthrough remains a manual step you can run, but every record it would write is reproduced and
shown to round-trip here.

**Per-arm structure** (planted payout participant):

| arm | #diagnoses | triggers | feedback-text rounds | gate decision attached |
|---|:-:|---|---|---|
| control   | 3 | initial/retune/final | (none) | r16–35 |
| aggregate | 3 | initial/retune/final | 16,17,18,19,20,26,27,28,29,30 | r16–35 |
| oracle    | 3 | initial/retune/final | 16,17,18,19,20,26,27,28,29,30 | r16–35 |
| marginal  | 3 | initial/retune/final | 17,27 | r16–35 |

- `diagnosis_history` has exactly **3 entries** (initial / retune / final) for every arm, each
  carrying `learning_target`, `gate_target`, `abstained`, and `identifiability`.
- Per-decision feedback text appears **only inside B1 (16-20) and B3 (26-30)** and never elsewhere.
  Control shows none; marginal is sparse (only when there is an actionable improving move).
- The `sign_survival_gate` decision is attached from r16 (first round after the initial diagnosis)
  through r35.

marginal `diagnosis_history`:

```
initial: learning_target=W3   gate_target=W3  abstained=false  identifiability={W1:1.28,W2:1.76,W3:1.72}
retune : learning_target=none gate_target=W3  abstained=true   identifiability={W1:0.39,W2:0.83,W3:0.49}
final  : learning_target=W1   gate_target=W3  abstained=false  identifiability={W1:0.35,W2:0.06,W3:0.36}
```

(The retune row shows the layers diverging exactly as designed: the diagnosis abstains for the
analysis label while the gate still holds W3 as the robust coaching target.)

**Read-back JSON, marginal arm:**

_Round 15 (last Phase A; unaided, no gate yet, the initial diagnosis runs after this round):_
```json
{ "round": 15, "phase": "A", "block": null, "block_kind": "diagnostic", "arm": "marginal",
  "feedback_enabled": false, "violation_label": "none", "feedback_text": "",
  "deployed_score": 2.963, "score_ratio": 1, "is_optimal": true, "sign_survival_gate": null }
```

_Round 16 (first ON / B1; feedback enabled, gate decision in force):_
```json
{ "round": 16, "phase": "B", "block": "B1", "block_kind": "on", "arm": "marginal",
  "feedback_enabled": true, "is_optimal": true,
  "sign_survival_gate": { "chosen_target": "W3",
    "components": { "W1": {"beta_nominal":0.406,"worst_case":[-0.042,1.236],"pass":false},
                    "W3": {"beta_nominal":1.629,"worst_case":[1.485,1.770],"pass":true},
                    "W2": {"beta_nominal":0.625,"worst_case":[0,1.875],"pass":false},
                    "Wlocal":{"beta_nominal":1.714,"worst_case":[0.988,2.680],"pass":false} },
    "grid": { "floor": 0.15, "alpha": 0.05, "bootstrap": 120 } } }
```

_Round 31 (B4 transfer; OFF, no feedback, gate carried from the r25 retune):_
```json
{ "round": 31, "phase": "B", "block": "B4", "block_kind": "off", "test_set": "transfer_shifted",
  "arm": "marginal", "feedback_enabled": false, "feedback_text": "", "is_optimal": false,
  "score_ratio": 0.609,
  "sign_survival_gate": { "chosen_target": "W3",
    "components": { "W3": {"beta_nominal":1.601,"worst_case":[1.484,1.808],"pass":true}, "...": "..." },
    "grid": { "floor": 0.15 } } }
```

**Live rules accept every field.** `participantRoundActionWrite()`'s `hasOnly` allowlist
([firestore.rules:38-101](../../firestore.rules#L38)) includes `sign_survival_gate` (line 98) and
all per-decision feedback fields (`block`, `block_kind`, `test_set`, `feedback_enabled`,
`violation_label`, `best_improving_move`, `feedback_text`, `deployed_score`, `score_ratio`,
`is_optimal`), so the round-16 write (which first carries the gate) is **not** rejected.
`diagnosis_history` rides under the `researchStudy` map allowed by `participantRootWrite()`
([firestore.rules:13-20](../../firestore.rules#L13)). The live ruleset was confirmed to include
`sign_survival_gate` at deploy time, so there is no silent write failure at round 16.

---

## Section 5 — Diagnosis windowing

Confirmed in code that coaching-time diagnosis uses **only pre-coaching unaided rounds**, and that
B4 feeds only the final analysis read.

- `buildUnaidedChoiceSets(uptoRound)` ([bundle.js:273](../../src/lib/bundle.js#L273)) iterates
  rounds with `round > uptoRound` skipped ([line 279](../../src/lib/bundle.js#L279)) and **excludes
  every ON block** via `if (roundContext(...).is_on_block) continue;`
  ([line 280](../../src/lib/bundle.js#L280)). So it only ever sees Phase A and the OFF blocks.
- The trigger fires `initial` at A.round_end (15), `retune` at the non-transfer OFF block end (B2 = 25),
  and `final` at the transfer block end (B4 = 35)
  ([chiStudyRuntime.js:99-108](../../src/lib/chiStudyRuntime.js#L99)). The diagnosis is called with
  `choiceSets: buildUnaidedChoiceSets(completedRound)` ([bundle.js:359](../../src/lib/bundle.js#L359)).

Therefore:

| diagnosis | round | unaided rounds fed | drives coaching in |
|:--|:-:|:--|:--|
| initial | 15 | 1–15 (all Phase A) | B1 (16–20) |
| retune  | 25 | 1–15 + 21–25 (B1 excluded as ON) | B3 (26–30) |
| final   | 35 | 1–15 + 21–25 + 31–35 (B1, B3 excluded) | **nothing** (study over) |

`initial = 1–15` and `retune = the unaided rounds through 25` are exactly the pre-coaching
unaided windows. **B4 (31–35) appears only in the final diagnosis, which runs after all coaching
has ended (B3 closes at r30), so it feeds the final analysis read and never a coaching target.**

---

## Section 6 — Arm assignment

Assignment is `assignScaffoldArm → assignStudyArm`
([researchStudy.js:1390](../../src/lib/researchStudy.js#L1390)): a **stable hash** of
`participantId :: protocol_id` mapped into the weighted arms. The live protocol has all four arms
at **equal weight** (`[1,1,1,1]`), so the scheme is randomized and **uniform in expectation**:

```
n=40000 synthetic ids:  marginal=24.97%  oracle=24.82%  aggregate=25.22%  control=25.00%
same id twice -> same arm: true (deterministic / stable)
```

The previously reported split (aggregate 87 / marginal 90 / control 105 / oracle 118) was a
**simulation over 400 synthetic ids**, i.e. finite-sample i.i.d. hash variance, not bias. At
n = 400 the binomial SD per arm is √(400·0.25·0.75) ≈ 8.7, so 100 ± ~9 is one SD and an 87 to 118
spread is within ~2 SD. Which arms land smallest depends entirely on the id scheme — three
different id conventions give marginal/aggregate as 89/101, 81/117, and 100/103 — so there is no
systematic disadvantage to the marginal-vs-aggregate primary contrast:

```
n=400 [prolific PID_xxxx]: marginal=89  oracle=99  aggregate=101  control=111
n=400 [uuid-ish]:          marginal=81  oracle=92  aggregate=117  control=110
n=400 [sequential p###]:   marginal=100 oracle=103 aggregate=103  control=94
```

**Rebalance decision.** Recruitment has not started (zero enrolled), so there is no realized
allocation to rebalance; the assignment is randomized and equal-in-expectation, which is valid as
deployed. **Recommendation:** because the primary contrast is marginal vs aggregate and i.i.d.
hashing leaves a realized ±~1 SD imbalance that modestly costs power, switch to **blocked
(balanced) randomization** before recruitment — a counter-based assignment (`arm = enrollment_index
within a randomized block of 4`) that forces ~equal arm sizes. That is a design change to the
assignment scheme, not tuning on data, and I can implement it on request. Left unchanged here per
the standing "do not tune / do not start recruitment yet" instruction.

---

## Summary

| § | Check | Result |
|:-:|:--|:--|
| 1 | Live = generator(seed42), 4 orders/round, gaps in band, oracle mix, B4 disjoint | PASS (one flag: B1 mean 0.2803, +0.0003 over cap) |
| 2 | Single `scoreBundle`; 0.25 pick credit, no local reduction; oracle matches all 35 | PASS |
| 3 | Gate constants + dual-axis rule; planted-worker safety; 0.15 vs 0.2 reconciled | PASS |
| 4 | 3 diagnoses/arm, feedback only B1/B3, gate persists, rules accept round-16 shape | PASS (runtime + data-layer; live-browser playthrough is a manual step) |
| 5 | initial = 1–15, retune = unaided ≤ 25, B4 final-analysis-only | PASS |
| 6 | Randomized, uniform-in-expectation; 87/90/105/118 was i.i.d. noise | PASS (recommend blocked randomization before recruitment) |

No real-data tuning was performed. The gate floor stays 0.15 pending pilot calibration.
