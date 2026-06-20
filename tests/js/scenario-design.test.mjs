import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiScenarioSet,
  validateChiScenarioSet,
  enumerateLegalBundles,
  scoreBundle,
  sortedIdsEqual,
  CHI_STARTING_CITY,
} from "../../src/lib/chiScenarioDesign.js";
import { marginalFeedbackMessage } from "../../src/lib/marginalFeedback.js";

const FEATURE_COLS = [
  "earnings", "effective_pick_time_seconds", "cross_city_travel_time_seconds",
  "local_travel_time_seconds", "shared_item_savings_seconds",
];

test("default CHI scenario set has 35 rounds: 15 diagnostic (A) + 20 blocked B (5/5/5/5)", () => {
  const set = buildChiScenarioSet();
  assert.equal(set.scenarios.length, 35);
  const counts = { A: 0, B: 0 };
  for (const s of set.scenarios) counts[s.phase] += 1;
  assert.deepEqual(counts, { A: 15, B: 20 });
  // Phase B rounds 16..35 carry blocks B1 on / B2 off / B3 on / B4 off, 5 each.
  const blocks = set.scenarios.filter((s) => s.phase === "B").map((s) => s.block);
  const blockCounts = blocks.reduce((m, b) => ((m[b] = (m[b] || 0) + 1), m), {});
  assert.deepEqual(blockCounts, { B1: 5, B2: 5, B3: 5, B4: 5 });
  const onOff = ["B1", "B2", "B3", "B4"].map((id) => set.scenarios.find((s) => s.block === id).block_kind);
  assert.deepEqual(onOff, ["on", "off", "on", "off"]);
  // Feedback fires only in ON blocks.
  assert.ok(set.scenarios.filter((s) => s.block_kind === "on").every((s) => s.feedback_enabled === true));
  assert.ok(set.scenarios.filter((s) => s.block_kind === "off").every((s) => s.feedback_enabled === false));
});

test("2x2 of overlap x dispersion is spanned in the diagnostic battery and ON pool", () => {
  const set = buildChiScenarioSet();
  const v = validateChiScenarioSet(set, { minPerCell: 2 });
  assert.ok(v.ok, `scenario design invalid:\n  - ${v.errors.join("\n  - ")}`);
});

test("A5: every menu has a unique oracle and a non-trivial score_gap", () => {
  const set = buildChiScenarioSet();
  for (const s of set.scenarios) {
    assert.ok(s.oracle_bundle_ids.length >= 1, `round ${s.round} missing oracle`);
    assert.ok(s.relative_gap >= 0.03, `round ${s.round} gap too small (${s.relative_gap})`);
    // Recompute the oracle independently to confirm uniqueness.
    const byId = Object.fromEntries(s.orders.map((o) => [o.id, o]));
    const legal = enumerateLegalBundles(s.order_ids, byId, s.max_bundle);
    const scored = legal
      .map((b) => scoreBundle(b, byId, CHI_STARTING_CITY, s.travel_scale))
      .sort((a, b) => b.score - a.score);
    assert.ok(scored[0].score - scored[1].score > 1e-9, `round ${s.round} oracle tie`);
    assert.deepEqual(
      [...scored[0].bundle_ids].sort(),
      [...s.oracle_bundle_ids].sort(),
      `round ${s.round} stored oracle mismatch`,
    );
  }
});

test("transfer OFF block is a labeled shift with novel stores; held-out ids disjoint from training", () => {
  const set = buildChiScenarioSet();
  const transfer = set.scenarios.filter((s) => s.test_set === "transfer_shifted");
  const retention = set.scenarios.filter((s) => s.test_set === "retention_same_dist");
  assert.equal(transfer.length, 5);
  assert.equal(retention.length, 5);
  assert.ok(transfer.every((s) => s.shift_flag === 1));
  assert.ok(retention.every((s) => s.shift_flag === 0)); // same-distribution
  // Both OFF blocks over-sample the picking cell (overlap=1) so the coached
  // weakness is measurable; transfer carries a heavier pick load (the labeled shift).
  assert.ok(transfer.every((s) => s.store_overlap_flag === 1), "transfer must exercise picking (overlap=1)");
  assert.ok(retention.every((s) => s.store_overlap_flag === 1), "retention must exercise picking (overlap=1)");
  // validate() also checks novelty + held-out disjointness + harder cross-city.
  const v = validateChiScenarioSet(set);
  assert.ok(v.ok, v.errors.join("; "));
});

test("overlap menus make multi-order single-store bundles legal (over-bundling possible)", () => {
  const set = buildChiScenarioSet();
  const overlapMenus = set.scenarios.filter((s) => s.store_overlap_flag === 1 && (s.phase === "A" || s.phase === "B"));
  assert.ok(overlapMenus.length > 0);
  for (const s of overlapMenus.slice(0, 4)) {
    const byId = Object.fromEntries(s.orders.map((o) => [o.id, o]));
    const legal = enumerateLegalBundles(s.order_ids, byId, s.max_bundle);
    assert.ok(legal.some((b) => b.length >= 2), `overlap menu ${s.round} has no multi-order legal bundle`);
  }
});

test("configurable diagnostic count and block size are honored", () => {
  const set = buildChiScenarioSet({ diagnosticRounds: 12, blockSize: 4, seed: 7 });
  assert.equal(set.scenarios.length, 12 + 16); // 12 diagnostic + 4 blocks x 4
  const v = validateChiScenarioSet(set, { minPerCell: 2 });
  assert.ok(v.ok, v.errors.join("; "));
});

test("gap#3: every scenario carries candidate_bundles with the five feature columns + oracle", () => {
  const set = buildChiScenarioSet();
  assert.ok(validateChiScenarioSet(set).ok, validateChiScenarioSet(set).errors.join("; "));
  for (const s of set.scenarios) {
    const cb = s.candidate_bundles;
    assert.ok(Array.isArray(cb) && cb.length >= 2, `round ${s.round} needs >=2 candidates`);
    for (const c of cb) {
      for (const col of FEATURE_COLS) assert.ok(Number.isFinite(Number(c[col])), `round ${s.round} candidate missing ${col}`);
      assert.ok(Number.isFinite(Number(c.score)), "candidate has a score");
    }
    const oracles = cb.filter((c) => c.is_oracle === 1);
    assert.equal(oracles.length, 1, `round ${s.round} exactly one is_oracle`);
    assert.ok(sortedIdsEqual(oracles[0].bundle_ids, s.oracle_bundle_ids), "is_oracle == oracle_bundle_ids");
    assert.equal(oracles[0].score, Math.max(...cb.map((c) => c.score)), "oracle has the max score");
  }
});

test("gap#3: candidates derive at runtime from orders even WITHOUT an explicit pick field", () => {
  // Mirrors getCandidatesForScenario's runtime derive path on deployed orders
  // (which carry estimatedTime/localTravelTime/city but no `pick`).
  const set = buildChiScenarioSet();
  const s = set.scenarios.find((x) => x.store_overlap_flag === 1); // an over-bundling menu
  const ordersNoPick = s.orders.map(({ pick, ...rest }) => rest);
  const byId = Object.fromEntries(ordersNoPick.map((o) => [o.id, o]));
  const legal = enumerateLegalBundles(s.order_ids, byId, s.max_bundle);
  const scored = legal.map((ids) => scoreBundle(ids, byId, CHI_STARTING_CITY, s.travel_scale));
  assert.ok(scored.length >= 2, ">=2 derived candidates");
  assert.ok(scored.every((c) => Number.isFinite(c.effective_pick_time_seconds) && c.effective_pick_time_seconds >= 0));
  // The derived oracle (max score) is preserved: pick = estimatedTime - localTravelTime
  // differs from the stored pick only by per-order rounding (savings term), which is
  // far below the >=3% score gap, so the ordering and the oracle are unchanged.
  const derivedOracle = scored.reduce((b, c) => (c.score > b.score ? c : b), scored[0]);
  assert.ok(sortedIdsEqual(derivedOracle.bundle_ids, s.oracle_bundle_ids), "derived oracle == oracle_bundle_ids");
  const byKey = new Map(s.candidate_bundles.map((c) => [c.bundle_ids.join(), c.score]));
  for (const c of scored) assert.ok(Math.abs(byKey.get(c.bundle_ids.join()) - c.score) < 0.02, "derived score ~= stored score");
});

test("gap#3: marginal feedback renders for a sub-optimal bundle and is empty for the oracle", () => {
  const set = buildChiScenarioSet();
  const s = set.scenarios.find((x) => x.store_overlap_flag === 1);
  const cb = s.candidate_bundles;
  const oracle = cb.find((c) => c.is_oracle === 1);
  // Oracle is one-step-optimal -> nothing to show.
  assert.equal(marginalFeedbackMessage(oracle, cb).text, "");
  // At least one sub-optimal bundle has a true counterfactual one-step move.
  const withMove = cb.find((c) => c.is_oracle !== 1 && marginalFeedbackMessage(c, cb).text.length > 0);
  assert.ok(withMove, "some sub-optimal candidate yields a counterfactual message");
  assert.match(marginalFeedbackMessage(withMove, cb).text, /\$\d/);
});

test("payout-trap menus disambiguate W3: present in Phase A (~half of overlap menus) and both OFF blocks", () => {
  const set = buildChiScenarioSet();
  const diag = set.scenarios.filter((s) => s.phase === "A");
  const traps = diag.filter((s) => s.is_payout_trap === 1);
  const picks = diag.filter((s) => s.stress === "pick");
  // The battery keeps BOTH signals: ~half the overlap menus are picking-stress (W1)
  // and ~half are payout-trap (W3), so the logit can separate earnings from pick.
  assert.ok(traps.length >= 3, `Phase A needs payout-trap menus, got ${traps.length}`);
  assert.ok(picks.length >= 3, `Phase A keeps picking-stress menus, got ${picks.length}`);
  assert.ok(traps.every((s) => s.store_overlap_flag === 1), "traps keep a legal same-store over-bundle");
  // Both held-out OFF blocks include a trap so a residual payout leak is re-diagnosable.
  const retention = set.scenarios.filter((s) => s.test_set === "retention_same_dist");
  const transfer = set.scenarios.filter((s) => s.test_set === "transfer_shifted");
  assert.ok(retention.some((s) => s.is_payout_trap === 1), "retention OFF block has a payout trap");
  assert.ok(transfer.some((s) => s.is_payout_trap === 1), "transfer OFF block has a payout trap");
});

test("payout-trap invariant: the max-earnings bundle is sub-optimal; the optimal is faster + lower-paying", () => {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1);
  assert.ok(traps.length > 0);
  for (const s of traps) {
    const byId = Object.fromEntries(s.orders.map((o) => [o.id, o]));
    const legal = enumerateLegalBundles(s.order_ids, byId, s.max_bundle);
    const scored = legal.map((ids) => scoreBundle(ids, byId, CHI_STARTING_CITY, s.travel_scale));
    const oracle = scored.reduce((b, c) => (c.score > b.score ? c : b), scored[0]);
    const maxEarn = scored.reduce((b, c) => (c.earnings > b.earnings ? c : b), scored[0]);
    // The highest-paying legal bundle is NOT the score-optimal (so chasing payout is a trap).
    assert.ok(!sortedIdsEqual(maxEarn.bundle_ids, oracle.bundle_ids), `round ${s.round}: max-earnings IS optimal`);
    // ...and the optimal is the faster, lower-paying option.
    assert.ok(oracle.total_time_seconds < maxEarn.total_time_seconds, `round ${s.round}: optimal not faster`);
    assert.ok(oracle.earnings < maxEarn.earnings, `round ${s.round}: optimal not lower-paying`);
    // A sub-optimal same-store over-bundle exists (the W1 over-bundling bait), distinct
    // from the optimal, so over-bundling (W1) and payout-chasing (W3) pick DIFFERENT bundles.
    assert.ok(
      scored.some((c) => c.bundle_ids.length >= 2 && !sortedIdsEqual(c.bundle_ids, oracle.bundle_ids)),
      `round ${s.round}: no sub-optimal over-bundle`,
    );
    assert.deepEqual([...maxEarn.bundle_ids].sort(), [...s.max_earnings_bundle_ids].sort(), `round ${s.round} max-earn tag`);
  }
});

test("validateChiScenarioSet flags a battery that has lost its payout-trap menus", () => {
  const set = buildChiScenarioSet();
  // Strip the trap tag from every menu: the validator must complain that W3 is no
  // longer separately identifiable (and that the OFF blocks cannot re-diagnose payout).
  const stripped = {
    ...set,
    scenarios: set.scenarios.map((s) => ({ ...s, is_payout_trap: 0, stress: s.stress === "trap" ? "pick" : s.stress })),
  };
  const v = validateChiScenarioSet(stripped);
  assert.ok(!v.ok, "a trap-less battery must be rejected");
  assert.ok(v.errors.some((e) => /payout-trap/.test(e)), v.errors.join("; "));
});

test("W3 diagnosis choiceSet shape: five features, exactly one oracle, one chosen", () => {
  const set = buildChiScenarioSet();
  const s = set.scenarios.find((x) => x.phase === "A"); // an unaided round
  const candidates = s.candidate_bundles;
  const chosenIds = candidates[1].bundle_ids; // pretend the participant chose candidate #1
  const alternatives = candidates.map((c) => ({
    features: {
      earnings: c.earnings, effective_pick_time_seconds: c.effective_pick_time_seconds,
      cross_city_travel_time_seconds: c.cross_city_travel_time_seconds,
      local_travel_time_seconds: c.local_travel_time_seconds,
      shared_item_savings_seconds: c.shared_item_savings_seconds,
    },
    chosen: sortedIdsEqual(c.bundle_ids, chosenIds),
    oracle: c.is_oracle === 1 || sortedIdsEqual(c.bundle_ids, s.oracle_bundle_ids),
  }));
  assert.equal(alternatives.filter((a) => a.oracle).length, 1, "exactly one oracle");
  assert.equal(alternatives.filter((a) => a.chosen).length, 1, "exactly one chosen");
  for (const a of alternatives) for (const col of FEATURE_COLS) assert.ok(Number.isFinite(a.features[col]));
});
