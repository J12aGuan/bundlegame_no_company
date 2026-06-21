import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { gramSpectrum, observabilityGramian, SPAN_AXES } from "../../src/lib/menuSpan.js";

// C2: the observability Gramian is the central object of the identifiability theorem.
// The bias (latent state) restricted to a set of axes is OBSERVABLE iff lambda_min(G) > 0;
// a rank-1 (scalar/regret) observation map collapses it to unobservable over >= 2 axes.

test("gramSpectrum recovers a known full-rank spectrum", () => {
  // rows = sqrt(3)*e1 and 1*e2  ->  Gram = diag(3, 1).
  const s = gramSpectrum([[Math.sqrt(3), 0], [0, 1]]);
  assert.equal(s.rank, 2);
  assert.ok(Math.abs(s.lambda_max - 3) < 1e-9 && Math.abs(s.lambda_min - 1) < 1e-9, `got ${s.eigenvalues}`);
  assert.ok(Math.abs(s.condition - 3) < 1e-9, `condition ${s.condition}`);
});

test("gramSpectrum: a rank-1 (collinear) observation map is unobservable (lambda_min = 0)", () => {
  // every observation lies along the same direction -> rank 1, lambda_min ~ 0.
  const dir = [1, 2, -1];
  const rows = [1, 0.5, 3, -2].map((c) => dir.map((x) => c * x));
  const s = gramSpectrum(rows);
  assert.equal(s.rank, 1, `collinear rows must be rank 1, got ${s.rank}`);
  assert.ok(s.lambda_min < 1e-6, `lambda_min should be ~0, got ${s.lambda_min}`);
  assert.equal(s.condition, Infinity);
});

test("COUNTERFACTUAL channel: the spanning (trap) menus make the bias observable (lambda_min > 0)", () => {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1);
  const g = observabilityGramian(traps, { axes: SPAN_AXES });
  assert.equal(g.channel, "counterfactual");
  assert.equal(g.rank, SPAN_AXES.length, `traps should jointly identify all ${SPAN_AXES.length} axes, got rank ${g.rank}`);
  assert.ok(g.lambda_min > 1e-6, `observable => lambda_min > 0, got ${g.lambda_min}`);
  assert.ok(Number.isFinite(g.condition), `condition should be finite, got ${g.condition}`);
});

test("SCALAR channel: projecting the SAME menus onto one value direction makes the bias unobservable", () => {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1);
  // The scalar/regret channel observes only the aggregate value gap (one direction).
  const reward = [1, -1, -1, -1]; // +earnings, -each cost (representative value direction)
  const g = observabilityGramian(traps, { axes: SPAN_AXES, projectOnto: reward });
  assert.equal(g.channel, "scalar");
  assert.equal(g.rank, 1, `a scalar projection must be rank 1, got ${g.rank}`);
  assert.ok(g.lambda_min < 1e-6, `scalar channel => unobservable over >=2 axes (lambda_min ~ 0), got ${g.lambda_min}`);
});

test("earnings is decoupled from each cost axis on the traps (rank 2 per pair, observable)", () => {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1);
  for (const axis of ["effective_pick_time_seconds", "local_travel_time_seconds", "cross_city_travel_time_seconds"]) {
    const g = observabilityGramian(traps, { axes: ["earnings", axis] });
    assert.equal(g.rank, 2, `earnings must be observable jointly with ${axis}`);
    assert.ok(g.lambda_min > 1e-6, `lambda_min > 0 for earnings x ${axis}, got ${g.lambda_min}`);
  }
});
