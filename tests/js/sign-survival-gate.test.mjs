import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import {
  signSurvivalGate,
  gatedTargetWeakness,
  gateDecisionForLog,
  SIGN_SURVIVAL_GATE,
} from "../../src/lib/signSurvivalGate.js";

// Planted-worker harness (same shape as chi-spanning-read.test.mjs): a worker perceives a
// biased utility and picks the argmax over each round's candidate bundles. The gate then
// re-scores those choices under the frozen grid and decides the robust coaching target.
const perceived = (f, b) =>
  Math.pow(f.earnings, b.gamma) /
  Math.max(
    0.1,
    b.aPick * f.effective_pick_time_seconds +
      b.aCross * f.cross_city_travel_time_seconds +
      b.aLocal * f.local_travel_time_seconds -
      f.shared_item_savings_seconds,
  );

function choiceSets(chooser) {
  const set = buildChiScenarioSet();
  // The diagnostic-block rounds (Phase A) plus the same-support retention OFF block — the full
  // unaided battery, including the W1/W3-confounding picking-stress menus.
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  return pool.map((s) => {
    const cands = s.candidate_bundles;
    const chosen = chooser(cands);
    return {
      round: s.round,
      alternatives: cands.map((c) => ({
        features: {
          earnings: c.earnings,
          effective_pick_time_seconds: c.effective_pick_time_seconds,
          cross_city_travel_time_seconds: c.cross_city_travel_time_seconds,
          local_travel_time_seconds: c.local_travel_time_seconds,
          shared_item_savings_seconds: c.shared_item_savings_seconds,
          shared_store_local_seconds: c.shared_store_local_seconds,
        },
        chosen: c === chosen,
      })),
    };
  });
}

const argmax = (cands, f) => cands.reduce((a, c) => (f(c) > f(a) ? c : a), cands[0]);
// An unbiased worker plays the oracle (the rate-optimal bundle) every round.
const unbiased = (cands) => cands.find((c) => c.is_oracle === 1) || argmax(cands, (c) => c.score ?? 0);
const biasedChooser = (b) => (cands) => argmax(cands, (c) => perceived(c, b));

// Strong over-bundler: heavily neglects pick time -> always adds orders (high pick).
const overBundler = biasedChooser({ gamma: 1.0, aPick: 0.05, aCross: 1, aLocal: 1 });
// Strong payout-overweighter: chases earnings hard (gamma 3).
const payout = biasedChooser({ gamma: 3.0, aPick: 1, aCross: 1, aLocal: 1 });
// Weak bias: a mild payout lean that deviates on a few menus but never robustly clears the floor.
const weak = biasedChooser({ gamma: 1.3, aPick: 1, aCross: 1, aLocal: 1 });

test("frozen grid: the nominal (savings 0.25, local 0, rho 0) is a grid point and equals the study rule", () => {
  assert.ok(SIGN_SURVIVAL_GATE.grid.savings.includes(SIGN_SURVIVAL_GATE.nominal.savings));
  assert.ok(SIGN_SURVIVAL_GATE.grid.local.includes(SIGN_SURVIVAL_GATE.nominal.local));
  assert.ok(SIGN_SURVIVAL_GATE.grid.rho.includes(SIGN_SURVIVAL_GATE.nominal.rho));
  assert.deepEqual(SIGN_SURVIVAL_GATE.grid.savings, [0.25, 0.5, 1.0]);
  assert.deepEqual(SIGN_SURVIVAL_GATE.grid.local, [0, 0.25]);
  assert.equal(SIGN_SURVIVAL_GATE.nominal.savings, 1.0); // full credit on the baked study saving == scoreBundle
  assert.equal(SIGN_SURVIVAL_GATE.nominal.local, 0);
});

test("planted worker: unbiased -> no_target", () => {
  const d = signSurvivalGate(choiceSets(unbiased));
  assert.equal(d.chosen_target, "no_target", `unbiased should not be coached, got ${d.chosen_target}`);
  assert.equal(gatedTargetWeakness(d), null);
});

test("planted worker: strong over-bundler -> pick (W1)", () => {
  const d = signSurvivalGate(choiceSets(overBundler));
  assert.equal(d.chosen_target, "W1", `over-bundler should be coached W1, got ${d.chosen_target}`);
  assert.equal(d.per_component.W1.pass, true);
  assert.ok(d.per_component.W1.sign > 0, "pick attribution should be positive (neglect)");
});

test("planted worker: strong payout -> earnings (W3)", () => {
  const d = signSurvivalGate(choiceSets(payout));
  assert.equal(d.chosen_target, "W3", `payout-chaser should be coached W3, got ${d.chosen_target}`);
  assert.equal(d.per_component.W3.pass, true);
});

test("planted worker: weak bias -> no_target", () => {
  const d = signSurvivalGate(choiceSets(weak));
  assert.equal(d.chosen_target, "no_target", `weak bias should not clear the floor, got ${d.chosen_target}`);
});

test("W2 (cross) is never coached even if computed", () => {
  // The cross component is logged but excluded from candidacy.
  const d = signSurvivalGate(choiceSets(overBundler));
  assert.ok(!SIGN_SURVIVAL_GATE.coachable.includes("W2"));
  assert.ok("W2" in d.per_component, "W2 is still logged");
  assert.notEqual(d.chosen_target, "W2");
});

test("the gate is deterministic (fixed bootstrap seed)", () => {
  const a = signSurvivalGate(choiceSets(payout));
  const b = signSurvivalGate(choiceSets(payout));
  assert.deepEqual(a.per_component, b.per_component);
});

test("the log view carries the fields the Firestore allowlist needs", () => {
  const d = signSurvivalGate(choiceSets(payout));
  const log = gateDecisionForLog(d);
  assert.equal(log.chosen_target, "W3");
  assert.ok(log.components.W1 && log.components.W3 && log.components.W2);
  assert.ok(Array.isArray(log.components.W3.worst_case) && log.components.W3.worst_case.length === 2);
  assert.equal(log.grid.floor, SIGN_SURVIVAL_GATE.floor);
  assert.deepEqual(log.grid.savings, [0.25, 0.5, 1.0]);
  assert.deepEqual(log.grid.local, [0, 0.25]);
});
