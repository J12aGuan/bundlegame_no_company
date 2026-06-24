// Emit the FROZEN simulation input: the canonical CHI picking-primary scenario set at seed 42.
// The simulation loads THIS file (not the deployed Firestore set). Deterministic by construction
// (createSeededRandom(42) + the pure scoreBundle), so re-running is byte-identical.
//   node scripts/emit-frozen-scenario-set.mjs
import { writeFileSync } from "fs";
import { buildChiScenarioSet } from "../src/lib/chiScenarioDesign.js";

const OUT = "publishing/experiments/2_june30_enriched_4order/frozen/chi_scenario_set_seed42.json";
const set = buildChiScenarioSet({ seed: 42 });
const scenarios = set.scenarios.slice().sort((a, b) => a.round - b.round).map((s) => ({
  round: s.round, phase: s.phase, block: s.block ?? null, test_set: s.test_set ?? null,
  oracle_category: s.oracle_category, oracle_size: (s.oracle_bundle_ids || []).length,
  over_bundling_coachable: s.over_bundling_coachable, under_bundling_coachable: s.under_bundling_coachable,
  is_payout_trap: s.is_payout_trap, trap_axis: s.trap_axis ?? null,
  relative_gap: s.relative_gap, oracle_bundle_ids: s.oracle_bundle_ids,
  orders: s.orders.map((o) => ({
    id: o.id, store: o.store, city: o.city, items: o.items, earnings: o.earnings,
    pick: o.pick, localTravelTime: o.localTravelTime, estimatedTime: o.estimatedTime,
  })),
  candidate_bundles: s.candidate_bundles.map((c) => ({
    bundle_ids: c.bundle_ids, is_oracle: c.is_oracle, earnings: c.earnings,
    effective_pick_time_seconds: c.effective_pick_time_seconds,
    local_travel_time_seconds: c.local_travel_time_seconds,
    cross_city_travel_time_seconds: c.cross_city_travel_time_seconds,
    shared_item_savings_seconds: c.shared_item_savings_seconds,
    total_time_seconds: c.total_time_seconds, score: c.score,
  })),
}));
const payload = {
  metadata: {
    name: "chi_confirmatory_picking_primary",
    seed: 42,
    generator: "src/lib/chiScenarioDesign.js (buildChiScenarioSet)",
    rounds: scenarios.length,
    scoring: "time = pick + local + cross - 0.25*shared-store-group-pick; score = earnings/time; pick = pilot aisle-walk + 3s/unique item",
    design: "picking-primary: trap battery cross+pick; W1 (over-bundling/pick) coachable; W3 (payout) measured-not-coached (confounded with cross)",
    emitted_from_seed: 42,
  },
  scenarios,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log("wrote", OUT, "(" + scenarios.length + " rounds)");
