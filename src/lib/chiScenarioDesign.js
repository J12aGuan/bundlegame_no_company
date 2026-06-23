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

// Phase-C introduces novel store/city combinations (distribution shift). Albany carries
// TWO stores so a CLEAN single-axis LOCAL payout trap is constructible inside the shift:
// b1/b2 host at one Albany store and the high-pay H at the other, same city, so the
// start->Albany cross leg cancels in the H-vs-oracle delta and H is slow via LOCAL alone.
// With one store per city (the old layout) a "local" trap collapses to a cross trap (H has
// to go to another city), which is the cross+pick confound the transfer block had.
export const CHI_C_STORES = [
  { store: "Target", city: "Emeryville" },
  { store: "Costco", city: "Richmond" },
  { store: "Safeway", city: "Piedmont" },
  { store: "Whole Foods", city: "Albany" },
  { store: "Trader Joe's", city: "Albany" },
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
// A CLEAN single-axis trap: H's slowness vs the oracle is concentrated on ONE cost axis.
// The named axis must carry >= CLEAN_AXIS_SHARE of the H-vs-oracle time delta and each OTHER
// cost axis < CLEAN_OTHER_SHARE of it. A trap flagged `clean` must also clear CLEAN_TRAP_MIN_GAP
// (12% relative) so it has real statistical power, not the 4-6% the shifted cross traps had.
const CLEAN_AXIS_SHARE = 0.7;
const CLEAN_OTHER_SHARE = 0.25;
const CLEAN_TRAP_MIN_GAP = 0.12;
const CLEAN_TRAP_MAX_GAP = 0.30; // keep a clean trap powerful but not trivially easy (which kills the W3 signal)

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
// b1 (optimal) is fast; b2 carries the high pick (the W1 bundling bait).
const TRAP_ROLE_RANGES = {
  fast: { pick: [5, 7], local: [2, 3], earn: [18, 24] },    // b1 = the score-optimal singleton (fast)
  bait: { pick: [15, 19], local: [2, 4], earn: [8, 12] },   // b2 = high-PICK, low-pay over-bundle bait
};
// A modest singleton dropped into a SECOND city to add dispersion to an over-bundle menu
// (o1d1) without ever becoming the oracle or the max-earnings bundle: low-ish pay, mid speed.
const OVERBUNDLE_DISTRACTOR = { pick: [6, 9], local: [3, 5], earn: [13, 18] };
// A NEUTRAL filler singleton used to raise every menu to >= 4 distinct orders. Low pay + a
// moderate pick so its score sits BELOW the design's key alternative (the trap's H, the
// over-bundle's b1, the bundle's best single), so padding never changes the oracle, the trap
// axis/cleanliness, or the over-bundle regret. Placed at an UNUSED store so it cannot bundle.
const DISTRACTOR_ROLE = { pick: [8, 12], local: [3, 5], earn: [9, 14] };
// A BALANCED order where bundling PAYS: good earnings, moderate pick, so a same-store pair/triple
// (the shared-pick saving + the amortized start->store cross leg) is the highest-scoring feasible
// trip and any single order is a strictly worse UNDER-bundling choice. The building block of the
// bundling-correct rounds that fix the single-order-oracle dominance.
const BUNDLE_ROLE = { pick: [6, 9], local: [2, 4], earn: [22, 30] };
const BUNDLE_MIN_SINGLE_REGRET = 0.12; // the best single order must be >= 12% worse than the bundle
// The high-pay singleton H is the trap. CRUCIAL identifiability point: H must be made
// sub-optimal via DIFFERENT cost axes across the trap menus, NOT always the same one.
// If H were always slow-via-local, then earnings and local co-move on H in every menu,
// so a participant who merely under-weights LOCAL (a cost axis the model does not coach)
// always takes H and is MISDIAGNOSED as payout-overweighting (W3) — earnings is the
// modeled axis that co-moves with H. By rotating H's slow axis (local / cross-city /
// pick), earnings is the ONLY signal consistent with always choosing H; neglecting a
// single cost axis only explains H on the menus where THAT axis is the slow one. So the
// pooled conditional logit attributes consistent-H-choosing to earnings (W3) and a
// single-axis cost-neglecter to that axis (local/cross/pick), not to W3. This is the
// theorem's menu-span condition made concrete: the trap action set must span the
// earnings x {each cost axis} subspace, not just earnings x pick.
const TRAP_PAY_EARN = [38, 44];
const TRAP_PAY_AXES = {
  // LOCAL is the clean axis: low pick (so dPick is small) and a local penalty large enough to
  // make H sub-optimal but only by ~14% (a moderate gap, so a planted payout-overweighter still
  // CHOOSES H and reveals the leak; too large a gap and even a biased participant takes the
  // oracle, erasing the W3 signal). The SHIFTED transfer trap overrides `local` with a bigger
  // range (cell.payLocal) because its fixed start->city cross leg compresses the gap.
  local: { pick: [5, 8], local: [12, 16] },   // slow via LOCAL travel (low pick, same city -> no cross)
  pick: { pick: [14, 18], local: [2, 4] },    // slow via PICK time (high pick, low local)
  cross: { pick: [5, 8], local: [2, 4] },     // slow via CROSS-CITY travel (placed in a far city)
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
  let sharedStoreLocal = 0; // total local-travel of shared-store groups (for the gate's local axis)
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
      sharedStoreLocal += g.reduce((s, o) => s + (Number(o.localTravelTime) || 0), 0);
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
    // Additive (NOT a FEATURE_COLUMN, does not affect score/oracle): the within-store local-travel
    // of shared-store groups, so the sign-survival gate can vary a hypothetical local-travel
    // reduction without re-deriving per-order grouping. Zero for singletons / no shared store.
    shared_store_local_seconds: sharedStoreLocal,
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

  for (let attempt = 0; attempt < 600; attempt += 1) {
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
    const span = (a, b) => a + (b - a) * rng();
    const mkAt = (storeObj, basePickRaw, localRaw, earn) => {
      const basePick = basePickRaw * pickScale;
      const estimatedTime = Math.round((basePick + localRaw) * 10) / 10;
      idx += 1;
      return {
        id: `${scenarioId}o${idx}`,
        store: storeObj.store,
        city: storeObj.city,
        earnings: Math.round(earn),
        estimatedTime,
        pick: Math.round(basePick * 10) / 10,
        localTravelTime: Math.round(localRaw * 10) / 10,
      };
    };
    // b1 / b2 (fast optimal, high-pick bait).
    const mkRole = (storeObj, role) => {
      const r = TRAP_ROLE_RANGES[role];
      return mkAt(storeObj, span(r.pick[0], r.pick[1]), span(r.local[0], r.local[1]), span(r.earn[0], r.earn[1]));
    };
    // H (the high-pay trap), made slow via the given cost axis (local / pick / cross). A cell
    // may override the local-penalty range (cell.payLocal) for the shifted transfer trap, which
    // needs a bigger local cost to stay sub-optimal under its fixed start->city cross leg.
    const mkPay = (storeObj, axis) => {
      const r = TRAP_PAY_AXES[axis] || TRAP_PAY_AXES.local;
      const localRange = (axis === "local" && cell.payLocal) ? cell.payLocal : r.local;
      return mkAt(storeObj, span(r.pick[0], r.pick[1]), span(localRange[0], localRange[1]), span(TRAP_PAY_EARN[0], TRAP_PAY_EARN[1]));
    };

    // Neutral filler + bundling-correct building blocks.
    const mkDistractor = (storeObj) => mkAt(storeObj, span(DISTRACTOR_ROLE.pick[0], DISTRACTOR_ROLE.pick[1]), span(DISTRACTOR_ROLE.local[0], DISTRACTOR_ROLE.local[1]), span(DISTRACTOR_ROLE.earn[0], DISTRACTOR_ROLE.earn[1]));
    const mkBundleOrder = (storeObj) => mkAt(storeObj, span(BUNDLE_ROLE.pick[0], BUNDLE_ROLE.pick[1]), span(BUNDLE_ROLE.local[0], BUNDLE_ROLE.local[1]), span(BUNDLE_ROLE.earn[0], BUNDLE_ROLE.earn[1]));
    const allStores = cities.flatMap((c) => byCity[c]);
    // Raise the menu to >= 4 distinct orders with neutral filler singletons at UNUSED stores
    // (so they can never bundle). Prefer the host city first (keeps dispersion low where the
    // layout allows it), then other cities. The filler scores BELOW the design's key alternative
    // (the trap's H, the over-bundle's b1, the bundle's best single), so it never changes the
    // oracle, the trap axis/cleanliness, or the over-bundling regret.
    const padToFour = (hostCity) => {
      for (let guard = 0; orders.length < 4 && guard < 12; guard += 1) {
        const used = new Set(orders.map((o) => o.store));
        const free = allStores.filter((s) => !used.has(s.store));
        if (!free.length) break;
        const inHost = free.filter((s) => s.city === hostCity);
        orders.push(mkDistractor(inHost[0] || free[0]));
      }
    };

    if (cell.stress === "trap") {
      // S1 hosts the fast optimal singleton b1 + the high-pick bait b2 (a legal same-store
      // over-bundle). S2 hosts the high-pay singleton H, made sub-optimal via cell.trapAxis
      // (local/pick keep H in b1's city -> dCross 0; cross places H in the farthest city). The
      // pad distractor is a far singleton that never touches the H-vs-b1 delta, so the single
      // slow axis and its cleanliness are preserved (only the menu's dispersion flag may flip).
      const axis = cell.trapAxis || "local";
      let homeCity, s1, s2;
      if (axis === "cross") {
        const sorted = cities.slice().sort((a, b) => crossCity(CHI_STARTING_CITY, a) - crossCity(CHI_STARTING_CITY, b));
        homeCity = sorted[0];
        const farCity = sorted[sorted.length - 1] !== homeCity ? sorted[sorted.length - 1] : (sorted[1] ?? homeCity);
        s1 = byCity[homeCity][0];
        s2 = byCity[farCity][0];
      } else {
        const twoStoreCities = cities.filter((c) => byCity[c].length >= 2);
        const pool = twoStoreCities.length ? twoStoreCities : cities;
        homeCity = pool[Math.floor(rng() * pool.length)];
        s1 = byCity[homeCity][0];
        s2 = byCity[homeCity][1] || byCity[cities.find((c) => c !== homeCity) ?? homeCity][0];
      }
      orders.push(mkRole(s1, "fast"));  // b1 — the score-optimal (faster, lower-paying)
      orders.push(mkRole(s1, "bait"));  // b2 — slow, low-pay over-bundle bait
      orders.push(mkPay(s2, axis));     // H  — max-earnings, sub-optimal via cell.trapAxis (the trap)
      padToFour(homeCity);
    } else if (cell.stress === "overbundle") {
      // Guaranteed over-bundling REGRET: a fast high-value anchor b1 plus (count-1) high-pick
      // low-pay baits, ALL at one store. The full same-store bundle pays the MOST but is
      // sub-optimal (the baits' pick sinks the rate); the oracle is a strict subset (b1).
      const count = cell.count || 2;
      const hostCity = (cell.hostCity && byCity[cell.hostCity])
        ? cell.hostCity
        : cities.slice().sort((a, b) => crossCity(CHI_STARTING_CITY, a) - crossCity(CHI_STARTING_CITY, b))[0];
      const hostStore = byCity[hostCity][0];
      orders.push(mkRole(hostStore, "fast"));                                  // b1 — the oracle subset anchor
      for (let k = 1; k < count; k += 1) orders.push(mkRole(hostStore, "bait")); // baits — more $, lots of pick
      padToFour(hostCity);
    } else if (cell.stress === "bundle") {
      // Bundling-CORRECT (the under-bundling test): `count` BALANCED orders at ONE store. The
      // shared-pick saving plus the start->store cross leg amortized over the bundle make the
      // same-store pair/triple the highest-scoring feasible trip AND the max-earnings bundle, so
      // bundling is the right call and every single order is a strictly worse UNDER-bundling
      // choice with real regret. Host in the city FARTHEST from the start so the amortized cross
      // gives the bundle its edge (and a triple strictly beats its pairs). Pad with worse singles.
      const count = cell.count || 2;
      const farFirst = cities.slice().sort((a, b) => crossCity(CHI_STARTING_CITY, b) - crossCity(CHI_STARTING_CITY, a));
      const hostCity = (cell.hostCity && byCity[cell.hostCity]) ? cell.hostCity : farFirst[0];
      const hostStore = byCity[hostCity][0];
      for (let k = 0; k < count; k += 1) orders.push(mkBundleOrder(hostStore));
      padToFour(hostCity);
    } else {
      // route: distinct-store singletons spanning >= 2 cities (W2 / cross-city), >= 4 orders, no
      // store overlap. One store per city first (max dispersion), then fill to four distinct stores.
      const chosen = [];
      for (const c of cities) if (byCity[c][0] && chosen.length < 4) chosen.push(byCity[c][0]);
      for (const c of cities) if (byCity[c][1] && chosen.length < 4) chosen.push(byCity[c][1]);
      for (const s of allStores) if (chosen.length < 4 && !chosen.includes(s)) chosen.push(s);
      for (const s of chosen.slice(0, 4)) orders.push(mkOrder(s, false));
    }

    if (orders.length < 4) continue; // every menu carries >= 4 distinct orders (no binary picks)
    const realizedOverlap = storeOverlapFlag(orders);
    const realizedDispersion = dispersionFlag(orders);
    // bundle/over-bundle/trap host a same-store bundle (overlap 1); route is distinct stores
    // (overlap 0). Reject if the construction collapsed against its intent.
    const wantOverlap = cell.stress === "route" ? 0 : 1;
    if (realizedOverlap !== wantOverlap) continue;

    const byId = ordersById(orders);
    const orderIds = orders.map((o) => o.id);
    const legal = enumerateLegalBundles(orderIds, byId, 3);
    if (legal.length < 2) continue;
    const scored = legal.map((b) => scoreBundle(b, byId, CHI_STARTING_CITY, travelScale));
    const { best, second } = bestTwo(scored);
    if (!second) continue;
    const gap = (best.score - second.score) / best.score;
    const minGap = cell.minGap || NONTRIVIAL_SCORE_GAP;
    if (!(gap >= minGap)) continue;                          // non-trivial (or per-cell minimum) gap
    if (cell.maxGap && gap > cell.maxGap) continue;          // keep banded traps from getting trivially easy
    // unique oracle (no tie at the top)
    if (Math.abs(best.score - second.score) < 1e-9) continue;

    // Highest-paying legal bundle (for the payout-trap invariant + analysis tag).
    const maxEarn = scored.reduce((a, c) => (c.earnings > a.earnings ? c : a), scored[0]);

    // H-vs-oracle cost decomposition (singletons carry no savings, so dTime = dPick+dCross+dLocal).
    // Used to flag a CLEAN single-axis trap and to label which axis makes the max-pay choice slow.
    const dPick = maxEarn.effective_pick_time_seconds - best.effective_pick_time_seconds;
    const dCross = maxEarn.cross_city_travel_time_seconds - best.cross_city_travel_time_seconds;
    const dLocal = maxEarn.local_travel_time_seconds - best.local_travel_time_seconds;
    const dTime = maxEarn.total_time_seconds - best.total_time_seconds;
    const axisDelta = { local: dLocal, cross: dCross, pick: dPick };
    const namedAxis = cell.trapAxis || "local";
    const cleanSingleAxis = dTime > 0
      && axisDelta[namedAxis] >= CLEAN_AXIS_SHARE * dTime
      && Object.entries(axisDelta).every(([k, v]) => k === namedAxis || v < CLEAN_OTHER_SHARE * dTime);

    if (cell.stress === "trap") {
      // The trap: the max-earnings legal bundle is NOT the oracle, the oracle is the
      // faster lower-paying option, and a sub-optimal same-store over-bundle exists.
      if (sortedIdsEqual(maxEarn.bundle_ids, best.bundle_ids)) continue;
      if (!(best.total_time_seconds < maxEarn.total_time_seconds)) continue;
      if (!(best.earnings < maxEarn.earnings)) continue;
      const overBundle = scored.find((s) => s.bundle_ids.length >= 2 && !sortedIdsEqual(s.bundle_ids, best.bundle_ids));
      if (!overBundle) continue;
      // A `clean` trap must isolate ONE cost axis (the cross+pick confound the shifted traps had
      // is rejected here). Its gap floor/band is set per cell via minGap/maxGap.
      if (cell.clean && !cleanSingleAxis) continue;
    }
    if (cell.stress === "overbundle") {
      // The max-PAY choice must be a strictly BIGGER bundle than the oracle, and the oracle a
      // strict subset of it, so the only correction is "drop the excess orders" (real regret).
      if (!(maxEarn.bundle_ids.length > best.bundle_ids.length)) continue;
      if (!best.bundle_ids.every((id) => maxEarn.bundle_ids.map(String).includes(String(id)))) continue;
      if (!(best.earnings < maxEarn.earnings)) continue;
    }
    if (cell.stress === "bundle") {
      // Bundling is CORRECT: the oracle is a genuine pair/triple that is ALSO the max-earnings
      // bundle, and the best single order is a strictly worse UNDER-bundling choice with real
      // (>= 12%) regret. So a "never bundle" heuristic loses here.
      if (!(best.bundle_ids.length >= 2)) continue;                                 // oracle is a pair or triple
      if (!sortedIdsEqual(best.bundle_ids, maxEarn.bundle_ids)) continue;           // and the highest-paying bundle
      const singles = scored.filter((c) => c.bundle_ids.length === 1);
      const bestSingle = singles.reduce((a, c) => (a && a.score >= c.score ? a : c), null);
      if (!bestSingle) continue;
      if (!(bestSingle.score <= best.score * (1 - BUNDLE_MIN_SINGLE_REGRET))) continue; // real under-bundling regret
    }

    // Oracle CATEGORY (the fix's target axis): an over-bundling trap (max-pay is a bigger bundle
    // than the oracle), a bundling-correct round (the oracle IS a pair/triple), or a single-order
    // oracle (route / payout trap). Stored so the integrity check can balance the mix ~1/3 each.
    const oracleSize = best.bundle_ids.length;
    const oracleCategory = maxEarn.bundle_ids.length > oracleSize ? "over_bundle"
      : oracleSize >= 2 ? "bundle_correct" : "single";
    const overBundlingCoachable = maxEarn.bundle_ids.length > best.bundle_ids.length ? 1 : 0;
    const underBundlingCoachable = oracleCategory === "bundle_correct" ? 1 : 0;
    const payoutCoachable = !sortedIdsEqual(maxEarn.bundle_ids, best.bundle_ids) ? 1 : 0;

    return {
      round,
      scenario_id: scenarioId,
      phase,
      order_ids: orderIds,
      orders,
      max_bundle: 3,
      store_overlap_flag: realizedOverlap,
      dispersion_flag: realizedDispersion,
      shift_flag: cell.shift ? 1 : 0,
      stress: cell.stress,
      is_payout_trap: cell.stress === "trap" ? 1 : 0,
      trap_axis: cell.stress === "trap" ? (cell.trapAxis || "local") : null,
      // Oracle size + category (the single-order-dominance fix reads these to balance the mix).
      oracle_size: oracleSize,
      oracle_category: oracleCategory,
      // Coachability tags the integrity check reads: over-bundling = the max-pay choice is a
      // bigger bundle than the oracle; under-bundling = the oracle IS a pair/triple (bundling
      // correct); payout = the max-pay choice is simply not the oracle.
      over_bundling_coachable: overBundlingCoachable,
      under_bundling_coachable: underBundlingCoachable,
      payout_coachable: payoutCoachable,
      // Realized H-vs-oracle cost decomposition + the clean-single-axis flag (traps only).
      trap_clean: cell.stress === "trap" && cleanSingleAxis ? 1 : 0,
      trap_axis_deltas: cell.stress === "trap"
        ? { pick: Math.round(dPick * 100) / 100, cross: Math.round(dCross * 100) / 100, local: Math.round(dLocal * 100) / 100, time: Math.round(dTime * 100) / 100 }
        : null,
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

// The Phase A diagnostic battery now spans THREE oracle types so the set is not blind to
// under-bundling: payout TRAPS (W3, single-order oracle, rotating slow axis local/cross/pick),
// OVER-bundle rounds (W1, oracle a strict subset of the max-pay bundle: over-bundling is wrong),
// BUNDLE-correct rounds (W1, oracle a genuine pair/triple: under-bundling is wrong), and ROUTE
// (W2). Every menu carries >= 4 distinct orders. Cycled to `diagnosticRounds`; the runtime
// randomizes the order. (overlap/dispersion are realized from the orders, not declared.)
const DIAGNOSTIC_CELLS = [
  { stress: "trap", trapAxis: "local" },   // W3 single-order oracle, H slow via local
  { stress: "bundle", count: 2 },          // bundling correct — a PAIR oracle (under-bundling wrong)
  { stress: "overbundle", count: 3 },      // over-bundling regret (oracle a strict subset)
  { stress: "trap", trapAxis: "cross" },   // W3, H slow via cross-city
  { stress: "bundle", count: 3 },          // bundling correct — a TRIPLE oracle
  { stress: "overbundle", count: 2 },      // over-bundling regret
  { stress: "route" },                     // W2 cross-city, single-order oracle
  { stress: "trap", trapAxis: "pick" },    // W3, H slow via pick
  { stress: "bundle", count: 2 },          // bundling correct — pair
  { stress: "overbundle", count: 3 },      // over-bundling regret
  { stress: "bundle", count: 3 },          // bundling correct — triple
  { stress: "trap", trapAxis: "local" },   // W3, H slow via local
  { stress: "route" },                     // W2 cross-city
  { stress: "bundle", count: 2 },          // bundling correct — pair
  { stress: "overbundle", count: 2 },      // over-bundling regret
];
// The SHIFTED transfer trap (B4): a clean single-axis LOCAL payout trap. H is the 2nd Albany
// store, slow via local travel alone (dCross = 0, low pick); a larger local penalty (payLocal)
// keeps it sub-optimal under the fixed start->city cross leg, banded to [12%, 30%].
const SHIFT_LOCAL_TRAP = {
  stress: "trap", trapAxis: "local", clean: true,
  minGap: CLEAN_TRAP_MIN_GAP, maxGap: CLEAN_TRAP_MAX_GAP, payLocal: [26, 36],
};

// The training support, shared by the ON coaching blocks (B1, B3) AND the same-distribution
// retention block (B2). Five cells presenting ALL THREE errors so coaching covers them and the
// held-out blocks can re-diagnose any residual: a payout TRAP (W3, axis rotates by block for
// identifiability), an OVER-bundle round (W1 over), a BUNDLE-correct round (W1 under), plus a
// ROUTE (W2 / overlap-0 span). The ON blocks lean bundle-heavy; retention adds an extra
// over-bundle so both leak directions stay re-diagnosable.
const trainingSequence = (axis, bundleHeavy) => [
  { stress: "route" },
  { stress: "trap", trapAxis: axis },
  { stress: "overbundle", count: 3 },
  { stress: "bundle", count: 2 },
  bundleHeavy ? { stress: "bundle", count: 3 } : { stress: "overbundle", count: 2 },
];
// B1 presents the LOCAL payout trap (the clean direction the transfer block tests); B2 and B3
// present a CROSS-axis trap (keeps the pooled trap battery axis-balanced so W3 stays separable
// from a single-axis cost-neglecter). B1/B3 are bundle-heavy; B2 is over-bundle-heavy.
const BLOCK_TRAINING = { B1: { axis: "local", bundleHeavy: true }, B3: { axis: "cross", bundleHeavy: true } };

// Coaching/held-out blocks should sit at a comparable second-best gap (~0.24 to 0.28) so difficulty
// is matched. B1/B3 already land there; B2 (retention) ran too HARD and B4 (transfer) too EASY, so
// ONLY those two are banded here. The round TYPE and trap AXIS are unchanged; only the gap moves.
// The banded rounds are tuned so each block MEAN lands in 0.24 to 0.28. B2's bundle-correct r24 runs
// gap-high and B4's triple r35 runs gap-low (both kept for their >=12% regret, not gap-banded), so
// B2's banded rounds sit a touch LOW and B4's a touch HIGH to compensate.
const RETUNE_GAP_BAND = { minGap: 0.24, maxGap: 0.28 };
// The bundle-correct rounds are NOT forced into the band (they keep their >=12% single-vs-bundle
// binding regret, enforced by BUNDLE_MIN_SINGLE_REGRET). But their second-best gap is lightly
// bounded so it does not pull the block mean out of range: B2's pair runs gap-high (cap it) and
// B4's triple runs gap-low (floor it).
const B2_SEQUENCE = [
  { stress: "route", ...RETUNE_GAP_BAND },                      // r21
  { stress: "trap", trapAxis: "cross", ...RETUNE_GAP_BAND },    // r22 (clean cross trap, still >=12%)
  { stress: "overbundle", count: 3, ...RETUNE_GAP_BAND },       // r23
  { stress: "bundle", count: 2, maxGap: 0.28 },                // r24: keeps regret >=12%; gap capped
  { stress: "overbundle", count: 2, ...RETUNE_GAP_BAND },       // r25
];

// TRANSFER-FIRST: the held-out shifted transfer block (B4) is designed first and tests all three
// errors. Two over-bundling-regret rounds (oracle a strict subset of the max-pay over-bundle) +
// ONE clean single-axis LOCAL payout trap (>= 12%) + TWO bundling-CORRECT rounds (a genuine
// pair/triple is the highest-scoring trip, so the transfer also probes WHEN TO BUNDLE). All on
// novel single-store C-cities; order ids are disjoint from training.
const TRANSFER_SUPPORT = [
  { stress: "overbundle", count: 3, hostCity: "Emeryville", ...RETUNE_GAP_BAND },   // r31 (banded up)
  { stress: "bundle", count: 2, hostCity: "Richmond", minGap: 0.16 },   // r32 pair: keeps regret >= 12%; gap floored
  { ...SHIFT_LOCAL_TRAP, ...RETUNE_GAP_BAND },            // r33 clean local trap (Albany), banded ~0.26 (still >= 12%)
  { stress: "overbundle", count: 3, hostCity: "Piedmont", ...RETUNE_GAP_BAND },     // r34 (banded up)
  { stress: "bundle", count: 3, hostCity: "Richmond", minGap: 0.16 },   // r35 triple: keeps regret >= 12%; gap floored
];

const blockSequence = (blk) => {
  if (blk.test_set === "transfer_shifted") return TRANSFER_SUPPORT.map((c) => ({ ...c, shift: true }));
  if (blk.id === "B2") return B2_SEQUENCE.map((c) => ({ ...c, shift: false }));
  const t = BLOCK_TRAINING[blk.id] || { axis: "local", bundleHeavy: true };
  return trainingSequence(t.axis, t.bundleHeavy).map((c) => ({ ...c, shift: false }));
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
export function buildChiScenarioSet({ diagnosticRounds = 15, blockSize = 5, seed = 42 } = {}) {
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

  // Phase B: ON/OFF/ON/OFF. The ON coaching blocks (B1, B3) and the same-distribution
  // retention block (B2) all draw from the shared TRAINING_SUPPORT (both errors + 2x2 span);
  // the transfer block (B4) draws from the TRANSFER-FIRST shifted support. Every block PRESENTS
  // both an over-bundling-regret round and a payout trap, so coaching covers both errors and the
  // held-out blocks can re-diagnose either residual leak.
  for (const blk of CHI_PHASE_B_BLOCK_LAYOUT) {
    const seq = blockSequence(blk);
    for (let i = 0; i < blockSize; i += 1) {
      emit("B", seq[i % seq.length], {
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
 * Validate the dynamic-feedback design:
 *  - the 2x2 of overlap x dispersion is spanned in the Phase A diagnostic battery AND in the
 *    ON training pool (>= minPerCell per cell);
 *  - the two OFF blocks are the common held-out sets (B2 retention same-dist, B4 transfer
 *    shifted with novel stores) with order ids disjoint from the training pool;
 *  - every menu has a unique computable oracle, a non-trivial gap, and a full five-feature
 *    candidate action set with exactly one max-score oracle;
 *  - BOTH errors are present in every coaching block (B1, B3), the retention block, and the
 *    transfer block: an over-bundling-coachable round AND a payout trap;
 *  - the retention block is held out from the SAME support as the ON blocks;
 *  - the transfer block over-samples picking, is a heavier-pick labeled shift, and contains a
 *    CLEAN single-axis payout trap with relative_gap >= 12%;
 *  - the diagnostic battery keeps both a picking and a payout-trap signal and rotates >= 2
 *    distinct trap slow-axes for identifiability.
 */
export function validateChiScenarioSet(set, { minPerCell = 2, minTrap = 3 } = {}) {
  const errors = [];
  const scenarios = set?.scenarios || [];
  const diagnostic = scenarios.filter((s) => s.phase === "A");
  const phaseB = scenarios.filter((s) => s.phase === "B");
  const onMenus = phaseB.filter((s) => s.block_kind === "on");
  const retention = phaseB.filter((s) => s.test_set === "retention_same_dist");
  const transfer = phaseB.filter((s) => s.test_set === "transfer_shifted");

  // FLOOR: every menu carries >= 4 DISTINCT orders (no 2-order binary picks).
  for (const s of scenarios) {
    if ((s.orders?.length ?? 0) < 4) errors.push(`round ${s.round} has ${s.orders?.length ?? 0} < 4 orders`);
    if (new Set(s.order_ids).size < 4) errors.push(`round ${s.round} has < 4 distinct order ids`);
  }

  // Overlap (W1 bundling) and dispersion (W2 cross-city) both vary in the diagnostic battery and
  // the ON pool. The old o0d0 anchor is dropped: a 4-order single-city distinct-store menu is
  // infeasible with 2 stores per A/B city, so the W1/W2 separation comes from the reachable cells
  // (overlap-0 route vs overlap-1 bundle/over/trap; dispersion 0 vs 1).
  const checkSpan = (rows, label) => {
    if (new Set(rows.map((s) => s.store_overlap_flag)).size < 2) errors.push(`${label} store_overlap_flag does not vary (need an overlap-0 route + overlap-1 bundle/trap)`);
    if (new Set(rows.map((s) => s.dispersion_flag)).size < 2) errors.push(`${label} dispersion_flag does not vary`);
  };
  checkSpan(diagnostic, "diagnostic (A)");
  checkSpan(onMenus, "ON training pool");

  // ORACLE-TYPE MIX (the single-order-dominance fix): the study tests all three errors with a
  // roughly balanced mix so a "never bundle" heuristic does NOT score well -- ~1/3 single-order
  // oracles (route / payout trap), ~1/3 bundling-CORRECT pair/triple oracles (UNDER-bundling is
  // the leak), ~1/3 over-bundling traps (oracle a strict subset of the max-pay bundle).
  const catCount = (rows, cat) => rows.filter((s) => s.oracle_category === cat).length;
  for (const cat of ["single", "bundle_correct", "over_bundle"]) {
    if (catCount(scenarios, cat) < 8) errors.push(`oracle-category "${cat}" has only ${catCount(scenarios, cat)} rounds (< 8; the ~1/3 mix is too lopsided)`);
  }

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

  // ALL THREE ERRORS PER BLOCK. Every coaching block (B1, B3), the retention block (B2), and the
  // transfer block (B4) must PRESENT all three errors the study probes: an OVER-bundling round
  // (max-pay is a strictly bigger bundle than the oracle), a BUNDLING-CORRECT round (the oracle
  // IS a pair/triple, so under-bundling is the leak), and a PAYOUT trap (oracle != max-pay). The
  // bundling-correct round is the fix for under-bundling blindness and must appear transfer-first
  // (in B4) and be covered in B1, B2, B3.
  const onBlocks = [...new Set(onMenus.map((s) => s.block))].map((id) => [onMenus.filter((s) => s.block === id), `ON block ${id}`]);
  for (const [rows, label] of [...onBlocks, [retention, "retention (B2)"], [transfer, "transfer (B4)"]]) {
    if (!rows.some((s) => s.over_bundling_coachable === 1)) errors.push(`${label} has no over-bundling round (oracle smaller than the max-pay bundle)`);
    if (!rows.some((s) => s.under_bundling_coachable === 1)) errors.push(`${label} has no bundling-correct round (a pair/triple oracle; cannot test/coach UNDER-bundling)`);
    if (!rows.some((s) => s.is_payout_trap === 1)) errors.push(`${label} has no payout trap (oracle != max-pay; cannot coach / re-diagnose payout)`);
  }

  // SAME SUPPORT: the retention block (B2) is held out from the SAME support as the ON coaching
  // blocks, so it is a genuine same-distribution test rather than a separate all-trap probe. It
  // must carry the same stress types the ON pool uses.
  const supportOf = (rows) => new Set(rows.map((s) => s.stress));
  const onSupport = supportOf(onMenus);
  for (const stress of onSupport) {
    if (!supportOf(retention).has(stress)) errors.push(`retention block is missing the ON stress type "${stress}" (not the same support as B1/B3)`);
  }

  // The transfer block (B4) over-samples the picking cell (overlap=1 every menu) so the coached
  // weakness is measurable, and is a labeled PICKING shift with a heavier pick load than training.
  if (!transfer.every((s) => s.store_overlap_flag === 1)) {
    errors.push("transfer block must over-sample the picking cell (store_overlap_flag=1 in every menu)");
  }
  const meanPick = (rows) => {
    let tot = 0, n = 0;
    for (const s of rows) for (const o of s.orders) { tot += Number(o.pick) || 0; n += 1; }
    return n ? tot / n : 0;
  };
  if (meanPick(transfer) <= meanPick([...diagnostic, ...onMenus])) {
    errors.push("transfer block does not increase the average pick load vs training (the labeled picking shift)");
  }

  // The transfer block must contain at least one CLEAN single-axis payout trap that clears the
  // 12% power floor: H slow via EXACTLY ONE cost component (trap_clean=1), gap >= 12%. This is
  // the contract fix for the old transfer traps, which made H slow via cross AND pick at 4-6%.
  if (!transfer.some((s) => s.is_payout_trap === 1 && s.trap_clean === 1 && s.relative_gap >= CLEAN_TRAP_MIN_GAP)) {
    const got = transfer.filter((s) => s.is_payout_trap === 1).map((s) => `${s.trap_axis}/clean=${s.trap_clean}/${(s.relative_gap * 100).toFixed(1)}%`);
    errors.push(`transfer block has no CLEAN single-axis payout trap with relative_gap >= ${CLEAN_TRAP_MIN_GAP} (got ${got.join(", ") || "no traps"})`);
  }

  // The transfer block must also test WHEN TO BUNDLE: at least one bundling-correct round (a
  // genuine pair/triple oracle) so transfer is not blind to under-bundling either.
  if (!transfer.some((s) => s.oracle_category === "bundle_correct")) {
    errors.push("transfer block has no bundling-correct round (cannot test when-to-bundle on transfer)");
  }

  // Signal coverage in the diagnostic battery: a payout-trap signal (W3) AND a bundling-decision
  // signal (W1) -- the W1 signal is now the over-bundle AND bundling-correct rounds (both turn on
  // whether to add same-store orders), so earnings/pick are not collinear and W1/W3 separate.
  const diagTraps = diagnostic.filter((s) => s.is_payout_trap === 1);
  const diagBundleDecision = diagnostic.filter((s) => s.stress === "overbundle" || s.stress === "bundle");
  if (diagTraps.length < minTrap) errors.push(`diagnostic battery has ${diagTraps.length} < ${minTrap} payout-trap menus (W3 not separately identifiable)`);
  if (diagBundleDecision.length < minTrap) errors.push(`diagnostic battery has ${diagBundleDecision.length} < ${minTrap} bundling-decision menus (over/bundle; lost the W1 signal)`);

  // HETEROGENEITY in the diagnostic battery: its traps must make H sub-optimal via DIFFERENT
  // cost axes (>= 2 distinct), else earnings co-moves with one fixed axis on every trap and a
  // single-axis cost-neglecter is misdiagnosed as W3. (The coaching/held-out blocks deliberately
  // use the clean LOCAL axis; the rotating-axis identifiability battery lives in Phase A.)
  const axesOf = (rows) => new Set(rows.filter((s) => s.is_payout_trap === 1).map((s) => s.trap_axis));
  if (axesOf(diagnostic).size < 2) errors.push(`diagnostic battery traps use only ${[...axesOf(diagnostic)]} (need >=2 distinct slow axes so W3 != single-axis neglect)`);

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

  // Bundling-CORRECT invariant: the oracle is a genuine pair/triple that is ALSO the max-earnings
  // bundle, and the best single order is a strictly worse UNDER-bundling choice (>= 12% regret).
  for (const s of scenarios.filter((x) => x.oracle_category === "bundle_correct")) {
    const cb = s.candidate_bundles || [];
    const opt = cb.find((c) => c.is_oracle === 1);
    const maxEarn = cb.reduce((a, c) => (a && Number(a.earnings) >= Number(c.earnings) ? a : c), null);
    if (!opt || !maxEarn) { errors.push(`bundle-correct round ${s.round} missing candidate_bundles`); continue; }
    if (!(opt.bundle_ids.length >= 2)) errors.push(`bundle-correct round ${s.round}: oracle is not a pair/triple`);
    if (!sortedIdsEqual(opt.bundle_ids, maxEarn.bundle_ids)) errors.push(`bundle-correct round ${s.round}: the oracle bundle is not also the max-earnings bundle`);
    const singles = cb.filter((c) => Array.isArray(c.bundle_ids) && c.bundle_ids.length === 1);
    const bestSingle = singles.reduce((a, c) => (a && Number(a.score) >= Number(c.score) ? a : c), null);
    if (!bestSingle) errors.push(`bundle-correct round ${s.round}: no single-order alternative present`);
    else if (!(Number(bestSingle.score) <= Number(opt.score) * (1 - BUNDLE_MIN_SINGLE_REGRET))) {
      errors.push(`bundle-correct round ${s.round}: the best single order is not >= ${Math.round(BUNDLE_MIN_SINGLE_REGRET * 100)}% worse (no real under-bundling regret)`);
    }
  }

  // Over-bundling invariant: the oracle is a STRICT SUBSET of the max-pay bundle (so over-bundling
  // is the leak with real regret -- "drop the excess orders").
  for (const s of scenarios.filter((x) => x.oracle_category === "over_bundle")) {
    const cb = s.candidate_bundles || [];
    const opt = cb.find((c) => c.is_oracle === 1);
    const maxEarn = cb.reduce((a, c) => (a && Number(a.earnings) >= Number(c.earnings) ? a : c), null);
    if (!opt || !maxEarn) { errors.push(`over-bundle round ${s.round} missing candidate_bundles`); continue; }
    if (!(maxEarn.bundle_ids.length > opt.bundle_ids.length)) errors.push(`over-bundle round ${s.round}: the max-pay bundle is not bigger than the oracle`);
    if (!opt.bundle_ids.every((id) => maxEarn.bundle_ids.map(String).includes(String(id)))) errors.push(`over-bundle round ${s.round}: the oracle is not a strict subset of the max-pay bundle`);
  }

  return { ok: errors.length === 0, errors, n_scenarios: scenarios.length };
}
