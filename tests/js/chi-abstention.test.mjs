import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { diagnose, learningIndex, ABSTAIN_MIN_LEAK } from "../../src/lib/chiDiagnosis.js";

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

function trapChoiceSets(bias) {
  const traps = buildChiScenarioSet().scenarios.filter((s) => s.is_payout_trap === 1);
  return traps.map((s) => {
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

const B = {
  trueW3: { gamma: 2.0, aPick: 1, aCross: 1, aLocal: 1 },
  localNeglect: { gamma: 1.0, aPick: 1, aCross: 1, aLocal: 0.05 },
  crossNeglect: { gamma: 1.0, aPick: 1, aCross: 0.05, aLocal: 1 },
  pickNeglect: { gamma: 1.0, aPick: 0.05, aCross: 1, aLocal: 1 },
};

test("ACTIONABLE: a true payout-overweighter is coached W3", () => {
  const d = diagnose({ choiceSets: trapChoiceSets(B.trueW3) });
  assert.equal(d.learning_target, "W3");
  assert.equal(d.abstained, false);
});

test("ACTIONABLE: a LOCAL-only neglecter is NOT coached W3 — the diagnosis abstains", () => {
  const d = diagnose({ choiceSets: trapChoiceSets(B.localNeglect) });
  assert.notEqual(d.learning_target, "W3");
  assert.equal(d.learning_target, "none");
  assert.equal(d.abstained, true);
});

test("ACTIONABLE: a CROSS-only neglecter is NOT coached W3 — abstains (uncoachable dominant)", () => {
  const d = diagnose({ choiceSets: trapChoiceSets(B.crossNeglect) });
  assert.equal(d.learning_target, "none");
  assert.equal(d.abstain_reason, "dominant_leak_is_uncoachable");
});

test("ACTIONABLE: a PICK-only neglecter is coached W1 (its own coachable axis)", () => {
  const d = diagnose({ choiceSets: trapChoiceSets(B.pickNeglect) });
  assert.equal(d.learning_target, "W1");
  assert.equal(d.abstained, false);
});

test("diagnose surfaces per-axis identifiability", () => {
  const d = diagnose({ choiceSets: trapChoiceSets(B.trueW3) });
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
