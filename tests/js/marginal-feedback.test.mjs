import test from "node:test";
import assert from "node:assert/strict";

import {
  oneStepNeighbors,
  bestImprovingMove,
  marginalFeedbackMessage,
  violationLabel,
  aggregateFeedbackMessage,
  oracleFeedbackMessage,
  componentFeedbackMessage,
  controlFeedbackMessage,
  feedbackForArm,
  ratePerMin,
} from "../../src/lib/marginalFeedback.js";

// A round whose legal action set is all single-store bundles over {o1,o2,o3}.
// deployed_score = earnings / deployed_total_time_seconds (the only fields used).
function fixtureCandidates() {
  const mk = (ids, earnings, time) => ({
    bundle_ids: ids,
    earnings,
    deployed_total_time_seconds: time,
    deployed_score: earnings / time,
  });
  return [
    mk(["o1"], 20, 35), // 0.571
    mk(["o2"], 10, 20), // 0.5
    mk(["o3"], 8, 25), // 0.32
    mk(["o1", "o2"], 30, 45), // 0.6667  (unique oracle; one-step-optimal)
    mk(["o1", "o3"], 28, 50), // 0.56
    mk(["o2", "o3"], 18, 40), // 0.45
    mk(["o1", "o2", "o3"], 38, 75), // 0.5067 (the over-included choice)
  ];
}
const find = (cands, ids) => cands.find((c) => c.bundle_ids.join() === ids.join());

test("one_step_neighbors: add, drop, and swap are classified; >1-step excluded", () => {
  const cands = fixtureCandidates();
  const nb = oneStepNeighbors(["o1"], cands);
  // {o1,o2} & {o1,o3} are adds; {o2} & {o3} are swaps; {o2,o3} and {o1,o2,o3} excluded.
  const byType = (t) => nb.filter((m) => m.type === t).map((m) => m.bundle.bundle_ids.join());
  assert.deepEqual(byType("add").sort(), ["o1,o2", "o1,o3"]);
  assert.deepEqual(byType("swap").sort(), ["o2", "o3"]);
  assert.equal(nb.length, 4); // the chosen bundle and the 2-step bundles are not neighbours
});

test("best_improving_move: returns the TRUE best one-step move (drop o3) for an over-includer", () => {
  const cands = fixtureCandidates();
  const chosen = find(cands, ["o1", "o2", "o3"]);
  const move = bestImprovingMove(chosen, cands);
  assert.equal(move.type, "drop");
  assert.equal(move.dropped_id, "o3"); // dropping o3 -> {o1,o2} score .667 beats dropping o2 -> .56
  assert.deepEqual(move.neighbor_bundle_ids, ["o1", "o2"]);
  assert.equal(move.violation_label, "over_inclusion");
  assert.equal(move.earnings_delta, -8); // 30 - 38
  assert.equal(move.time_delta_seconds, -30); // 45 - 75
  assert.equal(move.from_rate_per_min, 30.4);
  assert.equal(move.to_rate_per_min, 40);
});

test("marginal_feedback_message: exact acceptance-criteria string for the over-includer", () => {
  const cands = fixtureCandidates();
  const chosen = find(cands, ["o1", "o2", "o3"]);
  const { text, violation_label, best_improving_move } = marginalFeedbackMessage(chosen, cands);
  assert.equal(
    text,
    "Dropping order o3 would raise your rate from $30.4/min to $40/min: earn $8 less but finish 30s sooner.",
  );
  assert.equal(violation_label, "over_inclusion");
  assert.ok(best_improving_move, "payload present for logging");
});

test("one-step-optimal choice: no message, violation_label none", () => {
  const cands = fixtureCandidates();
  const chosen = find(cands, ["o1", "o2"]); // score .667, no strictly-better neighbour
  assert.equal(bestImprovingMove(chosen, cands), null);
  const msg = marginalFeedbackMessage(chosen, cands);
  assert.equal(msg.text, "");
  assert.equal(msg.violation_label, "none");
  assert.equal(violationLabel(null), "none");
});

test("marginal move is never invented: best move equals an actual legal candidate", () => {
  const cands = fixtureCandidates();
  const chosen = find(cands, ["o1", "o2", "o3"]);
  const move = bestImprovingMove(chosen, cands);
  const legalKeys = new Set(cands.map((c) => c.bundle_ids.join()));
  assert.ok(legalKeys.has(move.neighbor_bundle_ids.join()));
});

test("sibling arm messages: aggregate scalar-only, oracle best bundle, component names weakness, control empty", () => {
  const cands = fixtureCandidates();
  const chosen = find(cands, ["o1", "o2", "o3"]);

  const agg = aggregateFeedbackMessage(chosen);
  assert.equal(Math.round(ratePerMin(chosen) * 10) / 10, 30.4);
  assert.match(agg.text, /^Your rate: \$30\.4\/min\.$/);
  assert.doesNotMatch(agg.text, /order|Drop|Add|Swap|bundle/i); // no recommendation

  const oracle = oracleFeedbackMessage(cands);
  assert.equal(oracle.text, "Best bundle: order o1 + order o2."); // max-score legal bundle

  const comp = componentFeedbackMessage({ dominant_weakness: "W1" });
  assert.match(comp.text, /pick time/);
  assert.equal(comp.target_weakness, "W1");

  assert.equal(controlFeedbackMessage().text, "");
});

test("feedbackForArm dispatches and always returns a uniform record", () => {
  const cands = fixtureCandidates();
  const chosenBundle = find(cands, ["o1", "o2", "o3"]);
  for (const arm of ["marginal", "component", "aggregate", "oracle", "control"]) {
    const r = feedbackForArm(arm, { chosenBundle, legalBundles: cands, diagnosis: { dominant_weakness: "W1" } });
    assert.ok("text" in r && "violation_label" in r && "best_improving_move" in r, `arm ${arm} record shape`);
  }
  // only the marginal arm references a concrete legal move
  const marginal = feedbackForArm("marginal", { chosenBundle, legalBundles: cands, diagnosis: {} });
  assert.ok(marginal.best_improving_move);
});

test("feedback coaches the learning_target, not the raw dominant (W2 cross-city never coached)", () => {
  // dominant is W2 (cross-city, poorly identified) but the coachable learning_target is W1.
  const dx = { dominant_weakness: "W2", learning_target: "W1" };
  const comp = componentFeedbackMessage(dx);
  assert.match(comp.text, /pick time/, "names the coachable picking target");
  assert.doesNotMatch(comp.text, /cross-city|routing/);
  assert.equal(comp.target_weakness, "W1");
});
