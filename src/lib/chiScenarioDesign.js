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

export function scoreBundle(bundleIds, byId, startCity, travelScale = 1) {
  let simCity = startCity;
  let earnings = 0;
  let rawTime = 0;
  const storeCounts = {};
  let pickTotal = 0;
  for (const id of bundleIds) {
    const o = byId[id];
    earnings += o.earnings;
    rawTime += o.estimatedTime + crossCity(simCity, o.city, travelScale);
    if (o.city) simCity = o.city;
    storeCounts[o.store] = (storeCounts[o.store] || 0) + 1;
    pickTotal += o.pick;
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
      const groupPick = g.reduce((s, o) => s + o.pick, 0);
      savings += groupPick * SHARED_STORE_PICK_SAVE_RATE;
    }
  }
  const time = Math.max(0.1, rawTime - savings);
  return {
    bundle_ids: bundleIds,
    earnings,
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

    if (cell.overlap === 1) {
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
      oracle_bundle_ids: best.bundle_ids,
      second_best_bundle_ids: second.bundle_ids,
      score_gap: Math.round((best.score - second.score) * 1e4) / 1e4,
      relative_gap: Math.round(gap * 1e4) / 1e4,
      classification: gap < 0.08 ? "hard" : gap < 0.2 ? "medium" : "easy",
      travel_scale: travelScale,
    };
  }
  return null; // could not satisfy the cell (caller resamples / errors)
}

/**
 * Build the full CHI scenario set (default 30 rounds: A 1-10, B 11-20, C 21-30).
 * A and B each span the 2x2 of overlap x dispersion. C is the labeled shift.
 */
export function buildChiScenarioSet({ roundsPerPhase = { A: 10, B: 10, C: 10 }, seed = 42 } = {}) {
  const rng = createSeededRandom(seed);
  const scenarios = [];
  let round = 0;

  const abCells = [
    { overlap: 0, dispersion: 0, stress: "base" },
    { overlap: 1, dispersion: 0, stress: "pick" },   // stress W1
    { overlap: 0, dispersion: 1, stress: "route" },  // stress W2
    { overlap: 1, dispersion: 1, stress: "pick" },   // stress W1+W2
  ];

  const addPhase = (phase, n, shift) => {
    for (let i = 0; i < n; i += 1) {
      round += 1;
      const cell = shift
        ? { overlap: i % 2, dispersion: 1, stress: i % 2 ? "pick" : "route", shift: true }
        : { ...abCells[i % abCells.length], shift: false };
      let menu = null;
      for (let r = 0; r < 50 && !menu; r += 1) {
        menu = buildMenu(`chi${phase}Scenario${round}`, round, phase, cell, rng);
      }
      if (!menu) throw new Error(`failed to build menu for round ${round} (cell ${JSON.stringify(cell)})`);
      scenarios.push(menu);
    }
  };

  addPhase("A", roundsPerPhase.A, false);
  addPhase("B", roundsPerPhase.B, false);
  addPhase("C", roundsPerPhase.C, true);

  return {
    metadata: {
      scenarioSetVersionId: "chi_diagnose_v1",
      datasetName: "chiDiagnose",
      totalRounds: scenarios.length,
      maxBundle: 3,
      protocol_version: "bundlegame_chi_diagnose_30_round_v1",
    },
    starting_city: CHI_STARTING_CITY,
    cities: { startinglocation: CHI_STARTING_CITY, travelTimes: CHI_CITY_TRAVEL },
    scenarios,
  };
}

/**
 * Validate the design requirements (A5): both overlap and dispersion vary in
 * A/B with >= minPerCell per 2x2 cell; Phase C is the labeled shift with novel
 * stores; every menu has a unique computable oracle and a non-trivial score_gap;
 * Phase-C order ids are disjoint from earlier phases (no "repeat last bundle").
 */
export function validateChiScenarioSet(set, { minPerCell = 2 } = {}) {
  const errors = [];
  const scenarios = set?.scenarios || [];
  const byPhase = { A: [], B: [], C: [] };
  for (const s of scenarios) (byPhase[s.phase] || (byPhase[s.phase] = [])).push(s);

  // 2x2 coverage in A and B.
  for (const phase of ["A", "B"]) {
    const cells = {};
    for (const s of byPhase[phase]) {
      const key = `${s.store_overlap_flag}${s.dispersion_flag}`;
      cells[key] = (cells[key] || 0) + 1;
    }
    for (const key of ["00", "01", "10", "11"]) {
      if ((cells[key] || 0) < minPerCell) {
        errors.push(`Phase ${phase} cell overlap/dispersion=${key} has ${cells[key] || 0} < ${minPerCell} menus`);
      }
    }
    const overlapVals = new Set(byPhase[phase].map((s) => s.store_overlap_flag));
    const dispVals = new Set(byPhase[phase].map((s) => s.dispersion_flag));
    if (overlapVals.size < 2) errors.push(`Phase ${phase} store_overlap_flag does not vary`);
    if (dispVals.size < 2) errors.push(`Phase ${phase} dispersion_flag does not vary`);
  }

  // Phase C is a labeled shift drawn from the novel-store distribution.
  const cStoreNames = new Set(CHI_C_STORES.map((s) => s.store));
  const abStoreNames = new Set(CHI_AB_STORES.map((s) => s.store));
  for (const s of byPhase.C) {
    if (s.shift_flag !== 1) errors.push(`Phase C round ${s.round} missing shift_flag`);
    for (const o of s.orders) {
      if (!cStoreNames.has(o.store)) errors.push(`Phase C round ${s.round} uses non-shift store ${o.store}`);
    }
  }

  // No Phase-C order id appears in A/B (defeats "repeat last AI bundle").
  const earlierIds = new Set();
  for (const s of [...byPhase.A, ...byPhase.B]) for (const id of s.order_ids) earlierIds.add(id);
  for (const s of byPhase.C) for (const id of s.order_ids) {
    if (earlierIds.has(id)) errors.push(`Phase C order ${id} reused from earlier phase`);
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

  // Phase C should genuinely stress the neglected axes harder than A/B.
  const meanCross = (rows) => {
    let tot = 0, n = 0;
    for (const s of rows) for (const o of s.orders) {
      // proxy: cross-city from starting city to the order city (scaled in C)
      tot += (CHI_CITY_TRAVEL[CHI_STARTING_CITY]?.[o.city] || 0) * (s.travel_scale || 1);
      n += 1;
    }
    return n ? tot / n : 0;
  };
  if (meanCross(byPhase.C) <= meanCross([...byPhase.A, ...byPhase.B])) {
    errors.push("Phase C does not increase average cross-city travel vs A/B");
  }

  return { ok: errors.length === 0, errors, n_scenarios: scenarios.length };
}
