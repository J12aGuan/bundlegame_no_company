import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiSeedPayload,
  buildSeededEntry,
  rehydrateScenariosFromEntry,
  sanitizeScenarioForPersistence,
} from "../../src/lib/chiSeed.js";
import {
  buildChiScenarioSet,
  validateChiScenarioSet,
  enumerateLegalBundles,
  scoreBundle,
  sortedIdsEqual,
  CHI_STARTING_CITY,
} from "../../src/lib/chiScenarioDesign.js";
import { buildChiStudyProtocol } from "../../src/lib/researchStudy.js";
import { roundContext, diagnoseTrigger, shouldShowSurvey } from "../../src/lib/chiStudyRuntime.js";

const FEATURE_COLS = [
  "earnings", "effective_pick_time_seconds", "cross_city_travel_time_seconds",
  "local_travel_time_seconds", "shared_item_savings_seconds",
];

// Mirrors bundle.js::getCandidatesForScenario's runtime DERIVE path (no candidate_bundles):
// score every legal bundle from the scenario's embedded orders at the canonical start city.
function deriveCandidates(sc) {
  const byId = Object.fromEntries(sc.orders.map((o) => [String(o.id), o]));
  const orderIds = Array.isArray(sc.order_ids) && sc.order_ids.length ? sc.order_ids : sc.orders.map((o) => o.id);
  const legal = enumerateLegalBundles(orderIds, byId, Number(sc.max_bundle) || 3);
  const scored = legal.map((ids) => scoreBundle(ids, byId, CHI_STARTING_CITY, Number(sc.travel_scale) || 1));
  const best = scored.reduce((b, c) => (c.score > b.score ? c : b), scored[0]);
  return scored.map((s) => ({ ...s, legal: 1, is_oracle: sortedIdsEqual(s.bundle_ids, best.bundle_ids) ? 1 : 0 }));
}

test("seed payload: 35 scenarios + a deduped orders pool under version chi_dynamic_v1", () => {
  const payload = buildChiSeedPayload();
  assert.equal(payload.versionId, "chi_dynamic_v1");
  assert.equal(payload.scenarios.length, 35);
  assert.ok(payload.orders.length > 0, "orders pool is non-empty");
  // orders pool shape (mirrors firebaseDB.sanitizeOrders).
  for (const o of payload.orders) {
    for (const k of ["id", "city", "store", "earnings", "estimatedTime", "localTravelTime"]) {
      assert.ok(k in o, `order missing ${k}`);
    }
  }
  // skip_protocol_validation is set so the live writer does not require the protocol
  // snapshot at seed time (default flip + protocol linkage is a separate deploy step).
  assert.equal(payload.metadata.skip_protocol_validation, true);
});

test("the persisted sanitizer preserves the CHI scenario fields the runtime + validator need", () => {
  const set = buildChiScenarioSet();
  const trap = set.scenarios.find((s) => s.is_payout_trap === 1);
  const persisted = sanitizeScenarioForPersistence(trap);
  for (const k of ["block_kind", "test_set", "store_overlap_flag", "dispersion_flag",
    "is_payout_trap", "oracle_bundle_ids", "candidate_bundles", "orders", "travel_scale", "stress"]) {
    assert.ok(persisted[k] !== undefined, `persisted scenario dropped ${k}`);
  }
  // A realistic legacy 'experiment' scenario (order_ids + extraneous generator fields,
  // NO embedded orders / CHI fields) keeps exactly the minimal shape — extras dropped,
  // nothing CHI added. This is why the shared writer is safe for the 'experiment' dataset.
  const legacy = sanitizeScenarioForPersistence({
    round: 3, phase: "A", scenario_id: "x", max_bundle: 3, order_ids: ["a", "b"],
    candidate_bundle_count: 2, reward_model_version: "v1", recommendation_phase: false,
  });
  assert.deepEqual(Object.keys(legacy).sort(), ["max_bundle", "order_ids", "phase", "round", "scenario_id"]);
  assert.deepEqual(legacy.order_ids, ["a", "b"]);
});

test("CRITICAL round-trip: validateChiScenarioSet passes on the REHYDRATED seeded set", () => {
  const payload = buildChiSeedPayload();
  const entry = buildSeededEntry(payload);            // what the Firestore datasets[root] doc holds
  const rehydrated = rehydrateScenariosFromEntry(entry); // what getExperimentScenarios returns (verbatim)
  const v = validateChiScenarioSet({ scenarios: rehydrated });
  assert.ok(v.ok, `rehydrated set invalid:\n  - ${v.errors.join("\n  - ")}`);
  assert.equal(v.n_scenarios, 35);
});

test("CRITICAL round-trip: a seeded TRAP scenario still derives a decoupled action set", () => {
  const payload = buildChiSeedPayload();
  const rehydrated = rehydrateScenariosFromEntry(buildSeededEntry(payload));
  const trap = rehydrated.find((s) => s.is_payout_trap === 1);
  assert.ok(trap && Array.isArray(trap.orders) && trap.orders.length >= 3, "trap kept its embedded orders");

  const cands = deriveCandidates(trap); // the GAP3 derive path on the rehydrated orders
  assert.ok(cands.length >= 2);
  for (const c of cands) {
    for (const col of FEATURE_COLS) assert.ok(Number.isFinite(Number(c[col])), `derived candidate missing ${col}`);
  }
  // earnings and pick are still DECOUPLED after the round-trip: the max-earnings bundle
  // is NOT the max-score (optimal) bundle -> a payout leak stays identifiable.
  const maxEarn = cands.reduce((b, c) => (c.earnings > b.earnings ? c : b), cands[0]);
  const maxScore = cands.reduce((b, c) => (c.score > b.score ? c : b), cands[0]);
  assert.ok(!sortedIdsEqual(maxEarn.bundle_ids, maxScore.bundle_ids),
    "max-earnings bundle equals the optimal after round-trip (trap collapsed)");
  assert.ok(maxScore.total_time_seconds < maxEarn.total_time_seconds, "optimal should be faster than max-pay");
});

test("seeded scenarios align with the study protocol schedule (ON/OFF/survey/diagnosis/transfer)", () => {
  const protocol = buildChiStudyProtocol();
  const rehydrated = rehydrateScenariosFromEntry(buildSeededEntry(buildChiSeedPayload()));

  for (const s of rehydrated) {
    const ctx = roundContext(protocol, s.round);
    // The protocol-derived block kind / test set must match the seeded scenario fields.
    assert.equal(ctx.block_kind, s.block_kind, `round ${s.round} block_kind mismatch`);
    assert.equal(ctx.test_set ?? null, s.test_set ?? null, `round ${s.round} test_set mismatch`);
    // Feedback is enabled ONLY in ON blocks.
    assert.equal(ctx.feedback_enabled, s.block_kind === "on", `round ${s.round} feedback gating`);
  }

  // Survey after Phase A (round 15); diagnosis at 15 / 25 / 35 only.
  assert.ok(shouldShowSurvey(protocol, 15));
  assert.equal(diagnoseTrigger(protocol, 15), "initial");
  assert.equal(diagnoseTrigger(protocol, 25), "retune");
  assert.equal(diagnoseTrigger(protocol, 35), "final");
  for (const r of [10, 20, 26, 30]) assert.equal(diagnoseTrigger(protocol, r), null, `no diagnosis at ${r}`);

  // ON blocks 16-20 and 26-30; transfer (shifted) is the last block, rounds 31-35.
  const onRounds = rehydrated.filter((s) => s.block_kind === "on").map((s) => s.round).sort((a, b) => a - b);
  assert.deepEqual(onRounds, [16, 17, 18, 19, 20, 26, 27, 28, 29, 30]);
  const transferRounds = rehydrated.filter((s) => s.test_set === "transfer_shifted").map((s) => s.round).sort((a, b) => a - b);
  assert.deepEqual(transferRounds, [31, 32, 33, 34, 35]);
});
