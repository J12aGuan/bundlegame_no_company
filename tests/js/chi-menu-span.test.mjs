import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { spanDiagnostics, symmetricEigenvalues } from "../../src/lib/menuSpan.js";

// P4: SHOW (not assert) that the deployed menus' one-step marginal vectors span the
// {earnings, pick, local, cross} subspace, so the bias on each axis is jointly
// identifiable — the experimental face of the identifiability theorem.

test("the re-diagnosis input (diagnostic + retention) spans all 4 cost/earnings axes", () => {
  const set = buildChiScenarioSet();
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  const d = spanDiagnostics(pool);
  assert.equal(d.rank, 4, `expected full rank 4 over {earnings,pick,local,cross}, got ${d.rank} (sv=${d.singular_values.map((x) => x.toFixed(2))})`);
  assert.ok(d.condition < 50, `marginal matrix should be reasonably conditioned, got ${d.condition.toFixed(1)}`);
});

test("on the payout traps, earnings is DECOUPLED from local (rank 2, well-conditioned)", () => {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1);
  const d = spanDiagnostics(traps, { axes: ["earnings", "local_travel_time_seconds"] });
  assert.equal(d.rank, 2, "earnings and local must not be collinear on the traps");
  assert.ok(d.condition < 10, `earnings/local should be well-separated, got cond ${d.condition.toFixed(1)}`);
});

test("earnings is also decoupled from cross and from pick on the traps", () => {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1);
  for (const axis of ["cross_city_travel_time_seconds", "effective_pick_time_seconds"]) {
    const d = spanDiagnostics(traps, { axes: ["earnings", axis] });
    assert.equal(d.rank, 2, `earnings must be decoupled from ${axis}`);
  }
});

test("symmetricEigenvalues recovers a known spectrum", () => {
  // diag-dominant 2x2 with known eigenvalues 3 and 1.
  const ev = symmetricEigenvalues([[2, 1], [1, 2]]);
  assert.ok(Math.abs(ev[0] - 3) < 1e-6 && Math.abs(ev[1] - 1) < 1e-6, `got ${ev}`);
});
