# Frozen Section 5 inputs: deployed-scored pilot data

These files are the frozen inputs for the Section 5 bot simulation. Every row is scored by the
**deployed scorer** (what pilot participants actually saw and responded to), validated 55/55 against
the stored deployed values.

## Files

- `pilot_decisions_deployed.csv` : one row per decision (85 participants, 1268 rows). Per-decision menu
  (four orders with id/store/city/earnings and pick/local/cross), chosen bundle, deployed oracle and
  regret, oracle size, round type, and (for the rows that have it) the stored deployed oracle/regret.
- `frozen_bundle_menu_data.csv` : one row per FEASIBLE bundle in every pilot menu (13,540 rows), with
  payout, picking/local/cross time, overlap savings, total time, score, is_oracle, is_chosen. This is
  the single artifact the simulation reads.
- `reconstructed_cities_matrix.csv` : the reconstructed pilot cross-city matrix with per-pair observation
  count and spread (audit trail for the matrix recovery).
- `frozen_inputs/pilot_stores.json`, `frozen_inputs/pilot_cities.json` : the exact pilot-era store grid
  and cities matrix used by the re-scoring (see Provenance).

Participant ids are pseudonymized to stable tokens (`p001`..). The token to id map is kept LOCAL and
gitignored (`pilot_pseudonym_map.csv`); it is never committed.

## The deployed scorer (what produced these scores)

- Source: `src/lib/analysis/engine.js` `scoreBundle` -> `computeModeledBundleTime` ->
  `src/lib/bundleTime.js` `applySharedItemBundleSavings` / `calculateSharedItemTravelSavings`.
- Time of a bundle = sum over orders of (`estimatedTime` + cross-city extra from the running city),
  minus shared-item-access savings. `score = earnings / time` (game dollars per second).
- Overlap savings (DEPLOYED): for each same-store same-city group of two or more orders, for each item
  present in two or more of those orders, subtract `nearest_access_seconds(item) * (count - 1) * 1.0`.
  This is item-access (pick-walk) only. The 0.25x local-travel and 0.25x group-pick variants are the
  analytics mirror and the CHI redesign respectively, and are NOT what produced the deployed values.
- Feasibility: single-store subsets up to `max_bundle` (3); singles always feasible.
- Oracle: the dataset's static generation-time `best_bundle_ids` (the optimal shown per scenario),
  scored under the decision's current city. NOT a per-decision argmax (an argmax over the live feasible
  set picks larger same-store bundles and disagrees with the deployed oracle on 10 of 55 rows).
- regret = max(0, (oracle_score - chosen_score) / oracle_score).

## Provenance: why the inputs are recovered, not live

The live Firestore cities matrix and store grid were re-seeded for the later CHI confirmatory study
AFTER the pilot was played (pilot decision timestamps are 2026-05-02; the re-seed is later). Scoring
with the drifted live inputs reproduced the stored deployed values on only 26 of 55 rows. The exact
pilot-era inputs were preserved in the paper raw materials and are committed here as
`frozen_inputs/pilot_stores.json` and `pilot_cities.json`:

- The cities matrix is independently confirmed: the matrix reconstructed from the participants' own
  recorded cross-city times matches the committed pilot matrix on 12 of 12 ordered pairs, and both match
  the documented pilot model in `publishing/paper/raw_materials/data/time_model.json`.
- The store grid is the exact pilot 3x3 per-store item layout (pilot cellDistances 600 to 900, legacy
  "Sprouts Farmers Market" name).

With these exact inputs plus the static-oracle definition, the re-scoring matches the stored deployed
values **55 of 55 within 1e-6**.

A ranking-stability check confirms the recovery was necessary, not cosmetic: under the drifted live grid
the within-menu top-1 bundle flips on 18.2% of menus (concentrated on multi-order near-ties; full-ranking
Kendall tau 0.955), and the chosen bundle's optimal-versus-suboptimal status flips on 7.2% of decisions.

## Headline numbers under the frozen artifact

Optimal-choice rate 22.16%; mean regret 0.0965, median 0.0482; bundle rate 89.75%; oracle size
{1: 798, 2: 274, 3: 196}; 85 participants, 1268 rows, 14.9 rounds per participant.

## Regenerate

`node scripts/freeze-section5-deployed.mjs "<path-to-read-only-service-account-key>"`

It reads the per-decision pilot data and dataset from Firestore (read only) and the committed pilot
inputs, re-scores, prints the 55/55 validation, and rewrites the three CSVs. The 55/55 check is also
self-contained in `pilot_decisions_deployed.csv`: on the rows that carry `stored_regret_deployed`, the
recomputed `percent_regret_deployed` equals it to within 1e-6.
