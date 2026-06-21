import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { diagnose, menuIdentifiesEarnings } from "../../src/lib/chiDiagnosis.js";

// The C2 estimator fix (docs/IDENTIFIABILITY_THEORY.md §6): the deployed diagnosis reads
// the bias on the earnings-IDENTIFYING (observable/spanning) menus, so a payout leak is
// recovered as W3 from BEHAVIOUR ALONE on the FULL battery — not only via the survey or the
// recency re-tune. Without it, the picking-stress menus (where the highest-paying bundle is
// also the over-bundle) confound a payout-overweighter with a pick-neglecter (W3 -> W1).

const perceived = (f, b) => Math.pow(f.earnings, b.gamma) / Math.max(
  0.1,
  b.aPick * f.effective_pick_time_seconds
  + b.aCross * f.cross_city_travel_time_seconds
  + b.aLocal * f.local_travel_time_seconds
  - f.shared_item_savings_seconds,
);

// Play EVERY unaided menu (Phase A diagnostic battery + the retention OFF block), i.e. the
// full battery INCLUDING the confounding picking-stress menus — not just the clean traps.
function fullBatteryChoiceSets(bias) {
  const set = buildChiScenarioSet();
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  return pool.map((s) => {
    const cands = s.candidate_bundles;
    let best = cands[0];
    for (const c of cands) if (perceived(c, bias) > perceived(best, bias)) best = c;
    return {
      round: s.round,
      alternatives: cands.map((c) => ({
        features: {
          earnings: c.earnings,
          effective_pick_time_seconds: c.effective_pick_time_seconds,
          cross_city_travel_time_seconds: c.cross_city_travel_time_seconds,
          local_travel_time_seconds: c.local_travel_time_seconds,
          shared_item_savings_seconds: c.shared_item_savings_seconds,
        },
        chosen: c === best,
        oracle: c.is_oracle === 1,
      })),
    };
  });
}

const BIASES = {
  trueW3: { gamma: 2.0, aPick: 1, aCross: 1, aLocal: 1 },        // payout-overweighting
  pickNeglect: { gamma: 1.0, aPick: 0.05, aCross: 1, aLocal: 1 }, // over-bundling (W1)
  localNeglect: { gamma: 1.0, aPick: 1, aCross: 1, aLocal: 0.05 }, // nuisance neglect
  crossNeglect: { gamma: 1.0, aPick: 1, aCross: 0.05, aLocal: 1 }, // W2 (uncoachable)
};

// Behaviour-only (no survey, no recency) so the recovery is purely the estimator's.
const behaviourDiag = (bias, opts = {}) => diagnose({ choiceSets: fullBatteryChoiceSets(bias), ...opts });

test("the spanning read partitions the real battery: every trap identifies earnings, no picking-stress menu does", () => {
  const set = buildChiScenarioSet();
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  const toSet = (s) => ({ alternatives: s.candidate_bundles.map((c) => ({ features: c })) });
  for (const s of pool.filter((x) => x.is_payout_trap === 1)) {
    assert.ok(menuIdentifiesEarnings(toSet(s).alternatives), `trap round ${s.round} must identify earnings`);
  }
  for (const s of pool.filter((x) => x.stress === "pick")) {
    assert.ok(!menuIdentifiesEarnings(toSet(s).alternatives), `picking-stress round ${s.round} must NOT identify earnings (over-bundle confound)`);
  }
});

test("HEADLINE: a pure payout-overweighter is recovered as W3 from behaviour on the full battery", () => {
  const d = behaviourDiag(BIASES.trueW3);
  assert.equal(d.dominant_weakness, "W3", `payout-chaser should be dominant W3, got ${d.dominant_weakness}`);
  assert.equal(d.learning_target, "W3", `payout-chaser should be coached W3, got ${d.learning_target}`);
  assert.ok(d.spanning_used, "the read should have restricted to the spanning subspace");
});

test("the pooled read MISDIAGNOSES the same payout-overweighter as W1 (the confound the fix resolves)", () => {
  const pooled = behaviourDiag(BIASES.trueW3, { spanningRead: false });
  assert.equal(pooled.learning_target, "W1", `pooled read should misfire to W1, got ${pooled.learning_target}`);
});

test("a pure pick-neglecter still reads W1 on the full battery", () => {
  const d = behaviourDiag(BIASES.pickNeglect);
  assert.equal(d.dominant_weakness, "W1", `pick-neglect should be dominant W1, got ${d.dominant_weakness}`);
  assert.equal(d.learning_target, "W1");
});

test("single-axis nuisance/uncoachable neglecters are NOT coached W3 (abstain)", () => {
  const local = behaviourDiag(BIASES.localNeglect);
  const cross = behaviourDiag(BIASES.crossNeglect);
  assert.equal(local.learning_target, "none", `local-neglect must not be coached, got ${local.learning_target}`);
  assert.notEqual(local.dominant_weakness, "W3", "local-neglect must not be read as payout-overweighting");
  assert.equal(cross.learning_target, "none", `cross-neglect must abstain, got ${cross.learning_target}`);
});
