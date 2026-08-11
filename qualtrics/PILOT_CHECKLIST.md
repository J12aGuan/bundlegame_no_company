# Pilot Checklist — exactly what to do

Budget ~50 minutes. Every step has a **pass condition**. If one fails, stop there.

> **Survey IDs and the project ID are deliberately placeholders.** This repository
> is public, and those identify a live human-subjects study. Substitute your real
> values locally — they are in your Qualtrics account and `.env`.

## Your three surveys

| | Link | Status |
| --- | --- | --- |
| **CONTROL** (test this first) | [edit](https://berkeley.yul1.qualtrics.com/survey-builder/<CONTROL_SURVEY_ID>/edit) · [preview](https://berkeley.yul1.qualtrics.com/jfe/preview/<CONTROL_SURVEY_ID>) | Inactive |
| **TREATED** | [edit](https://berkeley.yul1.qualtrics.com/survey-builder/<TREATED_SURVEY_ID>/edit) · [preview](https://berkeley.yul1.qualtrics.com/jfe/preview/<TREATED_SURVEY_ID>) | Inactive |
| **LIVE — your fallback, do not edit** | [edit](https://berkeley.yul1.qualtrics.com/survey-builder/<LIVE_SURVEY_ID>/edit) | **Active**, still on Vercel |

Other links you will need:

- Firestore data: <https://console.firebase.google.com/project/<FIREBASE_PROJECT_ID>/firestore/data/~2FUsers>
- Vercel app (fallback, still running): <https://bundlegame-no-company.vercel.app>

---

## STEP 1 — Play it locally first (10 min)

Terminal, in the repo:

```bash
npm run qualtrics:verify     # build + 39 tests + survey files
npm run qualtrics:harness    # prints a file:// URL — open it
```

In the harness set **arm = counterfactual**, **rounds = 35**, click Restart, and play.

Tick each:

- [ ] Rounds 1–15: no green suggestion box
- [ ] Rounds 16–20: **suggestion box appears**
- [ ] Rounds 21–25: **box GONE** ← retention test
- [ ] Rounds 26–30: **box appears again**
- [ ] Rounds 31–35: **box GONE** ← transfer test
- [ ] Item tiles show fruit emoji, not dots or broken images
- [ ] Orders from a different store are greyed out

**Pass:** all ticked. The two "GONE" rows are the critical ones — if help shows during 21–25 or 31–35, the retention and transfer measures are invalid. Stop and report it.

---

## STEP 2 — Confirm the field size limit (5 min) — **do this before collecting data**

Everything is sized against a 20,000-character embedded-data limit. Verify yours.

1. Open the [CONTROL survey](https://berkeley.yul1.qualtrics.com/survey-builder/<CONTROL_SURVEY_ID>/edit)
2. **Survey Flow** → **Add a New Element** → **Embedded Data**
3. Field name `bg_size_probe`, value = 20,000 of any character (paste a long string)
4. Move it to the **top** of the flow, **Apply**
5. **Preview** → click straight through to the end → **Data & Analysis** → **Export** → **CSV**
6. Open the CSV, find `bg_size_probe`, count its characters

- [ ] It comes back at the full 20,000 characters

**Pass:** full length survives → nothing to change. **Fail:** note what did survive, then in `qualtrics/src/config.js` set `EVENT_CHUNK_CHARS` to that number minus ~2,000, rebuild, and increase `MAX_EVENT_CHUNKS` so the total still exceeds 70,000.

**Delete the probe field when done.**

---

## STEP 3 — Preview the CONTROL survey properly (15 min)

Open the [CONTROL preview](https://berkeley.yul1.qualtrics.com/jfe/preview/<CONTROL_SURVEY_ID>).

**Before you start, open your browser console** (Chrome: ⌥⌘J) and leave it open. Any red `[bundlegame]` message is a problem worth reporting.

Click through Start → Tutorial → Quiz until you reach the **Game** block.

- [ ] The game renders inside the page — no iframe, no loading spinner
- [ ] The Next arrow is hidden while playing
- [ ] The **tutorial question (QID23)** also renders a small practice game, not a Vercel frame
- [ ] Play the full 35 rounds; it finishes and the page advances on its own
- [ ] On the game page there is **no "paste your result code" box** (that was removed)
- [ ] Console shows no red errors

**Pass:** you reach the post-game questions without ever being blocked.

---

## STEP 4 — The dropout test (5 min) — **this is the important one**

This proves live transmission works. It is the whole reason for the Firebase change.

1. Open the [CONTROL preview](https://berkeley.yul1.qualtrics.com/jfe/preview/<CONTROL_SURVEY_ID>) again
2. Reach the Game block and **play 5 rounds**
3. Note the participant id shown on the page (the `userID` value)
4. **Close the browser tab completely** — do not finish, do not click Next
5. Open <https://console.firebase.google.com/project/<FIREBASE_PROJECT_ID>/firestore/data/~2FUsers>
6. Find the document for that `userID` → open the **`Actions`** subcollection

- [ ] There are **5 documents** named `chi_dynamic_v2__round_1` … `_round_5`
- [ ] Each has `round_index`, `scenario_id`, `chosen_orders`, `earnings`, `success`
- [ ] `Progress/progress` and `Summary/summary` also exist

**Pass:** the 5 rounds are there even though you never submitted the page. The dropout gap is closed.

**Fail:** nothing in Firestore → live transmission is not working. Check the console for `[bundlegame]` errors and send me `bg_firebase_last_error`.

---

## STEP 5 — The resume test (3 min)

1. Preview again, play 3 rounds
2. Press **F5 / ⌘R** to reload the page
3. The game should offer **"Continue my game"**

- [ ] The resume prompt appears
- [ ] Clicking it puts you back at round 4 with your earnings intact

---

## STEP 6 — Check the export (10 min)

Finish one complete run, then **Data & Analysis → Export → CSV**.

- [ ] `bg_finished` = 1
- [ ] `bg_rounds_completed` matches what you played
- [ ] `bg_events_1`, `bg_events_2`, `bg_events_3` are populated
- [ ] **`bg_events_truncated` = 0** ← if 1, go back to STEP 2
- [ ] **`bg_firebase_failed` = 0** and `bg_firebase_dropped` = 0
- [ ] `bg_firebase_ok` is roughly 3 × rounds played
- [ ] `bg_decisions` parses as JSON

Then run the importer:

```bash
npm run qualtrics:import -- ~/Downloads/YOUR_EXPORT.csv --out ./pilot \
    --sequences "<path to archive>/01_order_sequences"
```

- [ ] **`pilot/qa_issues.csv` is empty** ← best single signal the pipeline is sound
- [ ] `round_decisions.csv` has one row per round
- [ ] `score_ratio_to_best` is filled in
- [ ] `blk` and `ts` columns show `B1`…`B4` and the two test-set labels

---

## STEP 7 — Test the TREATED survey (5 min)

Open the [TREATED preview](https://berkeley.yul1.qualtrics.com/jfe/preview/<TREATED_SURVEY_ID>).

- [ ] Suggestion box appears on rounds 16–20 and 26–30 only
- [ ] `bg_arm` in the export is `counterfactual` or `aggregate`
- [ ] `bg_recommendation_unavailable` is blank

---

## STEP 8 — Go live

1. Open each survey → **Publish** (top right) → then **Distributions** → get an anonymous link
2. Randomise participants **between the two links**, decided outside Qualtrics and recorded
3. Leave the [LIVE survey](https://berkeley.yul1.qualtrics.com/survey-builder/<LIVE_SURVEY_ID>/edit) Active and Vercel deployed as your fallback

Before recruiting:

- [ ] IRB / consent covers a public population, not just a class
- [ ] Consent block sits before the game block
- [ ] At least 3 pilot participants who are not you
- [ ] Partial responses set to record (Survey Options → Partial Data)

> Do **not** merge control and treated into one survey — that puts the answer key in front of control participants, which the split exists to prevent.

---

## If something breaks

**Fastest rollback:** your live Vercel survey is untouched and Active. Send participants there and nothing is lost.

Useful commands:

```bash
npm run qualtrics:verify      # rebuild + all 39 tests + regenerate survey files
npm run qualtrics:sizing      # measure the real payload for a full run
npm run qualtrics:harness     # play locally with Qualtrics stubbed
```

Re-push a build to a survey after changing config:

```bash
npm run qualtrics:build:control
node qualtrics/apply-to-survey.mjs <CONTROL_SURVEY_ID> qualtrics/dist/bundlegame.control.js --question QID18
```

The apply tool refuses to touch an Active survey unless you pass `--force`.

---

## Known limitations to state in any writeup

- `startPickingConfirmationTime` is always ~0: the port merges the original's two clicks into one. That time lands in `thinkingTime`. Do not pool this bucket across old and new runs.
- Timing buckets mix modelled cost (walks, deliveries, penalties) with measured wall clock, as the original does. `idleOrOtherTime` is the residual.
- Reward and regret are computed at analysis time from the candidate-bundle table, not client-side.
- Item art is emoji glyphs: 5 of the 8 item images never existed.
- Firestore writes are unauthenticated, permitted by `firestore.rules`. The Firebase web API key is embedded in the survey — that is normal for a web Firebase app; security comes from the rules.
