# BundleGame — facts to hand back to the source agent

Verified against the **deployed** experiment (`mainGame_2026_03_20_14_26_36`, 50 rounds,
`generateScenarios.js` @ `17989b5`) and the raw Firestore pull. ✅ = your assumption holds,
⚠️ = correction / watch-out.

1. **✅ Stores & cities — 4 stores, 4 cities, one store per city.**
   Target/Emeryville, Berkeley Bowl/Berkeley, Sprouts Farmers Market/Oakland, Safeway/Piedmont.
   Start city = **Berkeley**. (You named the 4 cities correctly.)

2. **✅ Phase split — A=1–15, B=16–35, C=36–50 (50 rounds).** Matches `researchStudy.js`
   (`bundlegame_abc_50_round_v1`). Phase A is the unaided Stage 1.

3. **⚠️ DECOY FILE — do NOT use `src/lib/chiScenarioDesign.js`.** It is a *separate,
   non-deployed* 30-round redesign (A 1–10 / B 11–20 / C 21–30) with **8 stores across 6
   cities** (adds Berkeley Market, Oakland Grocer, Costco/Richmond, Whole Foods/Albany).
   Reading it gives the wrong roster, wrong city list, wrong phase boundaries, and a
   `pick × 0.25` savings rule. None of it shipped.

4. **⚠️ Recommendations were OFF in EVERY round of the actual run.** The live session
   (participant arm = **control**) shows *"NO RECOMMENDATION — this round is running without
   a displayed recommendation."* The protocol/export marks rounds **16–35 (Phase B) as
   recommendation-*eligible***, but eligibility ≠ shown. In this dataset **no round was
   aided**. Treat the whole run as unaided; there is no aided condition to compare against
   unless other participants were assigned a bandit/RL arm.

5. **⚠️ The 0.25× reduction is NOT in the deployed scoring.** The deployed oracle/score uses
   **only** redundant-pick (shared item-access) savings at **rate 1.0**
   (`bundleTime.js`, `SHARED_ITEM_ACCESS_SAVE_RATE = 1`). The `0.25`
   (`LOCAL_TRAVEL_BUNDLE_SAVE_RATE`) exists only in (a) the offline analytics mirror
   `time_model.py` (subtracts `local_travel × 0.25` *on top*) and (b) the non-deployed CHI
   file. (Self-consistency check: my deployed recompute reproduces the deployed-*generated*
   `best_bundle_ids` 50/50, and reproduces the mirror export's candidate scores 13,434/13,434
   before the rule is changed — so the comparison below is exact, not noise.)

   **Consequence — this is big, not cosmetic.** Re-scoring all 13,412 mainGame candidates
   with the deployed scorer (keeping each participant's carried `current_city`):
   - the **optimal-bundle identity changes in 50.5% of decisions** (the 0.25 discount
     inflates multi-order bundles, so the mirror oracle is more often a bundle and the
     deployed oracle is more often a singleton; rounds 7/19/24 flip for every participant);
   - the **exact-optimal rate (chosen == oracle) roughly halves: 34.05% (mirror) → 17.42%
     (deployed)**. So any "% optimal" computed on the 0.25 mirror (e.g. the ~36% figure)
     is materially inflated vs what the live game actually rewarded.
   Pick the **deployed** model for any optimality/regret claim. See
   `data/candidates_deployed.csv`, `data/oracle_match_by_round.csv`,
   `data/deployed_rescore_report.md`.

6. **⚠️ No generator-designed traps or "what-it-tests" tags.** The deployed generator is
   procedural + seeded; `scenario_design.csv` has `trap_designed=False` and blank
   `intended_difficulty` for all 50 rounds. The only real per-round labels are `phase`,
   `generator_city_rule` (odd = `random_fair_target_city`, even = `anchored_to_prev_best_city`),
   `dispersion_designed`, `overlap_designed`. Any payout-trap / difficulty categorization must
   be **computed** (we did: `maxpay_*` / `*_trap_*` columns), not read as design intent.

7. **⚠️ Bundles are single-store only** (`same_store_multi_order_v1`), max size 3, menu = 4
   orders. "Dispersed" menus (2 cities) still only allow same-store bundling — dispersion
   changes routing, not what is bundleable.

8. **Emergent design facts (computed, deployed model):** optimal is a *single order*
   (do-not-bundle) in **23/50** rounds; a computed payout trap (top-paying legal bundle is
   sub-optimal) in **40/50** rounds, over-paying \$2–\$46; menus split 25 dispersed (odd) /
   25 compact (even); mean relative oracle-vs-2nd gap ≈ 0.062.
