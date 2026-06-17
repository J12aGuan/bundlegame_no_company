# Deployed re-scoring of candidates.csv

Scorer: DEPLOYED (bundleTime.js, SHARED_ITEM_ACCESS_SAVE_RATE=1, no 0.25 LOCAL_TRAVEL_BUNDLE_SAVE_RATE).
Carried position: each (user,round) scored from the participant's recovered current_city
(exact, recovered from the singleton candidates' cross-city in the original export).

## Fidelity check (reproduce the mirror before changing the rule)
- candidate rows reproduced & matched mirror (score/time/cross/savings, tol 0.02): 13434
- mismatches: 0   | rows skipped (no source order data / pilot): 2
- max abs error vs candidates.csv: 0.00000

## Deployed oracle vs mirror oracle (bundle identity)
- (user,round) decisions compared: 1257
- oracle identity MATCHES: 622 (49.5%)
- oracle identity CHANGES: 635 (50.5%)

## Exact-optimal rate (chosen == oracle), same definition under each scorer
- mirror   : 428/1257 = 34.05%
- deployed : 219/1257 = 17.42%
- change   : -16.63 pp  (-209 decisions)

Note: the mirror exact-optimal here (34.05%) is the recomputed
mainGame value; it is the apples-to-apples baseline for the deployed comparison.

## Outputs
- candidates_deployed.csv  : every candidates.csv row + deployed_score,
  deployed_total_time_seconds, deployed_regret_to_best, deployed_score_ratio_to_best,
  is_oracle_deployed. (pilot 'experiment' rows have blank deployed_* = no source data.)
- oracle_match_by_round.csv: per-round deployed-vs-mirror oracle identity match rate.
