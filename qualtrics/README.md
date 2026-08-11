# BundleGame on Qualtrics

Runs the whole game inside a Qualtrics question. No Vercel, no Firebase, no
result codes, no post-hoc matching — the game and the survey are one response.

```
qualtrics/
  src/config.js      the CONFIG block (every tunable knob)
  src/engine.js      the ported game engine
  src/styles.js      injected CSS
  src/boot.js        Qualtrics lifecycle wiring
  build.mjs          generates the single pasteable file
  dist/bundlegame.qualtrics.js    <- paste this into Qualtrics
  make-survey.mjs    generates an importable .qsf + the embedded-data field list
  import_qualtrics_export.py   turns a Qualtrics CSV export into archive tables
  test/              unit + end-to-end tests, a browser harness, sizing tools
  PILOT_CHECKLIST.md go through this before any public release
```

## Two surveys, not one

Control and treated are **separate builds and separate surveys**, so the control
file contains no answer key at all (verified by test: 0/35 vs 35/35 scenarios).
Randomise participants *between the two survey links*, outside Qualtrics.

```bash
npm run qualtrics:surveys     # builds both + generates both .qsf files
```

| Build | Answer key | Default arm | Use |
| --- | --- | --- | --- |
| `bundlegame.control.js` | none | `control` | control survey |
| `bundlegame.treated.js` | encoded | `counterfactual` | treated survey, arm randomised in flow |

Merging them back into one survey would put the key in front of control
participants again — which is the whole point of the split.

## Commands

| Command | Does |
| --- | --- |
| `npm run qualtrics:build` | build the pasteable file (add `--with-oracle` for treated arms) |
| `npm run qualtrics:build:control` | build with **no** answer key (control survey) |
| `npm run qualtrics:build:treated` | build with the encoded key (treated survey) |
| `npm run qualtrics:surveys` | both builds + both `.qsf` files |
| `npm run qualtrics:test` | 28 tests: unit, bug regressions, full rounds played end-to-end |
| `npm run qualtrics:harness` | prints a `file://` URL to play it locally |
| `npm run qualtrics:survey` | writes `dist/*.qsf` + `dist/embedded-data-fields.txt` |
| `npm run qualtrics:sizing` | plays a full run and measures the real payload |
| `npm run qualtrics:import` | Qualtrics CSV export → archive-shaped tables |
| `npm run qualtrics:verify` | build + test + survey in one go |

## 1. Build

```bash
npm run qualtrics:build -- --datasets chi_dynamic_v2,paired_enriched35_aided_v1 \
    --default chi_dynamic_v2 --with-oracle
```

**The default study is `chi_dynamic_v2`: 35 rounds, Phase A 1–15 unaided, Phase B
16–35 aided**, matching the `bundlegame_chi_dynamic_v1` protocol.

`--with-oracle` is **required for any treated arm** — it ships the recommended
bundle. Without it a treated arm has nothing to show; the game sets
`bg_recommendation_unavailable = 1` and logs a console error rather than quietly
behaving like control. `mainGame` has no oracle ids at all, so recommendation
arms only work on the CHI datasets.

The ids are shipped **base64-encoded** so they are not casually greppable in page
source. That is obfuscation, not security: a determined participant could still
decode them. Because Qualtrics randomises the arm at runtime from one built file,
control participants necessarily receive the same file. If that matters for your
design, build two surveys instead — one with the flag and one without — and
randomise between surveys rather than within.

## The block design — do not override it

`chi_dynamic_v2` and `paired_enriched35_aided_v1` carry a per-round
`feedback_enabled` flag that the engine treats as **authoritative**:

| Rounds | Block | Feedback | Purpose |
| --- | --- | --- | --- |
| 1–15 | — | off | Phase A, unaided diagnostic battery |
| 16–20 | B1 | **on** | aided |
| 21–25 | B2 | off | `retention_same_dist` — does learning persist? |
| 26–30 | B3 | **on** | aided |
| 31–35 | B4 | off | `transfer_shifted` — does it transfer? |

`RECOMMENDATION_ROUNDS` is only a fallback for datasets with no block design.
A flat window would hand out help during exactly the rounds that measure learning
*without* it, destroying the retention and transfer tests — so the dataset flag
wins. Four tests lock this down. Every decision row records `blk`, `bk`, `ts`,
`fb` and `st` so the blocks are analysable.

Reads the newest Firestore export under `data analysis/firestore_raw_export/`
(override with `--export <dir>/collections`) and writes
`qualtrics/dist/bundlegame.qualtrics.js` (~134 KB for three datasets).

The build **fails rather than ships a broken study**. It verifies that every
scenario's order ids resolve, every store has a layout, every item a scenario
asks for is actually reachable on that store's grid, and every cross-city hop a
dataset can require has a travel time.

It also ships only the fields the runtime reads. Oracle ids, `score_gap` and
classification are deliberately **not** included for legacy datasets, so a
participant cannot read the optimal answer out of the page source.

## 2. Test before you publish

```bash
npm run qualtrics:test        # 26 tests: unit, regression, + full round played end-to-end
npm run qualtrics:harness     # prints a file:// URL — play it in your browser
```

The harness stubs Qualtrics and shows, live, exactly what embedded data would be
written. Nothing leaves your machine.

## 3. Set up the Qualtrics survey

**a. Create the question.** Add a *Text/Graphic* question. Leave the text empty
(the game renders into it). Open its **JavaScript** editor and paste the entire
contents of `dist/bundlegame.qualtrics.js`.

**Fastest path:** `npm run qualtrics:survey -- --arms control,counterfactual,aggregate`
writes `dist/BundleGame.qsf` with every field pre-declared and an arm randomizer.
Import it in Qualtrics (Projects → Create → Import survey file). *This .qsf is
generated offline and has not been round-tripped through a real import* — if it
is rejected, use `dist/embedded-data-fields.txt` and build by hand as below.

**b. Create the embedded data fields** in Survey Flow, *above* the game block.
Outputs (leave values blank — the game fills them):

| Field | What it holds |
| --- | --- |
| `bg_participant_id` | participant id (defaults to `ResponseID`) |
| `bg_dataset`, `bg_arm` | which sequence and arm ran |
| `bg_round_reached` | deepest round started |
| `bg_round_current` | round in progress at last save |
| `bg_rounds_completed` | rounds finished |
| `bg_earnings`, `bg_session_seconds` | totals |
| `bg_finished` | 1 if the run ended cleanly |
| `bg_decisions` | JSON: one row per round |
| `bg_timing` | JSON: the eight timing buckets per round |
| `bg_events_1` … `bg_events_8` | the detailed UI timeline, chunked |
| `bg_events_chunks`, `bg_events_count` | how many chunks / events |
| `bg_events_truncated`, `bg_events_dropped_chars` | overflow flags — see below |
| `bg_recommendation_unavailable` | 1 if a treated arm had no oracle to show |
| `bg_tutorial_completed`, `bg_tutorial_rounds_done` | onboarding progress |
| `bg_tutorial_unavailable` | 1 if the tutorial dataset was not built in |

**c. Optional: tune from the survey flow.** Any CONFIG key can be overridden by
an embedded data field named `bg_<KEY>`, set *above* the game block. No
republish needed.

```
Embedded Data:  bg_TOTAL_ROUNDS = 35
Embedded Data:  bg_DATASET = chi_dynamic_v2
Embedded Data:  bg_SESSION_TIME_LIMIT = 900
```

**d. Random assignment** comes free — put a Randomizer above the game that sets
`bg_ARM`, evenly presenting one of `control` / `counterfactual` / `aggregate`.
The engine reads it and gates recommendations accordingly.

**e. Images — optional, and currently incomplete.** The game renders 8 items:
apple, banana, grape, kiwi, orange, pear, pineapple, watermelon.
`static/images/` only contains **apple, banana and pineapple** — grape, kiwi,
orange, pear and watermelon do not exist.

`MasterData/emojis` in Firestore is also empty `{}`, so the original fallback
renders nothing useful either. The port ships its own glyph set
(`CONFIG.ITEM_EMOJI`) covering all 8 items, and a per-image `onerror` handler
that swaps a failed image for its glyph and sets `bg_image_load_failed = 1`.

So: leave `IMAGE_BASE_URL` blank and the game is fully playable on glyphs. If you
want photos, create the 5 missing images first, upload all 8 to
Library → Graphics as `<item>.jpg`, then set the folder URL. Anything missing
degrades to a glyph rather than a broken-image icon.

## 4. Getting the data back out

```bash
npm run qualtrics:import -- responses.csv --out ./analysis \
    --sequences "<archive>/01_order_sequences"
```

Emits `participants.csv`, `round_decisions.csv`, `round_timing.csv`,
`detailed_action_timeline.csv` and `qa_issues.csv` in the same shape as
`02_participant_data/` in the data archive, so existing analysis works unchanged.
`--sequences` joins each chosen bundle to the candidate-bundle table and recovers
`score_ratio_to_best`, `regret_to_best` and `candidate_rank` — verified end to
end on a simulated cohort (18/18 rows recovered).

`qa_issues.csv` flags truncated payloads, chunk gaps, parse failures, incomplete
runs and bundles that do not appear in the candidate table. **Read it first.**

If you prefer to parse by hand, concatenate the chunks **in order**:

```python
events = json.loads("".join(row[f"bg_events_{i}"] or "" for i in range(1, 9)))
# each event is [t_seconds, action, target_type, target_id, meta?]
```

`bg_decisions` and `bg_timing` are plain JSON arrays.

**Whitespace is stripped from all logged strings** before packing. Qualtrics trims
embedded-data values, so a chunk boundary landing on a space would silently
corrupt reassembly. Spaces inside logged text (store names, a participant's
mistyped item) become `_`. This is enforced by a test.

**Timing buckets mix modelled and measured time**, exactly as the original does:
aisle walks, deliveries and penalties are added as their *simulated* cost, while
thinking and item entry are measured wall-clock. `idleOrOtherTime` is the
residual, so the eight buckets never under-account for the round.

## Size ceiling — the one thing to watch

Qualtrics embedded data fields hold roughly 20,000 characters each. **Confirm
this against your own licence before launch**; it has changed over time and
differs by contract.

Defaults ship 8 chunks × 15,000 chars = **120,000 characters**. Measured with
`npm run qualtrics:sizing`, playing every round and taking the largest legal
bundle each time:

| Run | events | packed | chunks needed |
| --- | --- | --- | --- |
| `mainGame`, all 50 rounds | 942 | 66.7 KB | **5 of 8** |
| `chi_dynamic_v2`, all 35 rounds | 612 | 41.1 KB | **3 of 8** |

So the budget holds for a full completion with headroom. `bg_timing` is the
single field closest to the ceiling (~10.3 KB at 50 rounds); if you go beyond 50
rounds, re-run the sizing tool before launch.

If the payload ever overflows, the game **says so** rather than silently
truncating: `bg_events_truncated = 1` and `bg_events_dropped_chars` records
exactly how much was lost. Check that column before analysing.

## What this port does and does not carry over

Also included: an instructions screen and a guided warm-up on the `tutorial`
dataset (`SHOW_INSTRUCTIONS`, `TUTORIAL_DATASET`, `TUTORIAL_ROUNDS`, both on by
default). Practice rounds are tagged `tut:1` in `bg_decisions`, do not pay out,
and do not consume the session clock — the timer restarts for the real task.

Preserved, and covered by tests:

- same-store bundle legality (`legal_bundle_mask_v1`)
- aisle travel = manhattan distance × the store's `cellDistance`
- typed-item entry with per-bag quantities
- checkout matches each order to exactly one bag on items *and* quantities
- delivery = `localTravelTime` + cross-city travel from the player's current city
  (verified equal to the original `crossCityExtraTime` across all city pairs)
- the player's city carries across rounds
- the eight timing buckets the analysis pipeline expects
- the detailed event vocabulary (`select_order`, `move_aisle`, `add_item_to_bag`,
  `deliver_order`, …)

Not carried over, deliberately:

- **Admin pages, scenario generator, score exporter.** They stay in the
  SvelteKit app; this is the participant runtime only.
- **Live classroom leaderboard.** Depends on a shared backend.
- **`startPickingConfirmationTime` is always ~0.** The original had two separate
  clicks (confirm bundle, then start picking); this port merges them into one
  "Go to store" button, so that bucket has nothing to measure. The time lands in
  `thinkingTime` instead. Keep this in mind when comparing old and new runs.
- **Server-side scoring.** `bg_decisions` records the chosen bundle; reward and
  regret are computed at analysis time by joining to
  `01_order_sequences/candidate_bundles_<root>.csv` in the data archive. This is
  the same join the new CHI runs already require.

## Regenerating after a dataset change

Datasets are baked into the built file. If you edit `MasterData/datasets`, pull a
fresh export and rebuild:

```bash
npm run firestore:export:raw
npm run qualtrics:build -- --export "data analysis/firestore_raw_export/<new>/collections"
npm run qualtrics:test
```
