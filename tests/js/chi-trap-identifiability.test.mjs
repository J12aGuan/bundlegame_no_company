import test from "node:test";
import assert from "node:assert/strict";

import { buildChiScenarioSet } from "../../src/lib/chiScenarioDesign.js";
import { diagnose, behavioralBias } from "../../src/lib/chiDiagnosis.js";

// The payout trap is only a clean W3 probe if choosing the high-pay H reflects
// PAYOUT-overweighting and not merely neglect of whatever single cost axis happens to
// make H slow. The heterogeneous traps (H slow via local in some menus, cross in
// others, pick in others) are supposed to guarantee this: earnings is the ONLY signal
// consistent with always choosing H. These tests are the adversarial check the suite
// previously lacked — they exercise the DIAGNOSIS on synthetic choosers, not just the
// menu geometry.

// Perceived value with independently mis-weighted cost axes (1 = unbiased; <1 = neglect).
const perceived = (f, b) => Math.pow(f.earnings, b.gamma) / Math.max(
  0.1,
  b.aPick * f.effective_pick_time_seconds
  + b.aCross * f.cross_city_travel_time_seconds
  + b.aLocal * f.local_travel_time_seconds
  - f.shared_item_savings_seconds,
);

// Build diagnosis choiceSets from the trap menus for a given chooser.
function trapChoiceSets(bias, { round_filter = () => true } = {}) {
  const set = buildChiScenarioSet();
  const traps = set.scenarios.filter((s) => s.is_payout_trap === 1 && round_filter(s));
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

const BIASES = {
  trueW3: { gamma: 2.0, aPick: 1, aCross: 1, aLocal: 1 },     // genuine payout-overweighting
  localNeglect: { gamma: 1.0, aPick: 1, aCross: 1, aLocal: 0.05 }, // under-weights LOCAL only
  crossNeglect: { gamma: 1.0, aPick: 1, aCross: 0.05, aLocal: 1 }, // under-weights CROSS only
  pickNeglect: { gamma: 1.0, aPick: 0.05, aCross: 1, aLocal: 1 },  // under-weights PICK only (= W1)
};

// P1 (menu design) owns SIGNAL SEPARATION: a genuine payout-overweighter produces a
// LARGE, dominant earnings bias, while a single-axis cost-neglecter produces only a
// near-noise earnings bias (or is dominated by its own axis). P2 (the abstention gate +
// per-axis confidence) then turns "near-noise W3" into "do not coach W3" — the strict
// actionable-label assertions live in chi-abstention.test.mjs.

test("heterogeneous traps: a TRUE payout-overweighter has a LARGE, dominant W3 signal", () => {
  const { strengths } = behavioralBias(trapChoiceSets(BIASES.trueW3));
  assert.equal(diagnose({ choiceSets: trapChoiceSets(BIASES.trueW3) }).dominant_weakness, "W3");
  assert.ok(strengths.W3 > 0.5, `trueW3 W3 should be strong, got ${strengths.W3.toFixed(2)}`);
  assert.ok(strengths.W3 >= strengths.W1 && strengths.W3 >= strengths.W2, "W3 is the largest axis");
});

test("a LOCAL-only neglecter produces only a NEAR-NOISE W3 (no large false payout signal)", () => {
  const local = behavioralBias(trapChoiceSets(BIASES.localNeglect)).strengths;
  const trueW3 = behavioralBias(trapChoiceSets(BIASES.trueW3)).strengths;
  // The whole point of heterogeneity: local-neglect can no longer masquerade as a strong W3.
  assert.ok(local.W3 < 0.3, `local-neglect false W3 should be near noise, got ${local.W3.toFixed(2)}`);
  assert.ok(trueW3.W3 > 2 * Math.max(0.01, local.W3), "true W3 is multiples larger than local-neglect's false W3");
});

test("a CROSS-only neglecter is dominated by its OWN axis (W2), not by W3", () => {
  const { strengths } = behavioralBias(trapChoiceSets(BIASES.crossNeglect));
  assert.equal(diagnose({ choiceSets: trapChoiceSets(BIASES.crossNeglect) }).dominant_weakness, "W2");
  assert.ok(strengths.W2 > strengths.W3, `cross-neglect should load W2 over W3, got W2=${strengths.W2.toFixed(2)} W3=${strengths.W3.toFixed(2)}`);
});

test("a PICK-only neglecter reads as W1 (its own coachable axis), not W3", () => {
  const d = diagnose({ choiceSets: trapChoiceSets(BIASES.pickNeglect) });
  assert.equal(d.dominant_weakness, "W1", `pick-neglect should read W1, got ${d.dominant_weakness}`);
});

test("trap menus span >=2 slow axes (the menu-span condition the recovery relies on)", () => {
  const set = buildChiScenarioSet();
  const axes = new Set(set.scenarios.filter((s) => s.is_payout_trap === 1).map((s) => s.trap_axis));
  assert.ok(axes.size >= 3, `expected local+cross+pick trap axes, got ${[...axes].join(",")}`);
});
