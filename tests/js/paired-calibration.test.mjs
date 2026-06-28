import test from "node:test";
import assert from "node:assert/strict";

import {
  PAIRED_STUDY_ID,
  PAIRED_PART_PILOT,
  PAIRED_PART_AIDED,
  PAIRED_PLAN,
  partForScenarioSet,
  nextPart,
  isFinalPart,
  forcedArmForPart,
  tagPairedRoundAction,
  joinPairedByToken,
  pairedIntegrity,
  flagStraightLining,
  STRAIGHT_LINE_FLOOR_SECONDS,
} from "../../src/lib/pairedCalibration.js";

// --- the two-phase plan --------------------------------------------------- //
test("plan is pilot (unaided) then enriched35 (aided, marginal forced)", () => {
  assert.equal(PAIRED_PLAN.length, 2);
  assert.equal(PAIRED_PLAN[0].part, PAIRED_PART_PILOT);
  assert.equal(PAIRED_PLAN[0].aided, false);
  assert.equal(PAIRED_PLAN[0].forced_arm, null);
  assert.equal(PAIRED_PLAN[1].part, PAIRED_PART_AIDED);
  assert.equal(PAIRED_PLAN[1].aided, true);
  assert.equal(PAIRED_PLAN[1].forced_arm, "marginal");
});

test("scenario_set <-> part resolution and sequencing", () => {
  assert.equal(partForScenarioSet("paired_pilot_unaided_v1").part, PAIRED_PART_PILOT);
  assert.equal(partForScenarioSet("paired_enriched35_aided_v1").part, PAIRED_PART_AIDED);
  assert.equal(partForScenarioSet("something_else"), null);

  assert.equal(nextPart(PAIRED_PART_PILOT).part, PAIRED_PART_AIDED);
  assert.equal(nextPart("paired_pilot_unaided_v1").part, PAIRED_PART_AIDED);
  assert.equal(nextPart(PAIRED_PART_AIDED), null); // nothing after the last part
  assert.equal(isFinalPart(PAIRED_PART_PILOT), false);
  assert.equal(isFinalPart(PAIRED_PART_AIDED), true);
});

test("forced arm: pilot unaided, aided forces the directed-teaching (marginal) arm", () => {
  assert.equal(forcedArmForPart(PAIRED_PART_PILOT), null);
  assert.equal(forcedArmForPart(PAIRED_PART_AIDED), "marginal");
});

// --- the phase marker ----------------------------------------------------- //
test("tagPairedRoundAction stamps study_id + study_part without mutating input", () => {
  const base = { round_index: 3, scenario_id: "s3" };
  const tagged = tagPairedRoundAction(base, { part: PAIRED_PART_PILOT });
  assert.equal(tagged.study_id, PAIRED_STUDY_ID);
  assert.equal(tagged.study_part, PAIRED_PART_PILOT);
  assert.equal(base.study_part, undefined); // pure
});

// --- the join + Gate C integrity invariants ------------------------------- //
function session(token, { pilotRounds = 27, aidedRounds = 35, aidedToken = null } = {}) {
  const rows = [];
  for (let i = 1; i <= pilotRounds; i++)
    rows.push(tagPairedRoundAction({ participant_token: token, round_index: i, scenario_id: `p${i}` }, { part: PAIRED_PART_PILOT }));
  for (let i = 1; i <= aidedRounds; i++)
    rows.push(tagPairedRoundAction({ participant_token: aidedToken ?? token, round_index: i, scenario_id: `e${i}` }, { part: PAIRED_PART_AIDED }));
  return rows;
}

test("3 clean completers: same token both parts, zero orphans, monotonic, all marked", () => {
  const rows = [...session("p001"), ...session("p002"), ...session("p003")];
  const rep = pairedIntegrity(rows);
  assert.equal(rep.tokens, 3);
  assert.equal(rep.completers, 3);
  assert.deepEqual(rep.orphans, []);
  assert.deepEqual(rep.non_monotonic, []);
  assert.equal(rep.unmarked_rows, 0);
  assert.equal(rep.clean, true);

  const joined = joinPairedByToken(rows);
  assert.equal(joined.get("p001").pilot.length, 27);
  assert.equal(joined.get("p001").enriched35.length, 35);
});

test("linkage regression is CAUGHT: a token change between parts produces orphans (not clean)", () => {
  // the failure mode Gate C must make impossible: part 2 written under a different token.
  const rows = [...session("p001", { aidedToken: "p001_DIFFERENT" }), ...session("p002")];
  const rep = pairedIntegrity(rows);
  // p001 (pilot only) and p001_DIFFERENT (aided only) are both orphans; p002 is a clean completer.
  assert.equal(rep.completers, 1);
  assert.ok(rep.orphans.includes("p001"));
  assert.ok(rep.orphans.includes("p001_DIFFERENT"));
  assert.equal(rep.clean, false);
});

test("incomplete (quit during pilot) is flagged as orphan/incomplete, not a completer", () => {
  const rows = session("p009", { aidedRounds: 0 }); // pilot only
  const rep = pairedIntegrity(rows);
  assert.equal(rep.completers, 0);
  assert.deepEqual(rep.incomplete, ["p009"]);
});

test("non-monotonic round indices within a part are caught", () => {
  const rows = [
    tagPairedRoundAction({ participant_token: "p1", round_index: 1 }, { part: PAIRED_PART_PILOT }),
    tagPairedRoundAction({ participant_token: "p1", round_index: 1 }, { part: PAIRED_PART_PILOT }), // dup
    tagPairedRoundAction({ participant_token: "p1", round_index: 1 }, { part: PAIRED_PART_AIDED }),
  ];
  const rep = pairedIntegrity(rows);
  assert.ok(rep.non_monotonic.includes("p1:pilot"));
  assert.equal(rep.clean, false);
});

test("out-of-order read (lexicographic Firestore doc ids) with no dup is clean after sort", () => {
  // admin read-back returns docs by id order (1,10,11,2,3,...), NOT round order; that must not flag.
  const order = [1, 10, 11, 12, 2, 3, 27, 4];
  const rows = order
    .map((i) => tagPairedRoundAction({ participant_token: "p1", round_index: i }, { part: PAIRED_PART_PILOT }))
    .concat(tagPairedRoundAction({ participant_token: "p1", round_index: 1 }, { part: PAIRED_PART_AIDED }));
  const rep = pairedIntegrity(rows);
  assert.deepEqual(rep.non_monotonic, []); // read order must not matter; only true duplicates do
});

test("a row missing study_part is counted as unmarked (write would be rejected live)", () => {
  const rows = [
    tagPairedRoundAction({ participant_token: "p1", round_index: 1 }, { part: PAIRED_PART_PILOT }),
    { participant_token: "p1", round_index: 2 }, // no study_part
  ];
  const rep = pairedIntegrity(rows);
  assert.equal(rep.unmarked_rows, 1);
  assert.equal(rep.clean, false);
});

test("straight-lining: default floor is the baked 3.0s; explicit 0 is a no-op", () => {
  const rows = [
    tagPairedRoundAction({ participant_token: "p1", round_index: 1, duration: 0.5 }, { part: PAIRED_PART_PILOT }),
    tagPairedRoundAction({ participant_token: "p1", round_index: 2, duration: 9 }, { part: PAIRED_PART_PILOT }),
  ];
  assert.equal(STRAIGHT_LINE_FLOOR_SECONDS, 3.0); // calibrated 1st pct of pilot thinkingTime
  assert.equal(flagStraightLining(rows).length, 1); // default 3.0s flags the 0.5s deliberation
  assert.equal(flagStraightLining(rows, { minSecondsPerRound: 2 }).length, 1);
  assert.equal(flagStraightLining(rows, { minSecondsPerRound: 0 }).length, 0); // explicit no-op
});
