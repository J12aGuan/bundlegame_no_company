import { saveScenarioDatasetBundle } from "../firebaseDB.js";
import {
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchScenarioDatasetBundle
} from "./scenarioData.js";
import {
  estimateLocalTravelTime,
  estimatePickItemTime,
  crossCityExtraTime
} from "./scenarioTime.js";
import { applySharedItemBundleSavings } from "../bundleTime.js";

export {
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchScenarioDatasetBundle,
  estimateLocalTravelTime,
  estimatePickItemTime,
  crossCityExtraTime
};

// Helper methods
// Returns a random integer in the inclusive range [min, max].
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Returns one random element from an array, or null for empty input.
function pickRandom(arr = []) {
  if (!arr.length) return null;
  return arr[randomInt(0, arr.length - 1)];
}

// Shuffles a copy of an array.
function shuffle(arr = []) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Picks one entry from weighted candidates: [{ value, weight }].
function pickWeighted(candidates = []) {
  const valid = (Array.isArray(candidates) ? candidates : [])
    .filter((c) => c && Number(c.weight) > 0);
  if (!valid.length) return null;

  const total = valid.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  if (total <= 0) return valid[0]?.value ?? null;

  let roll = Math.random() * total;
  for (const item of valid) {
    roll -= Number(item.weight || 0);
    if (roll <= 0) return item.value;
  }
  return valid[valid.length - 1]?.value ?? null;
}

// Fair target-city selector for odd rounds:
// least-used cities first, then weighted preference for reference city.
function selectFairTargetCity(cities = [], targetCityCount = {}, referenceCity = "") {
  const uniqueCities = [...new Set((Array.isArray(cities) ? cities : []).map((c) => String(c || "").trim()).filter(Boolean))];
  if (!uniqueCities.length) return "";

  const counts = uniqueCities.map((city) => Number(targetCityCount?.[city]) || 0);
  const minCount = Math.min(...counts);
  const candidateCities = uniqueCities.filter((city) => (Number(targetCityCount?.[city]) || 0) <= (minCount + 1));

  const ref = String(referenceCity || "").trim();
  const weighted = candidateCities.map((city) => ({
    value: city,
    weight: city === ref ? 3 : 1
  }));

  return String(pickWeighted(weighted) || candidateCities[0] || uniqueCities[0] || "");
}

// Extracts available city names from the cities travel-time matrix.
function getCitiesFromTravelTimes(citiesDataset = {}) {
  return Object.keys(citiesDataset?.travelTimes || {});
}

// Returns all store configs belonging to a given city.
function getStoresInCity(storeDataset = {}, city = "") {
  const stores = Array.isArray(storeDataset?.stores) ? storeDataset.stores : [];
  return stores.filter((s) => String(s?.city) === String(city));
}

// Returns whether any store exists in a city.
function hasStoresInCity(storeDataset = {}, city = "") {
  return getStoresInCity(storeDataset, city).length > 0;
}

// Builds per-order city assignments with max 2 cities per round.
function buildCityAssignments({
  count = 4,
  cities = [],
  storeDataset = {},
  targetCity = "",
  forcedCity = ""
} = {}) {
  const validCities = (Array.isArray(cities) ? cities : [])
    .map((c) => String(c || "").trim())
    .filter((c) => c && hasStoresInCity(storeDataset, c));

  if (!validCities.length) return new Array(count).fill("Berkeley");

  const forced = String(forcedCity || "").trim();
  if (forced && validCities.includes(forced)) {
    return new Array(count).fill(forced);
  }

  const target = String(targetCity || "").trim();
  const primary = target && validCities.includes(target) ? target : (pickRandom(validCities) || validCities[0]);
  const secondaryPool = validCities.filter((c) => c !== primary);
  const secondary = secondaryPool.length ? (pickRandom(secondaryPool) || secondaryPool[0]) : "";

  if (!secondary) {
    return new Array(count).fill(primary);
  }

  // For 4 orders, use either 2/2 or 3/1 split to encourage bundle opportunities.
  let primaryCount = count;
  if (count >= 4) {
    primaryCount = pickRandom([2, 3]);
  } else if (count === 3) {
    primaryCount = 2;
  } else if (count === 2) {
    primaryCount = 1;
  }
  const secondaryCount = Math.max(0, count - primaryCount);

  const assignments = [
    ...new Array(primaryCount).fill(primary),
    ...new Array(secondaryCount).fill(secondary)
  ];
  return shuffle(assignments);
}

// Collects item names from store config (explicit list or scanned grid).
function getStoreItems(storeConfig = {}) {
  // Prefer explicit items list; fallback by scanning locations if needed
  if (Array.isArray(storeConfig?.items) && storeConfig.items.length) {
    return storeConfig.items.map((x) => String(x).toLowerCase());
  }

  const rows = Array.isArray(storeConfig?.locations) ? storeConfig.locations : [];
  const set = new Set();
  for (const row of rows) {
    const cells = Array.isArray(row) ? row : (Array.isArray(row?.cells) ? row.cells : []);
    for (const cell of cells) {
      const v = String(cell || "").trim().toLowerCase();
      if (!v || v === "entrance") continue;
      set.add(v);
    }
  }
  return [...set];
}

// Randomly picks distinct item names from the candidate item list.
function pickDistinctItems(items = [], count = 2) {
  const pool = [...items];
  const out = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = randomInt(0, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

// Normalizes shared ID base names by stripping known suffixes and separators.
function normalizeIdBase(base = "") {
  return String(base || "").trim()
    .replace(/\.json$/i, "")
    .replace(/(Scenarios|Scenario|Orders|Order|Optimal)$/i, "")
    .replace(/[_-]+$/g, "");
}

// Reads whether a scenario dataset already exists in Firebase.
async function datasetExists(datasetName = "") {
  return Boolean(await fetchScenarioDatasetBundle(datasetName));
}

// Resolves a stable order ID prefix from context or explicit override.
function resolveOrderIdPrefix(context = {}, explicitPrefix = "") {
  const base = String(
    explicitPrefix ||
    context.orderIdPrefix ||
    context.datasetName ||
    context.ordersId ||
    context.orderDatasetId ||
    context.scenarioSetId ||
    "order"
  ).trim();
  const normalized = normalizeIdBase(base);
  return `${normalized}Order`;
}

// Recursively generates all combinations of a target size.
function combine(source, targetSize, startIdx, path, out) {
  // Reached target size -> push one bundle (array of orders)
  if (path.length === targetSize) {
    out.push([...path]);
    return;
  }

  // Prune: ensure enough elements remain to fill targetSize
  for (let i = startIdx; i <= source.length - (targetSize - path.length); i += 1) {
    path.push(source[i]);
    combine(source, targetSize, i + 1, path, out);
    path.pop();
  }
}

// Generates all permutations for a small array (max bundle is <= 4).
function permutations(source = []) {
  const arr = Array.isArray(source) ? source : [];
  if (arr.length <= 1) return [arr];

  const out = [];
  const used = new Array(arr.length).fill(false);
  const path = [];

  function dfs() {
    if (path.length === arr.length) {
      out.push([...path]);
      return;
    }
    for (let i = 0; i < arr.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      path.push(arr[i]);
      dfs();
      path.pop();
      used[i] = false;
    }
  }

  dfs();
  return out;
}

// Scores all delivery sequences for one bundle and keeps the best one.
function scoreBundleBestSequence(bundle = [], context = {}) {
  const sequenceCandidates = permutations(bundle);
  let best = null;

  for (const sequence of sequenceCandidates) {
    const scored = computeBundleScore(sequence, context);
    if (!best || (Number(scored?.score) || 0) > (Number(best?.score) || 0)) {
      best = {
        ...scored,
        bundleIds: sequence.map((o) => o?.id ?? "")
      };
    }
  }

  return best || {
    score: 0,
    totalPay: 0,
    totalTime: 0,
    endingCity: context.currentCity ?? "",
    perOrder: [],
    bundleIds: []
  };
}

// Resolves a stable scenario ID prefix from context.
function resolveScenarioIdPrefix(context = {}) {
  const base = String(
    context.scenarioIdPrefix ||
    context.datasetName ||
    context.scenarioSetId ||
    "scenario"
  ).trim();
  const normalized = normalizeIdBase(base);
  return `${normalized}Scenario`;
}

// Validates whether input already matches serializeScenarioOutput() payload shape.
function isSerializedPayload(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.orders &&
    value.scenarios &&
    value.optimal
  );
}

// Normalizes dataset/doc IDs to safe Firebase document names.
function normalizeDatasetName(value = "") {
  return String(value || "")
    .trim()
    .replace(/\.json$/i, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

// Converts configured dataset IDs to a shared grouped document root name.
function resolveDatasetRootName(value = "") {
  return normalizeDatasetName(value)
    .replace(/(Scenarios|Orders|Optimal)(?=_|$)/ig, "")
    .replace(/(_scenarios|_orders|_optimal)$/i, "")
    .replace(/__+/g, "_")
    .replace(/^_|_$/g, "");
}

// Keeps only approved metadata keys and validates numeric constraints when present.
function sanitizeGenerationMetadata(metadata = {}) {
  const cleaned = {};

  const datasetName = String(metadata.datasetName ?? metadata.name ?? "").trim();
  if (datasetName) cleaned.datasetName = datasetName;

  const totalRounds = Number(metadata.totalRounds);
  if (Number.isFinite(totalRounds) && totalRounds > 0) cleaned.totalRounds = Math.floor(totalRounds);

  const maxBundle = Number(metadata.maxBundle);
  if (Number.isFinite(maxBundle) && maxBundle > 0) cleaned.maxBundle = Math.floor(maxBundle);

  const payMin = Number(metadata.payMin);
  if (Number.isFinite(payMin)) cleaned.payMin = payMin;

  const payMax = Number(metadata.payMax);
  if (Number.isFinite(payMax)) cleaned.payMax = payMax;

  // Verify numeric fields only when all are present.
  if (Number.isFinite(cleaned.payMin) && Number.isFinite(cleaned.payMax)) {
    if (cleaned.payMax <= cleaned.payMin) {
      throw new Error("Invalid metadata: payMax must be greater than payMin.");
    }
  }

  return cleaned;
}

function validatePipelineInputs(input = {}) {
  const name = String(input.datasetName || "").trim();
  if (!name) throw new Error("datasetName is required.");

  const totalRounds = Number(input.totalRounds);
  if (!Number.isFinite(totalRounds) || totalRounds <= 1) {
    throw new Error("totalRounds must be greater than 1.");
  }

  const ordersPerScenario = 4;
  const maxBundle = Number(input.maxBundle);
  if (!Number.isFinite(maxBundle) || maxBundle < 1) {
    throw new Error("maxBundle must be >= 1.");
  }
  if (maxBundle > ordersPerScenario) {
    throw new Error(`maxBundle must be <= ordersPerScenario (${ordersPerScenario}).`);
  }

  const payMin = Number(input.payMin);
  const payMax = Number(input.payMax);

  if (!Number.isFinite(payMin) || !Number.isFinite(payMax) || payMax <= payMin) {
    throw new Error("Invalid pay range: payMax must be greater than payMin.");
  }
  const minimumPayRange = 8;
  if ((payMax - payMin) < minimumPayRange) {
    throw new Error(`payMax - payMin must be at least ${minimumPayRange}.`);
  }
}

async function assertDatasetNameAvailable(datasetName) {
  const name = String(datasetName || "").trim();
  if (!name) throw new Error("datasetName is required.");

  if (await datasetExists(name)) {
    throw new Error(`datasetName "${name}" already exists. Choose a new name.`);
  }
}

// Optional helper for UI pre-validation in admin dashboard.
export async function validateGenerationOptionsForAdmin(options = {}) {
  try {
    const normalizedDataset = resolveDatasetRootName(options.datasetName || "");
    const alreadyExists = await datasetExists(normalizedDataset);

    validatePipelineInputs({
      ...options,
      datasetName: normalizedDataset
    });

    if (alreadyExists) {
      return { ok: false, error: `datasetName "${normalizedDataset}" already exists.` };
    }
    return { ok: true, normalizedDataset, ordersPerScenario: 4 };
  } catch (err) {
    return { ok: false, error: err?.message || "Invalid generation options." };
  }
}



// Algorithm Methods
// Estimates base completion time for one order (local travel + item pick only).
function estimateBaseOrderTime(order, context = {}) {
  const localTravel = estimateLocalTravelTime();
  const pickItem = estimatePickItemTime(order, context);
  return localTravel + pickItem;
}

// Estimates runtime completion time by adding cross-city travel from current city.
function estimateOrderCompletionTime(order, context = {}) {
  // Prefer stored base estimate when available to keep scoring deterministic.
  const storedBase = Number(order?.estimatedTime);
  const baseTime = Number.isFinite(storedBase) && storedBase > 0
    ? storedBase
    : estimateBaseOrderTime(order, context);

  const currentCity = context.currentCity ?? context.playerCity ?? "";
  const extraCrossCity = crossCityExtraTime(order?.city, currentCity, context);

  return baseTime + extraCrossCity;
}

// Builds one synthetic order with generated city/store/items/earnings/time.
function createOrderModel(context = {}) {
  const {
    scenarioIndex = 1, // 1-based
    orderIndex = 1, // 1-based global or per scenario
    orderIdPrefix = "",
    storeDataset = {},
    citiesDataset = {},
    forcedCity = "",
    forceRandomCity = false,
    payMin = 8,
    payMax = 24
  } = context;

  const cities = getCitiesFromTravelTimes(citiesDataset);
  const fallbackCity = cities[0] || "Berkeley";

  // Odd scenario: random city
  // Even scenario: anchor to startinglocation (or any fixed city you want)
  const fixedCity = citiesDataset?.startinglocation || fallbackCity;
  const chosenCity = forcedCity
    ? String(forcedCity)
    : forceRandomCity
    ? (pickRandom(cities) || fallbackCity)
    : (scenarioIndex % 2 === 1)
    ? (pickRandom(cities) || fallbackCity)
    : fixedCity;

  // Pick store from chosen city
  const candidateStores = getStoresInCity(storeDataset, chosenCity);
  const chosenStoreConfig = pickRandom(candidateStores) || pickRandom(storeDataset?.stores || []) || {};
  const chosenStore = String(chosenStoreConfig?.store || "");

  // Pick 2-3 distinct items
  const availableItems = getStoreItems(chosenStoreConfig);
  const itemCount = randomInt(2, 3);
  const selectedItems = pickDistinctItems(availableItems, itemCount);

  // Build items object with random qty
  const items = {};
  for (const item of selectedItems) {
    items[item] = randomInt(1, 3);
  }

  const order = {
    id: String(`${resolveOrderIdPrefix(context, orderIdPrefix)}${orderIndex}`),
    city: String(chosenCity),
    store: String(chosenStore),
    items,
    earnings: randomInt(payMin, payMax),
    estimatedTime: 0
  };

  // Store only base estimate (local + pick). Cross-city is runtime/simulation-dependent.
  if (!order.estimatedTime || !Number.isFinite(order.estimatedTime)) {
    order.estimatedTime = estimateBaseOrderTime(order, {
      ...context,
      citiesDataset,
      storeDataset
    });
  }

  return order;
}

// Enumerates all order bundles of size 1..kMax.
function enumerateBundles(orders = [], kMax = 3) {
  const source = Array.isArray(orders) ? orders : [];
  const n = source.length;

  // Clamp bundle size to valid range
  const maxSize = Math.max(1, Math.min(Number(kMax) || 1, n));
  const bundles = [];

  // Build all combinations for size = 1..maxSize
  for (let size = 1; size <= maxSize; size += 1) {
    combine(source, size, 0, [], bundles);
  }

  // Gameplay rule consistency:
  // Bundles with more than 1 order must all come from the same store.
  return bundles.filter((bundle) => {
    if (!Array.isArray(bundle) || bundle.length <= 1) return true;
    const firstStore = String(bundle[0]?.store || "");
    return bundle.every((order) => String(order?.store || "") === firstStore);
  });
}

// Computes score and summary metrics for a single bundle.
function computeBundleScore(bundle = [], context = {}) {
  // Empty bundle => zero score
  if (!Array.isArray(bundle) || bundle.length === 0) {
    return {
      score: 0,
      totalPay: 0,
      totalTime: 0,
      endingCity: context.currentCity ?? "",
      perOrder: []
    };
  }

  // Simulated player location while executing this bundle in order
  let simulatedCity = String(context.currentCity ?? context.playerCity ?? "");

  let totalPay = 0;
  let totalTime = 0;
  const perOrder = [];

  for (const order of bundle) {
    const pay = Number(order?.earnings) || 0;
    const orderTime = estimateOrderCompletionTime(order, {
      ...context,
      currentCity: simulatedCity
    });

    totalPay += pay;
    totalTime += orderTime;

    perOrder.push({
      id: order?.id ?? "",
      city: order?.city ?? "",
      pay,
      orderTime
    });

    // After completing this order, player ends at order city
    if (order?.city) simulatedCity = String(order.city);
  }

  const discounted = applySharedItemBundleSavings(
    bundle,
    perOrder.map((entry) => Number(entry?.orderTime) || 0),
    { storeDataset: context?.storeDataset || {} }
  );
  const effectiveTotalTime = discounted.discountedTotalTime;

  // Avoid divide by zero
  const safeTime = effectiveTotalTime > 0 ? effectiveTotalTime : 1e-9;
  const score = totalPay / safeTime;

  return {
    score,
    totalPay,
    totalTime: effectiveTotalTime,
    endingCity: simulatedCity,
    perOrder
  };
}

// Solves all candidate bundles and returns best/second plus scoring diagnostics.
function solveBestAndSecondBundle(orders = [], context = {}) {
  const maxBundle = Number(context.maxBundle ?? context.kMax ?? 3);

  // 1) Generate all candidate bundles
  const bundles = enumerateBundles(orders, maxBundle);
  if (bundles.length === 0) {
    return {
      best: null,
      second: null,
      bestScore: 0,
      secondScore: 0
    };
  }

  // 2) Score each bundle once (avoid re-scoring randomness)
  const scored = bundles.map((bundle) => {
    const scoreResult = scoreBundleBestSequence(bundle, context);
    return {
      bundle,
      ...scoreResult
    };
  });

  // 3) Rank by raw score (highest first)
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  const bestScore = Number(scored[0]?.score) || 0;
  const secondScore = Number(scored[1]?.score) || 0;
  const best = scored[0] ?? null;
  const second = scored[1] ?? null;

  return {
    best,
    second,
    bestScore,
    secondScore
  };
}

// Generates one candidate scenario case and solves its bundles.
function generateCandidateCase(context = {}) {
  const {
    scenarioIndex = 1,
    ordersPerScenario = 4,
    startOrderIndex = 1,
    orderIdPrefix = "",
    maxBundle = 3,
    storeDataset = {},
    citiesDataset = {},
    targetCity = "",
    forcedCity = ""
  } = context;

  const count = Math.max(1, Number(ordersPerScenario) || 1);
  const orders = [];
  const cities = getCitiesFromTravelTimes(citiesDataset);
  const cityAssignments = buildCityAssignments({
    count,
    cities,
    storeDataset,
    targetCity,
    forcedCity
  });

  for (let i = 0; i < count; i += 1) {
    const order = createOrderModel({
      ...context,
      scenarioIndex,
      orderIndex: startOrderIndex + i,
      orderIdPrefix,
      forcedCity: cityAssignments[i] || ""
    });
    orders.push(order);
  }

  const solution = solveBestAndSecondBundle(orders, {
    ...context,
    maxBundle
  });

  return {
    scenarioIndex,
    orders,
    solution
  };
}

// Generates a case while preserving the requested city-targeting rule.
function generateCaseWithCityTarget(context = {}) {
  const {
    scenarioIndex = 1,
    ordersPerScenario = 4,
    startOrderIndex = 1,
    maxAttempts = 200
  } = context;
  const targetCity = String(context.targetCity || "").trim();
  const mustEnforceTargetCity = targetCity && hasStoresInCity(context?.storeDataset || {}, targetCity);
  let lastCase = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidateCase = generateCandidateCase({
      ...context,
      scenarioIndex,
      ordersPerScenario,
      startOrderIndex
    });
    lastCase = candidateCase;

    if (mustEnforceTargetCity) {
      const hasTargetCityOrder = candidateCase?.orders?.some((o) => String(o?.city || "") === targetCity);
      if (!hasTargetCityOrder) continue;
      const endingCity = String(candidateCase?.solution?.best?.endingCity || "");
      if (endingCity !== targetCity) continue;
    }

    return candidateCase;
  }

  return lastCase || generateCandidateCase({
    ...context,
    scenarioIndex,
    ordersPerScenario,
    startOrderIndex
  });
}

// Builds the persisted round/scenario shape from a matched case.
function buildScenarioRound(caseResult, context = {}) {
  const round = Number(context.round ?? context.scenarioIndex ?? caseResult?.scenarioIndex ?? 1);
  const maxBundle = Number(context.maxBundle ?? context.kMax ?? 3);
  const scenarioId = String(
    context.scenarioId ||
    caseResult?.scenario_id ||
    `${resolveScenarioIdPrefix(context)}${round}`
  );

  const orders = Array.isArray(caseResult?.orders) ? caseResult.orders : [];
  const orderIds = orders.map((o) => String(o?.id ?? "")).filter(Boolean);

  const bestBundleIds = Array.isArray(caseResult?.solution?.best?.bundleIds)
    ? caseResult.solution.best.bundleIds.map((id) => String(id ?? "")).filter(Boolean)
    : [];
  const secondBestBundleIds = Array.isArray(caseResult?.solution?.second?.bundleIds)
    ? caseResult.solution.second.bundleIds.map((id) => String(id ?? "")).filter(Boolean)
    : [];

  return {
    orders: orders.map((order = {}) => ({
      id: String(order.id ?? ""),
      city: String(order.city ?? ""),
      store: String(order.store ?? ""),
      items: order.items && typeof order.items === "object" ? { ...order.items } : {},
      earnings: Number(order.earnings) || 0,
      estimatedTime: Number(order.estimatedTime) || 0
    })),
    scenario: {
      round,
      scenario_id: scenarioId,
      max_bundle: maxBundle,
      order_ids: orderIds
    },
    optimal: {
      scenario_id: scenarioId,
      best_bundle_ids: bestBundleIds,
      second_best_bundle_ids: secondBestBundleIds,
      ending_city_best: String(caseResult?.solution?.best?.endingCity ?? "")
    }
  };
}

// Serializes generated scenarios and metadata for storage/output.
function serializeScenarioOutput(scenarios = [], metadata = {}) {
  const rounds = Array.isArray(scenarios) ? scenarios : [];

  const allOrders = [];
  const allScenarios = [];
  const allOptimal = [];

  for (const roundResult of rounds) {
    if (!roundResult) continue;
    if (Array.isArray(roundResult.orders)) allOrders.push(...roundResult.orders);
    if (roundResult.scenario) allScenarios.push(roundResult.scenario);
    if (roundResult.optimal) allOptimal.push(roundResult.optimal);
  }

  allScenarios.sort((a, b) => (Number(a?.round) || 0) - (Number(b?.round) || 0));

  return {
    orders: { orders: allOrders },
    scenarios: { scenarios: allScenarios },
    optimal: { optimal: allOptimal },
    metadata: { ...metadata }
  };
}

// Persists generated scenario set to Firebase MasterData.
async function saveGeneratedScenarioSet(scenarios = [], scenarioSetId = "experiment", options = {}) {
  const serialized = isSerializedPayload(scenarios)
    ? scenarios
    : serializeScenarioOutput(scenarios, options.metadata ?? {});

  const datasetName = normalizeDatasetName(options.datasetName || scenarioSetId || "dataset");
  const datasetRoot = resolveDatasetRootName(datasetName);

  const ordersArray = Array.isArray(serialized?.orders?.orders) ? serialized.orders.orders : [];
  const scenariosArray = Array.isArray(serialized?.scenarios?.scenarios) ? serialized.scenarios.scenarios : [];
  const optimalArray = Array.isArray(serialized?.optimal?.optimal) ? serialized.optimal.optimal : [];
  const metadata = sanitizeGenerationMetadata(
    serialized?.metadata && typeof serialized.metadata === "object" ? serialized.metadata : {}
  );

  await saveScenarioDatasetBundle(datasetRoot, {
    scenarios: scenariosArray,
    orders: ordersArray,
    optimal: optimalArray,
    metadata
  });

  return {
    saved: true,
    datasetName: datasetRoot,
    docs: {
      grouped: datasetRoot,
      orders: null,
      scenarios: null,
      optimal: null
    },
    counts: {
      orders: ordersArray.length,
      scenarios: scenariosArray.length,
      optimal: optimalArray.length
    }
  };
}

// High-level orchestration entry point for full generation pipeline (to be implemented).
export async function runScenarioGenerationPipeline(options = {}) {
  const FIXED_ORDERS_PER_SCENARIO = 4;
  const {
    datasetName = "experiment",
    totalRounds = 10,
    maxBundle = 3,
    payMin = 8,
    payMax = 24,
    scenarioSetId = datasetName
  } = options;

  const normalizedDataset = resolveDatasetRootName(datasetName);
  const normalizedInput = {
    datasetName: normalizedDataset,
    totalRounds,
    maxBundle,
    payMin,
    payMax,
    ordersPerScenario: FIXED_ORDERS_PER_SCENARIO
  };

  validatePipelineInputs(normalizedInput);
  await assertDatasetNameAvailable(normalizedDataset);
  const resolvedScenarioSetId = scenarioSetId || normalizedDataset;

  const storeDataset = await fetchStoreDataset("store");
  const citiesDataset = await fetchCitiesDataset("cities");
  const roundOutputs = [];
  let nextOrderIndex = 1;
  let currentCity = String(citiesDataset?.startinglocation || "Berkeley");
  let previousBestCity = currentCity;
  const allCities = getCitiesFromTravelTimes(citiesDataset);
  const targetCityCount = Object.fromEntries(allCities.map((city) => [city, 0]));

  for (let round = 1; round <= Number(totalRounds); round += 1) {
    const isEvenRoundAfterFirst = round % 2 === 0;
    const targetCity = isEvenRoundAfterFirst
      ? ""
      : selectFairTargetCity(allCities, targetCityCount, previousBestCity);
    if (targetCity) {
      targetCityCount[targetCity] = (Number(targetCityCount[targetCity]) || 0) + 1;
    }
    const forcedCity = isEvenRoundAfterFirst ? previousBestCity : "";

    const caseResult = generateCaseWithCityTarget({
      scenarioIndex: round,
      startOrderIndex: nextOrderIndex,
      ordersPerScenario: FIXED_ORDERS_PER_SCENARIO,
      maxBundle,
      payMin,
      payMax,
      targetCity,
      forcedCity,
      forceRandomCity: !isEvenRoundAfterFirst,
      currentCity,
      storeDataset,
      citiesDataset,
      datasetName: normalizedDataset,
      scenarioSetId: resolvedScenarioSetId
    });

    const scenarioRound = buildScenarioRound(caseResult, {
      round,
      maxBundle,
      datasetName: normalizedDataset,
      scenarioSetId: resolvedScenarioSetId
    });

    roundOutputs.push(scenarioRound);
    nextOrderIndex += FIXED_ORDERS_PER_SCENARIO;
    currentCity = scenarioRound?.optimal?.ending_city_best || currentCity;
    previousBestCity = currentCity;
  }

  const metadata = {
    datasetName: normalizedDataset,
    totalRounds: Number(totalRounds),
    maxBundle: Number(maxBundle),
    payMin: Number(payMin),
    payMax: Number(payMax)
  };

  const serialized = serializeScenarioOutput(roundOutputs, metadata);
  const saved = await saveGeneratedScenarioSet(serialized, normalizedDataset, {
    datasetName: normalizedDataset,
    metadata
  });

  return {
    ok: true,
    datasetName: normalizedDataset,
    generated: {
      rounds: roundOutputs.length,
      orders: serialized?.orders?.orders?.length || 0,
      optimal: serialized?.optimal?.optimal?.length || 0
    },
    saved
  };
}
