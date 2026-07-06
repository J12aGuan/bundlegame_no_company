# Verification report

Scope: verification only, no analysis or data file was modified. Every number below is recomputed from the
frozen sources: `publishing/export_for_analysis/frozen_bundle_menu_data.csv` (the frozen scorer output),
`publishing/export_for_analysis/pilot_decisions_deployed.csv` (the tokenized twin of `pilot_decisions.csv`,
identical analytic columns), and the committed pipeline in `analysis/sim/`. The scorer output is loaded by
`analysis/sim/foundation.py::load_frozen`, which asserts the locked pilot statistics on load. Ranges are
written "X to Y". Where a claimed number does not reproduce, the closest computed value and its source line
are given, and no source is invented.

## Tier 1: Pilot behavioral headline

| Claim | Manuscript value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| exact-optimal rate | 22.2% | 22.2% (0.2216) | foundation.py :: is_optimal_choice L125-126 (percent_regret <= 1e-9) | MATCH |
| mean normalized regret | 0.097 | 0.0965 | foundation.py :: _verify L192 (mean percent_regret_deployed) | MATCH |
| within 5% of benchmark | 53.3% | 53.3% (0.5331) | recompute over frozen scores, score ratio >= 0.95 | MATCH |
| mean chosen-bundle percentile in menu | 79th | 80.5 inclusive, 69.7 strict, 75.1 midrank | recompute over frozen_bundle_menu_data scores | MISMATCH |
| outperform average feasible trip | 92.1% | 92.0% vs all feasible bundles, 93.5% vs single trips | recompute over frozen scores | MATCH |
| bundle rate (2 or more orders) | 0.90 | 0.8975 | foundation.py :: _verify L196 (bundle_rate) | MATCH |
| median decision time | 9.8 s | 9.8 s | deliberation_round.csv :: time_to_submit_ms (n=1300) | MATCH |
| median distinct trips assembled | 2.8 | median 3.0, mean 2.76 | deliberation_round.csv :: n_distinct_bundles_considered | MISMATCH |
| compared 2 or more trips | 93% | 89.7% | deliberation_round.csv, n_distinct_bundles_considered >= 2 | MISMATCH |

## Tier 2: Local add / drop / swap

| Claim | Manuscript value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| drop share | 47.2% | 47.2% | addropswap.py :: summarize L181, THRESHOLD 0.50 L35 | MATCH |
| add share | 8.8% | 8.8% | addropswap.py :: summarize | MATCH |
| swap share | 8.4% | 8.4% | addropswap.py :: summarize | MATCH |
| no clean one-step | 35.6% | 35.6% | addropswap.py :: summarize | MATCH |
| recovery share | 66.4%, CI [63.3, 69.5] | 66.4%, CI [63.3, 69.5] | addropswap.py :: summarize L194-196 (mean_frac_regret_closed) | MATCH |
| excess-time attribution, picking | 88% | 88.2% (all suboptimal TIME share) | mechanism.py :: main L152-155 (picking+local+routing) | MATCH |
| excess-time attribution, picking plus travel | 93% | 92.7% (over-bundling TIME share) | mechanism.py :: main (over-bundling subset) | MATCH |

## Tier 3: Menu bank

| Claim | Manuscript value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| number of menus | 27 | 27 | frozen_bundle_menu_data.csv, distinct scenario_id | MATCH |
| benchmark size per menu | 16 single / 8 pair / 3 triple | 16 / 8 / 3 | recompute, oracle size per distinct menu | MATCH |
| menus with a payout trap | 23 | 23 | recompute, max feasible payout > benchmark payout | MATCH |
| best-to-worst efficiency gap | 0.001 to 0.225, median 0.040 | 0.001 to 0.225, median 0.040 | recompute, distinct-score gap per scenario | MATCH |
| per-decision benchmark size, 1268 rounds | 798 single / 274 pair / 196 triple | 798 / 274 / 196 | foundation.py :: _verify L216 (oracle_size dist) | MATCH |

## Tier 4: Critical reconciliation of the counterfactual bank

| Claim | Manuscript value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| total menus in seed-42 generator bank | (implied) | 35 | chi_scenario_set_seed42.json (buildChiScenarioSet seed 42) | MATCH |
| oracle mix | 14 single / 12 bundling-correct / 9 over-bundle | 14 / 12 / 9 | chi_scenario_set_seed42.json :: oracle_category | MATCH |
| payout-trap menus | 9 | 9 | chi_scenario_set_seed42.json :: is_payout_trap | MATCH |
| dispersed menus | 25 | 25 | chi_scenario_set_seed42.json :: orders city count >= 2 | MATCH |
| "22 trap menus, 13 coaching and 9 transfer" | 22, 13 / 9 | 22, coach 13 / transfer 9 (pilot data, not the generator) | policies.py :: select_traps L127-133, COACH_FRAC L29 | MISMATCH as a generator-bank claim |

Plain statement: the sentence "oracle mix 14 single-optimal / 12 bundling-correct / 9 over-bundle, 9 payout
traps, 25 dispersed" is the actual realized seed-42 generator bank and MATCHES. The sentence "22 trap menus,
split 13 coaching and 9 transfer" describes the pilot Section 5 simulation coaching split, produced by
`policies.py::select_traps` over `pilot_decisions_deployed.csv` with `COACH_FRAC = 0.6` (22 pilot trap menus,
13 coaching and 9 transfer). It is a real number but a different object. As a description of the seed-42
generator bank it is stale.

## Tier 5: Second-order statistics

| Claim | Manuscript value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| payout-trap coefficient | 0.021 per $10, SE 0.006, LOMO [0.018, 0.025] | 0.0209 per $10, SE 0.0060, LOMO [0.0175, 0.0246] | recompute, OLS R ~ Pm + Dm + t + participant FE, cluster on 27 menus | MATCH |
| split-half persistence of over-inclusion | r = 0.48 | raw r = 0.371 (p = 0.0006), Spearman-Brown 0.541; excess-picking raw 0.330, SB 0.496 | recompute, first-half vs second-half | MISMATCH |
| implied time-price predicts held-out over-inclusion | r = -0.35, p about 0.004 | r = -0.35, p = 0.0035, n = 68 | make_mechanism_figure.py Panel C L61-73 | MATCH |
| quarter-credit rescore of exact-optimal | 22.2% to 10.6% | 22.2% to 10.6% (0.1057) | recompute, savingsCredit 0.25 rescore of frozen components | MATCH |
| unaided within-participant trend (referenced +0.010, SE 0.008) | +0.010, SE 0.008 | optimal-rate trend +0.01025, menu-clustered SE 0.0076, participant-clustered SE 0.0019; menu-conditional +0.0009; the regret slope itself is -0.0012 | recompute, OLS with participant FE | MATCH |

## Tier 6: Figures

Headline numbers are printed by the current pipeline; the figure PDFs are gitignored, so regeneration touches
no committed file. The eight regenerated exports were copied to `figures/verified/`. See the note after this
table on the sizing and font respec.

| Figure claim | Manuscript / on-disk value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| fig1, median regret | 0.048 | 0.048 (0.0482) | foundation.py :: _verify L194 | MATCH |
| fig1, participant-spread ratio (max mean over median mean) | about 4x | 4.54x | recompute over per-participant mean regret | MATCH |
| design-validity, observed mean regret | 0.097 text, 0.096 on-disk | 0.0965 | recompute | MATCH |
| design-validity, random mean regret | 0.206 | 0.209 | recompute, mean regret of feasible set per round | MATCH |
| design-validity, worst mean regret | 0.594 | 0.446 | recompute, max feasible regret per round | MISMATCH |
| design-validity, mean percentile | 79th | 80.5 inclusive | recompute (see Tier 1) | MISMATCH |
| diagnostic-component, three-way | 88 / 12 / 0 | 88.2 / 11.8 / 0.0 | mechanism.py :: decompose L84, grouping note L156-161 | MATCH |
| diagnostic-component, four-way on-disk | 81 picking / 7 routing / 0 overlap / 12 payout | does not reproduce; current pipeline gives five-way 52.3 / 33.0 / 2.9 / 11.8 / 0.0 and Panel A three-way 97.1 / 2.9 / 0.0 | mechanism.py :: main L152-155; make_mechanism_figure.py Panel A L48-49 | MISMATCH |
| mechanism, teaching vs no advice regret on over-bundle rounds | 0.098 to 0.043 | 0.098 to 0.043 | make_picking_channel_figure.py L60 | MATCH |
| mechanism, excess picking seconds | 18.6 to 9.2 | 18.6 to 9.2 | make_picking_channel_figure.py L60 | MATCH |
| time-price distribution, median share | 54% | 54% | make_mechanism_figure.py Panel B L52-59 | MATCH |
| time-price distribution, share underpricing | 68% | 68% (ratio < 0.8) | make_mechanism_figure.py Panel B L107 | MATCH |
| policy-frontier, cluster labels (Bulk picker, Lean minimalist, Jackpot chaser, Greedy bulk, Route-blind) | present on export | ABSENT from all committed code | grep of analysis, publishing, scripts | MISMATCH |

Regeneration note: `figures/verified/` holds the eight exports the committed pipeline regenerates
deterministically (each committed figure script sets `pdf.fonttype = 42` and `metadata={"CreationDate":
datetime(2024,1,1)}`). The additional respec requested in Tier 6 (TeX Gyre Heros sans-serif, SVG hashsalt,
6.5 inch width) was not applied, because it would require editing committed analysis scripts, which is out of
scope for a verification pass, and the TeX Gyre Heros font is not installed in this environment. The requested
figure names (fig1, design-validity, diagnostic-component, policy-frontier, time-price) do not map one to one
onto the committed export names; the closest committed exports were copied. The policy-frontier earnings vs
time coordinates were not extracted because the taxonomy labels that define that exhibit are not produced by any
committed script (see the MISMATCH prose).

## Tier 7: Choice model held-out

In scope: the choice-model fitting lives in the repo at `analysis/sim/worker_model.py`.

| Claim | Manuscript value | Recomputed value | Source (file :: function/line) | Verdict |
|---|---|---|---|---|
| held-out top-1 accuracy | 0.64 on 478, vs 0.11 uniform | 0.64 on 478, vs 0.11 uniform | worker_model.py :: run L165, temporal_split L107 | MATCH |
| held-out log loss | 1.37 | 1.37 | worker_model.py :: _predict_metrics L157 (negative loglik per decision) | MATCH |
| held-out predicted vs observed mean regret | 0.114 / 0.087 | 0.114 / 0.086 | worker_model.py :: _predict_metrics L151 | MATCH |
| held-out predicted vs observed mean bundle size | 2.46 / 2.43 | 2.46 / 2.43 | worker_model.py :: _predict_metrics L152 | MATCH |
| held-out predicted vs observed exact-optimal rate | 0.207 / 0.282 | 0.207 / 0.282 | worker_model.py :: _predict_metrics L153 | MATCH |
| held-out participants | 71 | 71 | worker_model.py :: temporal_split, test set | MATCH |
| calibration correlation | r = 0.55 | r = 0.69 for predicted vs observed bundle size | recompute per participant on the held-out set | MISMATCH |

## Prose per MISMATCH

### Tier 1, mean chosen-bundle percentile (79th)
The percentile depends on the tie convention. Over the frozen scores the round-pooled mean is 80.5 counting
feasible bundles with score at or below the chosen score, 69.7 counting strictly below, and 75.1 at the
midrank. The manuscript 79th sits inside this band but does not equal any single convention. Closest single
value: 80.5 (inclusive). No committed script fixes the convention.

### Tier 1, median distinct trips assembled (2.8) and compared 2 or more trips (93%)
Using `deliberation_round.csv :: n_distinct_bundles_considered`, the median is 3.0 and the mean is 2.76. The
manuscript 2.8 equals the mean, not the median, so the label "median" is the error, not the value. The
"compared 2 or more trips" rate recomputes to 89.7 percent (rounds with two or more distinct non-empty bundles
considered), against the claimed 93 percent. Closest value 89.7 percent. These come from the DetailedAction
timeline export, which covers 85 of the participants, so the denominator is that subset.

### Tier 4, the 22 / 13 / 9 sentence
Both manuscript sentences report real numbers about different banks. The seed-42 generator bank is 35 menus
(14 single-optimal, 12 bundling-correct, 9 over-bundle, 9 payout traps, 25 dispersed), read from the frozen
generator output `chi_scenario_set_seed42.json`. The "22 trap menus, 13 coaching and 9 transfer" is the pilot
Section 5 simulation split from `policies.py::select_traps` over the pilot data with `COACH_FRAC = 0.6`. The
second sentence matches the generator; the first is the pilot coaching split and is stale if presented as the
generator bank.

### Tier 5, split-half persistence (0.48)
No committed script computes this number, so it cannot be tied to a source. The first-half vs second-half
Pearson correlation of the per-participant over-inclusion rate is 0.371 (p = 0.0006, n = 82); Spearman-Brown
correcting for the split gives 0.541. For excess picking time the raw split-half is 0.330 and the
Spearman-Brown value is 0.496. The manuscript 0.48 is closest to the Spearman-Brown corrected excess-picking
persistence (0.50). Recommend stating the exact measure (over-inclusion versus excess picking) and whether the
0.48 is raw or Spearman-Brown corrected.

### Tier 6, design-validity worst mean regret (0.594)
The observed and random values reconcile: observed 0.0965 (0.096 to 0.097 is just rounding) and random 0.209
against 0.206. The worst value does not: taking the maximum feasible regret per round and averaging gives
0.446, not 0.594. A worst of 0.594 would require a wider worst-case set than the single-store feasible bundles
scored here (for example including the empty bundle, whose regret is 1.0, or an unconstrained worst option).
Closest computed value 0.446. Recommend restating the worst-case definition.

### Tier 6, diagnostic-component four-way (81 / 7 / 0 / 12)
The current pipeline does not produce 81 / 7 / 0 / 12. It produces a five-way per-decision dominant-component
split (picking 52.3, local 33.0, routing 2.9, overlap 11.8, payout 0.0) and two three-way groupings of those
same shares: the manuscript text grouping 88 / 12 / 0 (time equals picking plus local plus routing, then
overlap, then payout, reproduced exactly), and the figure Panel A grouping 97 / 3 / 0 (time equals picking plus
local plus overlap, then routing, then payout). The on-disk 81 / 7 / 0 / 12 four-way matches none of these and
appears to be a stale pre-correction export. The 88 / 12 / 0 belongs to the manuscript text three-way
dominant-component classification.

### Tier 6, policy-frontier cluster labels
The five taxonomy labels (Bulk picker, Lean minimalist, Jackpot chaser, Greedy bulk, Route-blind) are not
produced by any committed script; a repository search across `analysis/`, `publishing/`, and `scripts/`
returns nothing. The taxonomy on the on-disk export was hand-added and is not reproducible from the pipeline.

### Tier 7, calibration correlation (0.55)
`worker_model.py` prints predicted versus observed means but not a calibration correlation, so 0.55 has no
committed source. The per-participant correlation of predicted versus observed bundle size on the held-out set
is 0.69 (p = 4e-11, n = 71). A different calibration target (regret or exact-optimal rate) would give a
different value; the manuscript should state which target the 0.55 refers to.

## Files created

- `VERIFICATION_REPORT.md` (this file, repo root)
- `figures/verified/figP4b_partial_learning.pdf`
- `figures/verified/fig_addropswap.pdf`
- `figures/verified/fig_botvalidation.pdf`
- `figures/verified/fig_dissociation.pdf`
- `figures/verified/fig_mechanism.pdf`
- `figures/verified/fig_overbundle.pdf`
- `figures/verified/fig_picking_channel.pdf`
- `figures/verified/fig_shifted_transfer.pdf`

Verification scripts were run from the session scratchpad and are not part of the repository: `verify_t123.py`,
`verify_t5.py`, and short inline recompute scripts for Tiers 4, 6, and 7. No committed data or analysis file
was modified.
