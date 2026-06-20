/**
 * CHI main-study scenario design (menu redesign).
 *
 * Fixes the pilot's design flaws:
 *  - The pilot had **one store per city**, which couples store-overlap with
 *    spatial-dispersion. Here each A/B city has **multiple stores**, so a menu
 *    can vary overlap (a store hosting >=2 orders -> large bundles become legal)
 *    INDEPENDENTLY of dispersion (orders spanning >=2 cities). This lets W1
 *    (over-bundling / pick neglect) and W2 (cross-city neglect) be separately
 *    identified.
 *  - Phases A and B **span the 2x2** of overlap x dispersion with >= a minimum
 *    count per cell.
 *  - Menus are calibrated to have a **unique computable oracle** and a
 *    **non-trivial score_gap** (so suboptimal choices are possible/measurable).
 *  - **Phase C is a labeled distribution shift**: longer cross-city routes,
 *    heavier pick loads, and **novel store/city combinations**, tagged
 *    `shift_flag=true`. Because Phase-C order ids are disjoint from Phase B,
 *    "repeat the last AI bundle" is impossible — only genuine re-weighting
 *    transfers.
 *
 * Self-contained (no imports) so it is unit-testable under `node --test`. The
 * modeled-time/score here mirrors the analytics reward model:
 *   bundle_time = sum(estimatedTime + crossCityTravel) - sharedStoreSavings
 *   score       = earnings / bundle_time
 */

export const CHI_STARTING_CITY = "Berkeley";

// A/B layout: multiple stores per city decouples overlap from dispersion.
export const CHI_AB_STORES = [
  { store: "Berkeley Bowl", city: "Berkeley" },
  { store: "Berkeley Market", city: "Berkeley" },
  { store: "Sprouts", city: "Oakland" },
  { store: "Oakland Grocer", city: "Oakland" },
];

// Phase-C introduces novel store/city combinations (distribution shift).
export const CHI_C_STORES = [
  { store: "Target", city: "Emeryville" },
  { store: "Costco", city: "Richmond" },
  { store: "Safeway", city: "Piedmont" },
  { store: "Whole Foods", city: "Albany" },
];

// Cross-city travel time (seconds). Phase C scales this up (longer routes).
export const CHI_CITY_TRAVEL = {
  Berkeley: { Berkeley: 0, Oakland: 10, Emeryville: 7, Richmond: 12, Piedmont: 11, Albany: 6 },
  Oakland: { Berkeley: 10, Oakland: 0, Emeryville: 6, Richmond: 16, Piedmont: 5, Albany: 13 },
  Emeryville: { Berkeley: 7, Oakland: 6, Emeryville: 0, Richmond: 14, Piedmont: 9, Albany: 8 },
  Richmond: { Berkeley: 12, Oakland: 16, Emeryville: 14, Richmond: 0, Piedmont: 18, Albany: 9 },
  Piedmont: { Berkeley: 11, Oakland: 5, Emeryville: 9, Richmond: 18, Piedmont: 0, Albany: 16 },
  Albany: { Berkeley: 6, Oakland: 13, Emeryville: 8, Richmond: 9, Piedmont: 16, Albany: 0 },
};

const SHARED_STORE_PICK_SAVE_RATE = 0.25; // mirrors LOCAL_TRAVEL_BUNDLE_SAVE_RATE
const NONTRIVIAL_SCORE_GAP = 0.03;        // best must beat second by this ratio
const PHASE_C_TRAVEL_SCALE = 1.6;         // longer cross-city routes in the shift
const PHASE_C_PICK_SCALE = 1.5;           // heavier pick loads in the shift

// Payout-trap calibration. On a picking-stress (overlap) menu the max-earnings
// bundle is ALSO the over-bundle, so over-bundling (W1) and payout-chasing (W3)
// predict the SAME choice and the conditional logit cannot separate the earnings
// weight from the pick-time weight (they are collinear). A payout trap DECOUPLES
// them: a high-earnings LOW-pick singleton (H) whose pay exceeds any same-store
// bundle, a fast lower-paying singleton (b1 = the score-optimal), and a slow
// low-pay "bundling bait" (b2) sharing b1's store (so a same-store over-bundle is
// legal but sub-optimal). The max-earnings legal bundle (H) is NOT optimal, the
// optimal is the faster lower-paying b1, and a same-store over-bundle {b1,b2} is
// tempting only to a pick-neglecter. So W3 chases H while W1 over-bundles {b1,b2}
// — different choices, so the two biases become separately identifiable.
// H is deliberately LOW-pick (comparable to b1) but slow via LOCAL travel, so it is
// sub-optimal WITHOUT loading the pick-time feature: choosing H over the optimal b1
// is then a pure earnings (W3) decision, not a pick-neglect (W1) one — which keeps
// the two biases cleanly separable. b2 carries the high pick (the W1 bundling bait).
const TRAP_ROLE_RANGES = {
  fast: { pick: [5, 7], local: [2, 3], earn: [18, 24] },    // b1 = the score-optimal singleton (fast)
  bait: { pick: [15, 19], local: [2, 4], earn: [8, 12] },   // b2 = high-PICK, low-pay over-bundle bait
  pay: { pick: [5, 8], local: [12, 16], earn: [38, 44] },   // H  = max-earnings, low pick, slow via LOCAL travel
};

export function createSeededRandom(seed = 1) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function crossCity(from, to, scale = 1) {
  const v = CHI_CITY_TRAVEL[from]?.[to];
  return (typeof v === "number" ? v : 0) * scale;
}

function ordersById(orders) {
  const map = {};
  for (const o of orders) map[o.id] = o;
  return map;
}

/** Order-id-set equality (order-insensitive). */
export function sortedIdsEqual(a, b) {
  const x = (Array.isArray(a) ? a : []).map((v) => String(v ?? "").trim()).sort();
  const y = (Array.isArray(b) ? b : []).map((v) => String(v ?? "").trim()).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/** Single-store legal bundles of size 1..maxBundle (the legal action mask). */
export function enumerateLegalBundles(orderIds, byId, maxBundle = 3) {
  const out = [];
  const ids = orderIds.slice();
  const cap = Math.min(ids.length, Math.max(1, maxBundle));
  const combos = (arr, k) => {
    const res = [];
    const rec = (start, acc) => {
      if (acc.length === k) { res.push(acc.slice()); return; }
      for (let i = start; i < arr.length; i += 1) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
    };
    rec(0, []);
    return res;
  };
  for (let k = 1; k <= cap; k += 1) {
    for (const c of combos(ids, k)) {
      const stores = new Set(c.map((id) => byId[id].store));
      if (stores.size === 1) out.push(c); // single-store legality
    }
  }
  return out;
}

// Item-pick seconds for one order. Deployed order data stores `estimatedTime`
// (= item pick + local travel) and `localTravelTime` but NOT an explicit `pick`,
// so derive pick = estimatedTime - localTravelTime when `pick` is absent.
export function orderPickSeconds(o = {}) {
  if (o.pick != null) return Number(o.pick) || 0;
  return Math.max(0, (Number(o.estimatedTime) || 0) - (Number(o.localTravelTime) || 0));
}

export function scoreBundle(bundleIds, byId, startCity, travelScale = 1) {
  let simCity = startCity;
  let earnings = 0;
  let rawTime = 0;
  let pickTotal = 0;
  let localTotal = 0;
  let crossTotal = 0;
  for (const id of bundleIds) {
    const o = byId[id];
    const cross = crossCity(simCity, o.city, travelScale);
    earnings += o.earnings;
    rawTime += o.estimatedTime + cross;
    crossTotal += cross;
    localTotal += Number(o.localTravelTime) || 0;
    pickTotal += orderPickSeconds(o);
    if (o.city) simCity = o.city;
  }
  // Shared-store savings when >=2 orders share a store (over-bundling temptation).
  let savings = 0;
  const grouped = {};
  for (const id of bundleIds) {
    const o = byId[id];
    grouped[o.store] = grouped[o.store] || [];
    grouped[o.store].push(o);
  }
  for (const store of Object.keys(grouped)) {
    const g = grouped[store];
    if (g.length >= 2) {
      const groupPick = g.reduce((s, o) => s + orderPickSeconds(o), 0);
      savings += groupPick * SHARED_STORE_PICK_SAVE_RATE;
    }
  }
  const time = Math.max(0.1, rawTime - savings);
  return {
    bundle_ids: bundleIds,
    earnings,
    // The five FEATURE_COLUMNS the diagnosis consumes (marginalFeedback reads
    // earnings / total_time_seconds / score; the diagnosis reads all five).
    effective_pick_time_seconds: pickTotal,
    cross_city_travel_time_seconds: crossTotal,
    local_travel_time_seconds: localTotal,
    shared_item_savings_seconds: savings,
    total_time_seconds: time,
    score: earnings / time,
    ending_city: simCity,
  };
}

function bestTwo(scored) {
  const sorted = scored
    .slice()
    .sort((a, b) => b.score - a.score || b.bundle_ids.length - a.bundle_ids.length);
  return { best: sorted[0], second: sorted[1] || null };
}

function storeOverlapFlag(orders) {
  const counts = {};
  for (const o of orders) counts[o.store] = (counts[o.store] || 0) + 1;
  return Object.values(counts).some((c) => c >= 2) ? 1 : 0;
}

function dispersionFlag(orders) {
  return new Set(orders.map((o) => o.city)).size >= 2 ? 1 : 0;
}

/**
 * Construct one menu targeting a design cell.
 * @param {object} cell { overlap: 0|1, dispersion: 0|1, stress: 'base'|'pick'|'route', shift: bool }
 */
function buildMenu(scenarioId, round, phase, cell, rng) {
  const stores = cell.shift ? CHI_C_STORES : CHI_AB_STORES;
  const travelScale = cell.shift ? PHASE_C_TRAVEL_SCALE : 1;
  const pickScale = cell.shift ? PHASE_C_PICK_SCALE : 1;
  const byCity = {};
  for (const s of stores) { byCity[s.city] = byCity[s.city] || []; byCity[s.city].push(s); }
  const cities = Object.keys(byCity);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const orders = [];
    let idx = 0;
    const mkOrder = (storeObj, big) => {
      const basePick = (big ? 16 : 7) * pickScale * (0.8 + 0.5 * rng());
      const local = (3 + 6 * rng());
      const estimatedTime = Math.round((basePick + local) * 10) / 10;
      const earnings = Math.round((10 + 40 * rng()) * (big ? 1.25 : 1));
      idx += 1;
      return {
        id: `${scenarioId}o${idx}`,
        store: storeObj.store,
        city: storeObj.city,
        earnings,
        estimatedTime,
        pick: Math.round(basePick * 10) / 10,
        localTravelTime: Math.round(local * 10) / 10,
      };
    };
    // A calibrated payout-trap order in one of three roles (see TRAP_ROLE_RANGES).
    const mkRole = (storeObj, role) => {
      const r = TRAP_ROLE_RANGES[role];
      const span = (a, b) => a + (b - a) * rng();
      const basePick = span(r.pick[0], r.pick[1]) * pickScale;
      const local = span(r.local[0], r.local[1]);
      const estimatedTime = Math.round((basePick + local) * 10) / 10;
      idx += 1;
      return {
        id: `${scenarioId}o${idx}`,
        store: storeObj.store,
        city: storeObj.city,
        earnings: Math.round(span(r.earn[0], r.earn[1])),
        estimatedTime,
        pick: Math.round(basePick * 10) / 10,
        localTravelTime: Math.round(local * 10) / 10,
      };
    };

    if (cell.stress === "trap") {
      // S1 hosts the fast optimal singleton b1 + the slow low-pay bait b2 (a legal
      // same-store over-bundle); S2 hosts the high-pay singleton H. S2 is a 2nd
      // store in the same city (dispersion 0) when available, else a 2nd city
      // (dispersion 1 — required for the shifted C-layout's one-store-per-city map).
      const homeCity = cities[Math.floor(rng() * cities.length)];
      const s1 = byCity[homeCity][0];
      let s2;
      if (cell.dispersion === 0 && byCity[homeCity][1]) {
        s2 = byCity[homeCity][1];
      } else {
        const otherCity = cities.find((c) => c !== homeCity) ?? homeCity;
        s2 = byCity[otherCity][0];
      }
      orders.push(mkRole(s1, "fast"));  // b1 — the score-optimal (faster, lower-paying)
      orders.push(mkRole(s1, "bait"));  // b2 — slow, low-pay over-bundle bait
      orders.push(mkRole(s2, "pay"));   // H  — max-earnings, sub-optimal (the trap)
    } else if (cell.overlap === 1) {
      // A store hosting >=2 orders (makes large single-store bundles legal).
      const homeCity = cities[Math.floor(rng() * cities.length)];
      const homeStore = byCity[homeCity][0];
      orders.push(mkOrder(homeStore, cell.stress === "pick"));
      orders.push(mkOrder(homeStore, cell.stress === "pick"));
      if (cell.dispersion === 1) {
        const otherCity = cities.find((c) => c !== homeCity);
        orders.push(mkOrder(byCity[otherCity][0], false));
      } else {
        const sameCityOther = byCity[homeCity][1] || byCity[homeCity][0];
        orders.push(mkOrder(sameCityOther, false));
      }
    } else {
      // No store repeated -> overlap 0 (only singletons are legal).
      if (cell.dispersion === 1) {
        // Distinct stores across >=2 cities (works whether a city has 1 or 2
        // stores -> robust for the Phase-C novel layout with 1 store/city).
        const c1 = cities[0];
        const c2 = cities.find((c) => c !== c1);
        const sel = [byCity[c1][0], byCity[c2][0]];
        if (byCity[c2][1]) {
          sel.push(byCity[c2][1]); // A/B: a 2nd distinct store in the other city
        } else {
          const c3 = cities.find((c) => c !== c1 && c !== c2);
          if (c3) sel.push(byCity[c3][0]); // C: a 3rd distinct city
        }
        for (const s of sel) orders.push(mkOrder(s, false));
      } else {
        // Single city, two distinct stores -> overlap 0, dispersion 0.
        const c1 = cities.find((c) => byCity[c].length >= 2) || cities[0];
        orders.push(mkOrder(byCity[c1][0], false));
        orders.push(mkOrder(byCity[c1][1] || byCity[c1][0], false));
      }
    }

    // Distinct store assignment can collapse overlap; verify the realized flags.
    if (storeOverlapFlag(orders) !== cell.overlap) continue;
    if (dispersionFlag(orders) !== cell.dispersion) continue;

    const byId = ordersById(orders);
    const orderIds = orders.map((o) => o.id);
    const legal = enumerateLegalBundles(orderIds, byId, 3);
    if (legal.length < 2) continue;
    const scored = legal.map((b) => scoreBundle(b, byId, CHI_STARTING_CITY, travelScale));
    const { best, second } = bestTwo(scored);
    if (!second) continue;
    const gap = (best.score - second.score) / best.score;
    if (!(gap >= NONTRIVIAL_SCORE_GAP)) continue;            // non-trivial gap
    // unique oracle (no tie at the top)
    if (Math.abs(best.score - second.score) < 1e-9) continue;

    // Highest-paying legal bundle (for the payout-trap invariant + analysis tag).
    const maxEarn = scored.reduce((a, c) => (c.earnings > a.earnings ? c : a), scored[0]);
    if (cell.stress === "trap") {
      // The trap: the max-earnings legal bundle is NOT the oracle, the oracle is the
      // faster lower-paying option, and a sub-optimal same-store over-bundle exists.
      if (sortedIdsEqual(maxEarn.bundle_ids, best.bundle_ids)) continue;
      if (!(best.total_time_seconds < maxEarn.total_time_seconds)) continue;
      if (!(best.earnings < maxEarn.earnings)) continue;
      const overBundle = scored.find((s) => s.bundle_ids.length >= 2 && !sortedIdsEqual(s.bundle_ids, best.bundle_ids));
      if (!overBundle) continue;
    }

    return {
      round,
      scenario_id: scenarioId,
      phase,
      order_ids: orderIds,
      orders,
      max_bundle: 3,
      store_overlap_flag: cell.overlap,
      dispersion_flag: cell.dispersion,
      shift_flag: cell.shift ? 1 : 0,
      stress: cell.stress,
      is_payout_trap: cell.stress === "trap" ? 1 : 0,
      oracle_bundle_ids: best.bundle_ids,
      second_best_bundle_ids: second.bundle_ids,
      max_earnings_bundle_ids: maxEarn.bundle_ids,
      // The full scored legal action set (CHI feedback + diagnosis read this).
      candidate_bundles: scored.map((s) => ({
        ...s,
        legal: 1,
        is_oracle: sortedIdsEqual(s.bundle_ids, best.bundle_ids) ? 1 : 0,
      })),
      score_gap: Math.round((best.score - second.score) * 1e4) / 1e4,
      relative_gap: Math.round(gap * 1e4) / 1e4,
      classification: gap < 0.08 ? "hard" : gap < 0.2 ? "medium" : "easy",
      travel_scale: travelScale,
    };
  }
  return null; // could not satisfy the cell (caller resamples / errors)
}

// Phase B block layout: ON / OFF(retention, same-dist) / ON / OFF(transfer, shifted).
export const CHI_PHASE_B_BLOCK_LAYOUT = [
  { id: "B1", kind: "on", test_set: null, shift: false, feedback_enabled: true },
  { id: "B2", kind: "off", test_set: "retention_same_dist", shift: false, feedback_enabled: false },
  { id: "B3", kind: "on", test_set: null, shift: false, feedback_enabled: true },
  { id: "B4", kind: "off", test_set: "transfer_shifted", shift: true, feedback_enabled: false },
];

const AB_CELLS = [
  { overlap: 0, dispersion: 0, stress: "base" },
  { overlap: 1, dispersion: 0, stress: "pick" },   // stress W1
  { overlap: 0, dispersion: 1, stress: "route" },  // stress W2
  { overlap: 1, dispersion: 1, stress: "pick" },   // stress W1+W2
];
// The Phase A diagnostic battery interleaves picking-stress menus (identify W1 /
// over-bundling) with PAYOUT-TRAP menus (identify W3 / payout-overweighting,
// where the max-earnings bundle is NOT optimal) — both are overlap=1 — plus the
// base/route cells that span the 2x2 and exercise W2. ~half the overlap menus are
// picking-stress and ~half are payout-trap, so the conditional logit can separate
// the earnings weight from the pick-time weight (they are confounded on overlap-
// only menus). Cycled to `diagnosticRounds`; the runtime randomizes the order.
const DIAGNOSTIC_CELLS = [
  { overlap: 0, dispersion: 0, stress: "base" },
  { overlap: 1, dispersion: 0, stress: "pick" },   // W1 (over-bundling)
  { overlap: 1, dispersion: 0, stress: "trap" },   // W3 (payout trap)
  { overlap: 0, dispersion: 1, stress: "route" },  // W2 (cross-city)
  { overlap: 1, dispersion: 1, stress: "pick" },   // W1+W2
  { overlap: 1, dispersion: 1, stress: "trap" },   // W3 across cities
];
// The held-out OFF test blocks stay overlap=1 (a same-store over-bundle is always
// legal). Retention (same-dist, the re-tune that drives dynamic re-targeting) is
// ALL payout-trap: on a picking-stress menu a residual payout-overweighting (W3)
// re-manifests as over-bundling (W1/W3 collinear), which would re-pollute the
// post-coaching read with false W1 — so the re-tune block must be pure traps to
// expose the residual payout leak cleanly. Transfer keeps the labeled picking-shift
// primary outcome (pick-heavy, novel stores, heavier pick) plus traps to probe
// payout transfer. Trap menus need a 2nd same-city store (dispersion 0); the
// shifted C-layout has one store per city so its traps are cross-city (dispersion 1).
const OFF_STRESS = {
  retention_same_dist: ["trap", "trap", "trap", "trap", "trap"],
  transfer_shifted: ["pick", "trap", "pick", "trap", "pick"],
};
const offCell = (i, blk, overrides = {}) => {
  const pattern = overrides[blk.test_set] || OFF_STRESS[blk.test_set] || ["pick", "trap", "pick", "trap", "pick"];
  const stress = pattern[i % pattern.length];
  // Same-dist retention traps stay same-city (dispersion 0) so the re-tune payout
  // read is clean (no cross-city confound); the shifted C-layout forces cross-city
  // traps (one store per city). Picking menus alternate dispersion for variety.
  const dispersion = stress === "trap" ? (blk.shift ? 1 : 0) : i % 2;
  return { overlap: 1, dispersion, stress, shift: blk.shift };
};

/**
 * Build the dynamic counterfactual-feedback scenario set (default 35 rounds):
 *   rounds 1..15           Phase A unaided diagnostic battery (factor-balanced 2x2)
 *   Phase B, 4 blocks of `blockSize` (default 5): ON / OFF(retention) / ON / OFF(transfer)
 * The diagnostic battery + the ON blocks are the training pool; the two OFF blocks
 * are the COMMON held-out test sets (same-distribution retention, then a shifted
 * transfer with novel stores), with order ids disjoint from training. The menu
 * order is fixed here; the runtime randomizes order within Phase A per participant.
 */
export function buildChiScenarioSet({ diagnosticRounds = 15, blockSize = 5, seed = 42, offStress = {} } = {}) {
  const rng = createSeededRandom(seed);
  const scenarios = [];
  let round = 0;

  const emit = (phase, cell, meta) => {
    round += 1;
    let menu = null;
    for (let r = 0; r < 50 && !menu; r += 1) {
      menu = buildMenu(`chi${phase}Scenario${round}`, round, phase, cell, rng);
    }
    if (!menu) throw new Error(`failed to build menu for round ${round} (cell ${JSON.stringify(cell)})`);
    scenarios.push({ ...menu, ...meta });
  };

  // Phase A: the fixed diagnostic battery (15 menus by default) interleaving
  // picking-stress + payout-trap + base/route cells across the 2x2.
  for (let i = 0; i < diagnosticRounds; i += 1) {
    emit("A", { ...DIAGNOSTIC_CELLS[i % DIAGNOSTIC_CELLS.length], shift: false },
      { block: null, block_kind: "diagnostic", test_set: null, feedback_enabled: false });
  }

  // Phase B: ON/OFF/ON/OFF. ON menus cycle the 2x2 continuously (cross-block) for
  // balance; OFF menus interleave picking-stress + payout-trap held-out probes.
  let onIdx = 0;
  for (const blk of CHI_PHASE_B_BLOCK_LAYOUT) {
    for (let i = 0; i < blockSize; i += 1) {
      const cell = blk.kind === "on"
        ? { ...AB_CELLS[onIdx++ % AB_CELLS.length], shift: false } // ON = training, spans 2x2
        : offCell(i, blk, offStress); // OFF = held-out picking + payout-trap probe (retention / transfer)
      emit("B", cell, {
        block: blk.id,
        block_kind: blk.kind,
        test_set: blk.test_set,
        feedback_enabled: blk.feedback_enabled,
      });
    }
  }

  return {
    metadata: {
      scenarioSetVersionId: "chi_dynamic_v1",
      datasetName: "chiDynamicCounterfactual",
      totalRounds: scenarios.length,
      maxBundle: 3,
      protocol_version: "bundlegame_chi_dynamic_counterfactual_35_round_v1",
      block_layout: CHI_PHASE_B_BLOCK_LAYOUT.map((b) => ({ id: b.id, kind: b.kind, test_set: b.test_set })),
    },
    starting_city: CHI_STARTING_CITY,
    cities: { startinglocation: CHI_STARTING_CITY, travelTimes: CHI_CITY_TRAVEL },
    scenarios,
  };
}

/**
 * Validate the dynamic-feedback design: the 2x2 of overlap x dispersion is spanned
 * in the Phase A diagnostic battery AND in the ON training pool (>= minPerCell per
 * cell); the two OFF blocks are the common held-out sets (B2 retention same-dist,
 * B4 transfer shifted with novel stores); held-out order ids are disjoint from the
 * training pool; every menu has a unique computable oracle and a non-trivial gap;
 * the transfer block raises average cross-city travel above training.
 */
export function validateChiScenarioSet(set, { minPerCell = 2, minTrap = 3 } = {}) {
  const errors = [];
  const scenarios = set?.scenarios || [];
  const diagnostic = scenarios.filter((s) => s.phase === "A");
  const phaseB = scenarios.filter((s) => s.phase === "B");
  const onMenus = phaseB.filter((s) => s.block_kind === "on");
  const retention = phaseB.filter((s) => s.test_set === "retention_same_dist");
  const transfer = phaseB.filter((s) => s.test_set === "transfer_shifted");

  // 2x2 coverage in the diagnostic battery and the ON training pool.
  const checkCells = (rows, label) => {
    const cells = {};
    for (const s of rows) {
      const key = `${s.store_overlap_flag}${s.dispersion_flag}`;
      cells[key] = (cells[key] || 0) + 1;
    }
    for (const key of ["00", "01", "10", "11"]) {
      if ((cells[key] || 0) < minPerCell) {
        errors.push(`${label} cell overlap/dispersion=${key} has ${cells[key] || 0} < ${minPerCell} menus`);
      }
    }
    if (new Set(rows.map((s) => s.store_overlap_flag)).size < 2) errors.push(`${label} store_overlap_flag does not vary`);
    if (new Set(rows.map((s) => s.dispersion_flag)).size < 2) errors.push(`${label} dispersion_flag does not vary`);
  };
  checkCells(diagnostic, "diagnostic (A)");
  checkCells(onMenus, "ON training pool");

  // The two OFF blocks: retention (same-dist), transfer (labeled shift, novel stores).
  if (retention.length === 0) errors.push("missing retention (same-distribution) OFF block");
  if (transfer.length === 0) errors.push("missing transfer (shifted) OFF block");
  if (retention.some((s) => s.shift_flag !== 0)) errors.push("retention block must be same-distribution (shift_flag 0)");
  if (transfer.some((s) => s.shift_flag !== 1)) errors.push("transfer block must be the labeled shift (shift_flag 1)");
  const cStoreNames = new Set(CHI_C_STORES.map((s) => s.store));
  for (const s of transfer) for (const o of s.orders) {
    if (!cStoreNames.has(o.store)) errors.push(`transfer round ${s.round} uses non-shift store ${o.store}`);
  }

  // Held-out OFF order ids disjoint from the training pool (diagnostic + ON).
  const trainingIds = new Set();
  for (const s of [...diagnostic, ...onMenus]) for (const id of s.order_ids) trainingIds.add(id);
  for (const s of [...retention, ...transfer]) for (const id of s.order_ids) {
    if (trainingIds.has(id)) errors.push(`held-out order ${id} reused from the training pool`);
  }

  // Unique oracle + non-trivial gap for every menu.
  for (const s of scenarios) {
    if (!Array.isArray(s.oracle_bundle_ids) || s.oracle_bundle_ids.length === 0) {
      errors.push(`round ${s.round} has no oracle`);
    }
    if (!(s.relative_gap >= NONTRIVIAL_SCORE_GAP)) {
      errors.push(`round ${s.round} relative_gap ${s.relative_gap} below ${NONTRIVIAL_SCORE_GAP}`);
    }
  }

  // Every scenario carries the legal candidate action set the CHI feedback + diagnosis
  // read: >= 2 candidates, each with the five FEATURE_COLUMNS + a score, and exactly
  // one is_oracle that equals oracle_bundle_ids and has the maximum score.
  const FEATURE_COLS = [
    "earnings", "effective_pick_time_seconds", "cross_city_travel_time_seconds",
    "local_travel_time_seconds", "shared_item_savings_seconds",
  ];
  for (const s of scenarios) {
    const cb = s.candidate_bundles;
    if (!Array.isArray(cb) || cb.length < 2) {
      errors.push(`round ${s.round} has < 2 candidate_bundles`);
      continue;
    }
    for (const c of cb) {
      if (!Array.isArray(c.bundle_ids) || c.bundle_ids.length === 0) errors.push(`round ${s.round} candidate missing bundle_ids`);
      for (const col of FEATURE_COLS) {
        if (!Number.isFinite(Number(c[col]))) errors.push(`round ${s.round} candidate missing feature ${col}`);
      }
      if (!Number.isFinite(Number(c.score))) errors.push(`round ${s.round} candidate missing score`);
    }
    const oracles = cb.filter((c) => c.is_oracle === 1);
    if (oracles.length !== 1) {
      errors.push(`round ${s.round} must have exactly one is_oracle candidate (got ${oracles.length})`);
    } else {
      if (!sortedIdsEqual(oracles[0].bundle_ids, s.oracle_bundle_ids)) {
        errors.push(`round ${s.round} is_oracle candidate != oracle_bundle_ids`);
      }
      const maxScore = Math.max(...cb.map((c) => Number(c.score) || 0));
      if (Number(oracles[0].score) < maxScore - 1e-9) {
        errors.push(`round ${s.round} is_oracle candidate is not the max-score bundle`);
      }
    }
  }

  // Both held-out blocks must exercise the COACHED weakness (picking): every menu
  // has a legal same-store multi-order bundle (store_overlap_flag = 1), so
  // over-bundling is tempting and a pick-neglect correction is measurable.
  for (const [rows, label] of [[retention, "retention"], [transfer, "transfer"]]) {
    if (!rows.every((s) => s.store_overlap_flag === 1)) {
      errors.push(`${label} block must over-sample the picking cell (store_overlap_flag=1 in every menu)`);
    }
  }
  // The transfer block is a labeled PICKING shift: heavier pick load than training.
  const meanPick = (rows) => {
    let tot = 0, n = 0;
    for (const s of rows) for (const o of s.orders) { tot += Number(o.pick) || 0; n += 1; }
    return n ? tot / n : 0;
  };
  if (meanPick(transfer) <= meanPick([...diagnostic, ...onMenus])) {
    errors.push("transfer block does not increase the average pick load vs training (the labeled picking shift)");
  }

  // Payout-trap coverage: the diagnostic battery must keep BOTH a picking signal
  // (W1) and a payout-trap signal (W3), and BOTH OFF blocks must include a trap so
  // re-diagnosis can detect a residual payout leak after the first ON block. Without
  // traps the earnings/pick weights are collinear and W1/W3 are not separable.
  const diagTraps = diagnostic.filter((s) => s.is_payout_trap === 1);
  const diagPick = diagnostic.filter((s) => s.stress === "pick");
  if (diagTraps.length < minTrap) errors.push(`diagnostic battery has ${diagTraps.length} < ${minTrap} payout-trap menus (W3 not separately identifiable)`);
  if (diagPick.length < minTrap) errors.push(`diagnostic battery has ${diagPick.length} < ${minTrap} picking-stress menus (lost the W1 signal)`);
  for (const [rows, label] of [[retention, "retention"], [transfer, "transfer"]]) {
    if (!rows.some((s) => s.is_payout_trap === 1)) errors.push(`${label} OFF block has no payout-trap menu (cannot re-diagnose a residual payout leak)`);
  }

  // Every payout-trap menu actually decouples earnings from optimality: the
  // max-earnings legal bundle is NOT the oracle, the oracle is faster + lower-paying,
  // and a sub-optimal same-store over-bundle is present (the over-bundling bait).
  for (const s of scenarios.filter((x) => x.is_payout_trap === 1)) {
    const cb = s.candidate_bundles || [];
    const maxEarn = cb.reduce((a, c) => (a && Number(a.earnings) >= Number(c.earnings) ? a : c), null);
    const opt = cb.find((c) => c.is_oracle === 1);
    if (!maxEarn || !opt) { errors.push(`payout-trap round ${s.round} missing candidate_bundles`); continue; }
    if (sortedIdsEqual(maxEarn.bundle_ids, opt.bundle_ids)) errors.push(`payout-trap round ${s.round}: the max-earnings bundle IS the optimal (not a trap)`);
    if (!(Number(opt.total_time_seconds) < Number(maxEarn.total_time_seconds))) errors.push(`payout-trap round ${s.round}: the optimal is not faster than the max-earnings bundle`);
    if (!(Number(opt.earnings) < Number(maxEarn.earnings))) errors.push(`payout-trap round ${s.round}: the optimal is not lower-paying than the max-earnings bundle`);
    if (!cb.some((c) => Array.isArray(c.bundle_ids) && c.bundle_ids.length >= 2 && c.is_oracle !== 1)) errors.push(`payout-trap round ${s.round}: no sub-optimal over-bundle present`);
  }

  return { ok: errors.length === 0, errors, n_scenarios: scenarios.length };
}
