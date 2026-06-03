import test from "node:test";
import assert from "node:assert/strict";

import {
  buildChiScenarioSet,
  validateChiScenarioSet,
  enumerateLegalBundles,
  scoreBundle,
  CHI_STARTING_CITY,
} from "../../src/lib/chiScenarioDesign.js";

test("default CHI scenario set has 30 rounds in A/B/C (10/10/10)", () => {
  const set = buildChiScenarioSet();
  assert.equal(set.scenarios.length, 30);
  const counts = { A: 0, B: 0, C: 0 };
  for (const s of set.scenarios) counts[s.phase] += 1;
  assert.deepEqual(counts, { A: 10, B: 10, C: 10 });
});

test("A5: 2x2 of overlap x dispersion is spanned in A and B with >=2 per cell", () => {
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

test("A3: Phase C is a labeled shift with novel stores and no reused order ids", () => {
  const set = buildChiScenarioSet();
  const phaseC = set.scenarios.filter((s) => s.phase === "C");
  assert.equal(phaseC.length, 10);
  assert.ok(phaseC.every((s) => s.shift_flag === 1));
  // validate() also checks novelty + disjoint ids + harder cross-city; assert ok.
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

test("configurable round counts are honored", () => {
  const set = buildChiScenarioSet({ roundsPerPhase: { A: 8, B: 8, C: 8 }, seed: 7 });
  assert.equal(set.scenarios.length, 24);
  assert.ok(validateChiScenarioSet(set, { minPerCell: 2 }).ok);
});
