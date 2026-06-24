import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { diagnose, learningIndex, ABSTAIN_MIN_LEAK } from "../../src/lib/chiDiagnosis.js";
import { signSurvivalGate } from "../../src/lib/signSurvivalGate.js";

// P2: the diagnosis surfaces per-axis identifiability and ABSTAINS (learning_target
// "none") rather than coach a possibly-misidentified axis. With learning_target "none"
// the marginal arm still shows the true best one-step move and the component arm a
// generic message (verified in marginal-feedback.test.mjs / by inspection), so
// abstention degrades gracefully to the UNtargeted move.

const perceived = (f, b) => Math.pow(f.earnings, b.gamma) / Math.max(
  0.1,
  b.aPick * f.effective_pick_time_seconds
  + b.aCross * f.cross_city_travel_time_seconds
  + b.aLocal * f.local_travel_time_seconds
  - f.shared_item_savings_seconds,
);

function unaidedChoiceSets(bias) {
  // The diagnosis is ALWAYS fit on the full UNAIDED battery (Phase A + the two OFF blocks), not
  // on the trap menus in isolation. That matters here: the redesign's clean shift trap needs a
  // large local penalty to clear the 12% floor, which correlates local with earnings ON THE
  // TRAP MENUS, so a trap-only pool can leak local-neglect into a false W3. The full battery
  // (which also contains route/base menus that vary local INDEPENDENTLY of earnings) breaks that
  // correlation, which is exactly why the production diagnosis abstains. So play the full unaided
  // battery -- what the diagnosis really sees -- matching chi-spanning-read's fullBatteryChoiceSets.
  const pool = buildChiScenarioSet().scenarios.filter((s) => s.phase === "A" || s.test_set);
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

const B = {
  trueW3: { gamma: 2.0, aPick: 1, aCross: 1, aLocal: 1 },
  localNeglect: { gamma: 1.0, aPick: 1, aCross: 1, aLocal: 0.05 },
  crossNeglect: { gamma: 1.0, aPick: 1, aCross: 0.05, aLocal: 1 },
  pickNeglect: { gamma: 1.0, aPick: 0.05, aCross: 1, aLocal: 1 },
};

test("PICKING-PRIMARY: a payout-overweighter is MEASURED but NOT coached W3 (W3 confounded with cross)", () => {
  // The local-axis trap was dropped (it required within-city > between-city geometry). The only
  // earnings-identifying menus left are CROSS traps (low-pick, high-pay H in a far city), where a
  // payout-overweighter and a cross-neglecter choose identically -> W3 is confounded with W2 (cross).
  // So the GATE safely abstains on a payout worker (no W3 coaching), and the diagnosis reads the
  // payout leak as confounded (cross-dominant), not a clean W3. W3 stays identifiABLE (the design
  // still probes it) but is not a coaching target -- it is a measured trait, per the pre-reg.
  const sets = unaidedChoiceSets(B.trueW3);
  assert.notEqual(signSurvivalGate(sets).chosen_target, "W3", "payout must NOT be coached W3 at the gate");
  const d = diagnose({ choiceSets: sets });
  assert.ok(Number.isFinite(d.identifiability.W3) && d.identifiability.W3 > 0, "W3 axis is still identifiable (probed by the cross traps)");
});

test("STRONG GUARDRAIL: a pure LOCAL or CROSS neglecter is NEVER coached W3 (the gate's dual-axis abstention)", () => {
  // Hard guarantee at the COACHING level. The diagnosis reads on the BROAD earnings-identifying set
  // (preserving 93% W3 recovery), so on this menu set it can still project a spurious W3 for a pure
  // nuisance-axis neglecter. The GATE -- the coaching authority -- is what must never coach it: its
  // dual-axis abstention refuses W3 whenever a robust local OR cross neglect signal rivals the payout
  // signal. A pure local- or cross-only neglecter must therefore never be coached W3.
  for (const [name, bias] of [["local", B.localNeglect], ["cross", B.crossNeglect]]) {
    const d = signSurvivalGate(unaidedChoiceSets(bias));
    assert.notEqual(d.chosen_target, "W3", `${name}-neglecter must NEVER be coached W3, got ${d.chosen_target}`);
    assert.ok(d.chosen_target === "no_target" || d.chosen_target === "W1", `${name}-neglecter: expected no_target or W1, got ${d.chosen_target}`);
  }
});

test("ACTIONABLE: a CROSS-only neglecter is NOT coached W3 — abstains, loads its own (uncoachable) axis", () => {
  const d = diagnose({ choiceSets: unaidedChoiceSets(B.crossNeglect) });
  // The core guarantee: a cross-neglecter is NOT coached (it loads its OWN uncoachable axis W2,
  // not a false payout signal). It may abstain either because the coachable leaks sit below the
  // noise floor or because the dominant leak is uncoachable; both are correct "do not coach".
  assert.equal(d.learning_target, "none");
  assert.equal(d.dominant_weakness, "W2", "cross-neglect must load its own axis (W2), not W3");
  assert.ok(["dominant_leak_is_uncoachable", "leak_below_noise_floor"].includes(d.abstain_reason), d.abstain_reason);
});

test("ACTIONABLE: a PICK-only neglecter is coached W1 (its own coachable axis)", () => {
  const d = diagnose({ choiceSets: unaidedChoiceSets(B.pickNeglect) });
  assert.equal(d.learning_target, "W1");
  assert.equal(d.abstained, false);
});

test("diagnose surfaces per-axis identifiability", () => {
  const d = diagnose({ choiceSets: unaidedChoiceSets(B.trueW3) });
  for (const w of ["W1", "W2", "W3"]) assert.ok(Number.isFinite(d.identifiability[w]), `identifiability.${w}`);
  // earnings (W3) is the most-probed axis on the traps for a payout-chaser.
  assert.ok(d.identifiability.W3 >= d.identifiability.W1, "W3 should be at least as identified as W1 for trueW3");
});

test("identifiability-weighting lets a well-identified payout leak win over a fixed W1>W3 prior", () => {
  // Equal raw leaks; without identifiability the fixed prior (W1=1.0 > W3=0.6) picks W1.
  const fixed = learningIndex({ W1: 0.5, W2: 0, W3: 0.5 });
  assert.equal(fixed.target, "W1");
  // With W3 better identified than W1, the same leaks coach W3.
  const idWeighted = learningIndex({ W1: 0.5, W2: 0, W3: 0.5 }, { identifiability: { W1: 0.3, W2: 0, W3: 3.0 } });
  assert.equal(idWeighted.target, "W3");
});

test("abstention noise floor constant is exported and positive", () => {
  assert.ok(ABSTAIN_MIN_LEAK > 0);
});
