import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { diagnose, menuIdentifiesEarnings } from "../../src/lib/chiDiagnosis.js";
import { signSurvivalGate } from "../../src/lib/signSurvivalGate.js";

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
          shared_store_local_seconds: c.shared_store_local_seconds,
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

test("the spanning read partitions the real battery: every trap identifies earnings (decoupled from pick)", () => {
  const set = buildChiScenarioSet();
  const pool = set.scenarios.filter((s) => s.phase === "A" || s.test_set === "retention_same_dist");
  const toSet = (s) => ({ alternatives: s.candidate_bundles.map((c) => ({ features: c })) });
  // The BROAD earnings-identifying set decouples earnings from PICK (top-payer is at or below the
  // median pick), which every payout trap satisfies. It does NOT exclude local/cross traps -- the
  // menu set cannot structurally separate payout from all three cost axes -- so a local- or
  // cross-neglect confound is handled downstream by the GATE's dual-axis abstention, not here.
  for (const s of pool.filter((x) => x.is_payout_trap === 1)) {
    assert.ok(menuIdentifiesEarnings(toSet(s).alternatives), `trap round ${s.round} must identify earnings`);
  }
});

test("PICKING-PRIMARY HEADLINE: the spanning read separates W3 from W1/pick, but NOT from W2/cross", () => {
  // The local-axis trap was dropped, so the earnings-identifying (spanning) menus are all CROSS
  // traps (low-pick, high-pay H in a far city). On those, a payout-overweighter and a PICK-neglecter
  // choose DIFFERENTLY (W3 separates from W1 -> picking is cleanly coachable), but a payout-
  // overweighter and a CROSS-neglecter choose the SAME (W3 confounded with W2). This split (high
  // payout/cross agreement, low payout/pick agreement) is exactly why W1 is coachable and W3 is not.
  const set = buildChiScenarioSet();
  const spanningMenus = set.scenarios.filter((s) => menuIdentifiesEarnings(s.candidate_bundles.map((c) => ({ features: c }))));
  const pick = (b) => (cands) => { let x = cands[0]; for (const c of cands) if (perceived(c, b) > perceived(x, b)) x = c; return x; };
  const choices = (b) => spanningMenus.map((s) => pick(b)(s.candidate_bundles));
  const payoutCh = choices(BIASES.trueW3), crossCh = choices(BIASES.crossNeglect), pickCh = choices(BIASES.pickNeglect);
  const agree = (a, b) => a.filter((x, i) => x === b[i]).length / a.length;
  const vsCross = agree(payoutCh, crossCh), vsPick = agree(payoutCh, pickCh);
  assert.ok(vsCross > vsPick + 0.3, `W3 confounded with cross (agree ${vsCross.toFixed(2)}) but separable from pick (agree ${vsPick.toFixed(2)})`);
  assert.ok(vsPick < 0.6, `payout and pick-neglecter must diverge on spanning menus (W3 separates from W1), got ${vsPick.toFixed(2)}`);
});

test("PICKING-PRIMARY: W1 is the cleanly-coachable axis; W3 is not recovered as coachable under either read", () => {
  // Under the picking-primary design neither read recovers a clean coachable W3 (it is confounded
  // with cross). The PICK error (W1) is the clean, coachable axis the study now anchors on.
  assert.notEqual(behaviourDiag(BIASES.trueW3).learning_target, "W3", "spanning read no longer yields a coachable W3");
  assert.notEqual(behaviourDiag(BIASES.trueW3, { spanningRead: false }).learning_target, "W3", "pooled read does not yield W3 either");
  assert.equal(behaviourDiag(BIASES.pickNeglect).learning_target, "W1", "the pick-neglecter IS cleanly coached W1");
});

test("a pure pick-neglecter still reads W1 on the full battery", () => {
  const d = behaviourDiag(BIASES.pickNeglect);
  assert.equal(d.dominant_weakness, "W1", `pick-neglect should be dominant W1, got ${d.dominant_weakness}`);
  assert.equal(d.learning_target, "W1");
});

test("single-axis nuisance/uncoachable neglecters are NOT COACHED W3 (the gate's dual-axis abstention)", () => {
  // The COACHING safety guarantee binds at the GATE (the layer feedbackForDecision consults), not at
  // the raw diagnosis learning_target (analysis-only, never coached). The B2 payout traps strengthen
  // the retune W3 read on purpose; that can make the RAW diagnosis label a strong nuisance-neglecter
  // W3, but the gate's dual-axis abstention refuses to COACH W3 when a rival cost axis rivals it. So
  // assert the guarantee where it actually decides what the participant is coached.
  const localGate = signSurvivalGate(fullBatteryChoiceSets(BIASES.localNeglect));
  const crossGate = signSurvivalGate(fullBatteryChoiceSets(BIASES.crossNeglect));
  assert.notEqual(localGate.chosen_target, "W3", `local-neglect must NOT be coached W3, got ${localGate.chosen_target}`);
  assert.notEqual(crossGate.chosen_target, "W3", `cross-neglect must NOT be coached W3, got ${crossGate.chosen_target}`);
  // And even the raw diagnosis signal for a nuisance neglecter stays well below a true payout leak's,
  // so the two are never confusable on magnitude.
  const local = behaviourDiag(BIASES.localNeglect);
  const cross = behaviourDiag(BIASES.crossNeglect);
  const trueW3 = behaviourDiag(BIASES.trueW3);
  assert.ok(
    trueW3.strengths.W3 > 2 * Math.max(0.01, local.strengths.W3, cross.strengths.W3),
    `a true payout leak (${trueW3.strengths.W3.toFixed(2)}) must dwarf nuisance W3 (local ${local.strengths.W3.toFixed(2)}, cross ${cross.strengths.W3.toFixed(2)})`,
  );
});
