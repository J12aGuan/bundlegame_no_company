/**
 * CHI dataset seeding bridge (PURE — no Firebase imports, so it is unit-testable and
 * safe to share between the live Firestore writer and the seed script).
 *
 * Why this exists: the live app loads menus from Firestore, but the trap-aware
 * generator `buildChiScenarioSet` is only used in tests/sandboxes. To run the CHI
 * dynamic study in the app, its scenarios + orders must be seeded to Firestore under
 * a NAMED dataset version. The standard scenario writer (firebaseDB.saveExperimentScenarios)
 * historically reduced each scenario to {round,phase,scenario_id,max_bundle,order_ids},
 * which DROPS the CHI scenario-level fields (block_kind / test_set / overlap+dispersion
 * flags / oracle / candidate_bundles / the embedded orders the runtime derives candidates
 * from). This module is the single source of truth for the persistence shape: the writer
 * imports `sanitizeScenarioForPersistence` so saved scenarios keep what the CHI runtime
 * and `validateChiScenarioSet` need, and the seed script imports `buildChiSeedPayload`.
 */
import { buildChiScenarioSet } from "./chiScenarioDesign.js";

// Optional CHI scenario-level fields preserved through persistence. Legacy 'experiment'
// scenarios do not have these, so preserving them is a no-op for that dataset. The
// runtime derives the ON/OFF schedule from the protocol and the candidate action set
// from `orders` (getCandidatesForScenario), but analysis + validateChiScenarioSet read
// these directly, so they must survive a save -> load round-trip.
export const CHI_SCENARIO_FIELDS = [
  "block", "block_kind", "test_set", "feedback_enabled", "stress",
  "store_overlap_flag", "dispersion_flag", "shift_flag", "is_payout_trap", "trap_axis",
  "oracle_bundle_ids", "second_best_bundle_ids", "max_earnings_bundle_ids",
  "travel_scale", "relative_gap", "score_gap", "classification",
  "candidate_bundles", "orders",
];

const toOrderId = (order) => (typeof order === "string" ? order.trim() : String(order?.id ?? "").trim());

/**
 * The canonical persisted shape for ONE scenario. Always emits the legacy-minimal
 * fields; ADDITIVELY preserves any CHI field that is present (so 'experiment' is
 * unchanged and CHI datasets keep their full structure).
 */
export function sanitizeScenarioForPersistence(scenario = {}) {
  const out = {
    round: Number(scenario.round) || 1,
    phase: scenario.phase ?? "",
    scenario_id: scenario.scenario_id ?? "",
    max_bundle: Number(scenario.max_bundle) || 3,
    order_ids: (Array.isArray(scenario.order_ids) ? scenario.order_ids : (scenario.orders || []))
      .map(toOrderId)
      .filter((id) => id.length > 0),
  };
  for (const k of CHI_SCENARIO_FIELDS) {
    if (scenario[k] !== undefined) out[k] = scenario[k];
  }
  return out;
}

// The orders dataset shape mirrors firebaseDB.sanitizeOrders (id/city/store/earnings/
// items/estimatedTime/localTravelTime). `pick` is intentionally omitted: the runtime
// derives pick = estimatedTime - localTravelTime when absent (orderPickSeconds), which
// the existing GAP3 test covers. `items` defaults to {} so the order card renders.
export function orderForPersistence(order = {}) {
  return {
    id: order.id ?? "",
    city: order.city ?? "",
    store: order.store ?? "",
    earnings: Number(order.earnings) || 0,
    items: order.items || {},
    estimatedTime: Number(order.estimatedTime) || 0,
    localTravelTime: Number(order.localTravelTime) || 0,
  };
}

/**
 * Build the seed payload for the CHI dynamic dataset: the orders pool (deduped) + the
 * scenario records in their persisted shape + the metadata. `versionId` defaults to the
 * generator's metadata.scenarioSetVersionId ('chi_dynamic_v1').
 */
export function buildChiSeedPayload(options = {}) {
  const set = buildChiScenarioSet(options);
  const versionId = String(set?.metadata?.scenarioSetVersionId || "chi_dynamic_v1").trim();
  const scenarios = set.scenarios.map(sanitizeScenarioForPersistence);
  const ordersById = new Map();
  for (const s of set.scenarios) {
    for (const o of (s.orders || [])) {
      const id = toOrderId(o);
      if (id && !ordersById.has(id)) ordersById.set(id, orderForPersistence(o));
    }
  }
  return {
    versionId,
    scenarios,
    orders: [...ordersById.values()],
    // Mark the dataset so the writer's research-protocol validation is skipped: the
    // protocol + central-config linkage (and flipping the default scenario_set) is a
    // separate, deliberate deploy step, not part of seeding the menus.
    metadata: { ...(set.metadata || {}), skip_protocol_validation: true },
  };
}

/**
 * Rehydrate scenarios from a stored dataset entry exactly as getExperimentScenarios
 * does (it returns entry.scenarios verbatim — no transform on read). Provided so the
 * round-trip test reads back through the same access path the app uses.
 */
export function rehydrateScenariosFromEntry(entry = {}) {
  return Array.isArray(entry?.scenarios) ? entry.scenarios : [];
}

/** Build the full stored entry the grouped dataset doc holds (for round-trip tests). */
export function buildSeededEntry(payload) {
  return {
    type: "scenario_dataset",
    version: 1,
    scenarios: payload.scenarios,
    orders: payload.orders,
    optimal: [],
    metadata: payload.metadata,
  };
}
