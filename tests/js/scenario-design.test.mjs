import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiScenarioSet,
  validateChiScenarioSet,
  enumerateLegalBundles,
  scoreBundle,
  CHI_STARTING_CITY,
} from "../../src/lib/chiScenarioDesign.js";

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
