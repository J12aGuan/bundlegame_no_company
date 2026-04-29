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
import {
  BUNDLEGAME_STUDY_PROTOCOL_VERSION,
  BUNDLEGAME_STUDY_TOTAL_ROUNDS,
  getCanonicalResearchStudyProtocol,
  resolveProtocolPhaseForRound
} from "../researchStudy.js";

export {
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchScenarioDatasetBundle,
  estimateLocalTravelTime,
  estimatePickItemTime,
  crossCityExtraTime
};

const GENERATOR_SCHEMA_VERSION = "bundlegame_scenario_generator_v2";
const REWARD_MODEL_VERSION = "route_aware_pay_per_second_v2";
const ROUTE_OPTIMIZER_VERSION = "exhaustive_permutation_v1";
const LEGAL_BUNDLE_MODEL_VERSION = "same_store_multi_order_v1";
const DEFAULT_GENERATION_SEED = "bundlegame-default-seed";

// Helper methods
function hashSeed(seed = "") {
  const input = String(seed || DEFAULT_GENERATION_SEED);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed = DEFAULT_GENERATION_SEED) {
  let state = hashSeed(seed) || 1;
  return function seededRandom() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getRng(context = {}) {
  return typeof context?.rng === "function" ? context.rng : Math.random;
}

// Returns a random integer in the inclusive range [min, max].
function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Returns one random element from an array, or null for empty input.
function pickRandom(arr = [], rng = Math.random) {
  if (!arr.length) return null;
  return arr[randomInt(0, arr.length - 1, rng)];
}

// Shuffles a copy of an array.
function shuffle(arr = [], rng = Math.random) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i, rng);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Picks one entry from weighted candidates: [{ value, weight }].
function pickWeighted(candidates = [], rng = Math.random) {
  const valid = (Array.isArray(candidates) ? candidates : [])
    .filter((c) => c && Number(c.weight) > 0);
  if (!valid.length) return null;

  const total = valid.reduce((sum, c) => sum + Number(c.weight || 0), 0);
  if (total <= 0) return valid[0]?.value ?? null;

  let roll = rng() * total;
  for (const item of valid) {
    roll -= Number(item.weight || 0);
    if (roll <= 0) return item.value;
  }
  return valid[valid.length - 1]?.value ?? null;
}

// Fair target-city selector for odd rounds:
// least-used cities first, then weighted preference for reference city.
function selectFairTargetCity(cities = [], targetCityCount = {}, referenceCity = "", rng = Math.random) {
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

  return String(pickWeighted(weighted, rng) || candidateCities[0] || uniqueCities[0] || "");
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
  forcedCity = "",
  rng = Math.random
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
  const primary = target && validCities.includes(target) ? target : (pickRandom(validCities, rng) || validCities[0]);
  const secondaryPool = validCities.filter((c) => c !== primary);
  const secondary = secondaryPool.length ? (pickRandom(secondaryPool, rng) || secondaryPool[0]) : "";

  if (!secondary) {
    return new Array(count).fill(primary);
  }

  // For 4 orders, use either 2/2 or 3/1 split to encourage bundle opportunities.
  let primaryCount = count;
  if (count >= 4) {
    primaryCount = pickRandom([2, 3], rng);
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
  return shuffle(assignments, rng);
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
function pickDistinctItems(items = [], count = 2, rng = Math.random) {
  const pool = [...items];
  const out = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = randomInt(0, pool.length - 1, rng);
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

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function createScenarioSetVersionId(datasetName = "", now = new Date()) {
  const normalizedDataset = normalizeDatasetName(datasetName || "dataset") || "dataset";
  const date = now instanceof Date ? now : new Date();
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hour = padDatePart(date.getHours());
  const minute = padDatePart(date.getMinutes());
  const second = padDatePart(date.getSeconds());
  return `${normalizedDataset}_${year}_${month}_${day}_${hour}_${minute}_${second}`;
}

// Keeps only approved metadata keys and validates numeric constraints when present.
function sanitizeGenerationMetadata(metadata = {}) {
  const cleaned = {};

  const datasetName = String(metadata.datasetName ?? metadata.name ?? "").trim();
  if (datasetName) cleaned.datasetName = datasetName;

  const scenarioSetVersionId = String(metadata.scenarioSetVersionId ?? "").trim();
  if (scenarioSetVersionId) cleaned.scenarioSetVersionId = scenarioSetVersionId;

  const totalRounds = Number(metadata.totalRounds);
  if (Number.isFinite(totalRounds) && totalRounds > 0) cleaned.totalRounds = Math.floor(totalRounds);

  const maxBundle = Number(metadata.maxBundle);
  if (Number.isFinite(maxBundle) && maxBundle > 0) cleaned.maxBundle = Math.floor(maxBundle);

  const seed = String(metadata.seed ?? "").trim();
  if (seed) cleaned.seed = seed;

  const generatorSchemaVersion = String(metadata.generatorSchemaVersion ?? metadata.generator_schema_version ?? "").trim();
  cleaned.generatorSchemaVersion = generatorSchemaVersion || GENERATOR_SCHEMA_VERSION;

  const rewardModelVersion = String(metadata.rewardModelVersion ?? metadata.reward_model_version ?? "").trim();
  cleaned.rewardModelVersion = rewardModelVersion || REWARD_MODEL_VERSION;

  const routeOptimizerVersion = String(metadata.routeOptimizerVersion ?? metadata.route_optimizer_version ?? "").trim();
  cleaned.routeOptimizerVersion = routeOptimizerVersion || ROUTE_OPTIMIZER_VERSION;

  const legalBundleModelVersion = String(metadata.legalBundleModelVersion ?? metadata.legal_bundle_model_version ?? "").trim();
  cleaned.legalBundleModelVersion = legalBundleModelVersion || LEGAL_BUNDLE_MODEL_VERSION;

  const protocolVersion = String(metadata.protocolVersion ?? metadata.protocol_version ?? "").trim();
  cleaned.protocol_version = protocolVersion || BUNDLEGAME_STUDY_PROTOCOL_VERSION;

  const expectedTotalRounds = Number(metadata.expectedTotalRounds ?? metadata.expected_total_rounds);
  cleaned.expected_total_rounds = Number.isFinite(expectedTotalRounds) && expectedTotalRounds > 0
    ? Math.floor(expectedTotalRounds)
    : BUNDLEGAME_STUDY_TOTAL_ROUNDS;

  const generatedAt = String(metadata.generatedAt ?? metadata.generated_at ?? "").trim();
  if (generatedAt) cleaned.generatedAt = generatedAt;

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
  if (Math.floor(totalRounds) !== BUNDLEGAME_STUDY_TOTAL_ROUNDS) {
    throw new Error(`totalRounds must be ${BUNDLEGAME_STUDY_TOTAL_ROUNDS} for the active research protocol.`);
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

  if (input.seed != null && typeof input.seed !== "string" && typeof input.seed !== "number") {
    throw new Error("seed must be blank or a string/number value.");
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
  const localTravel = Number(order?.localTravelTime) || 0;
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

function estimateGeneratedLocalTravelTime(rng = Math.random) {
  return randomInt(2, 6, rng);
}

function findStoreConfig(storeDataset = {}, storeName = "") {
  const stores = Array.isArray(storeDataset?.stores) ? storeDataset.stores : [];
  return stores.find((store) => String(store?.store || "") === String(storeName || "")) || null;
}

function routeExistsBetweenCities(fromCity = "", toCity = "", context = {}) {
  const origin = String(fromCity || "").trim();
  const destination = String(toCity || "").trim();
  if (!origin || !destination || origin === destination) return true;
  const cityTravelTimes = context.citiesDataset?.travelTimes ?? {};
  const direct = Number(cityTravelTimes?.[origin]?.[destination]);
  if (Number.isFinite(direct) && direct > 0) return true;

  const distanceTable = context.storeDataset?.distances ?? {};
  const fromRow = distanceTable[origin];
  const destinations = Array.isArray(fromRow?.destinations) ? fromRow.destinations : [];
  const times = Array.isArray(fromRow?.distances) ? fromRow.distances : [];
  const idx = destinations.indexOf(destination);
  return idx >= 0 && Number.isFinite(Number(times[idx])) && Number(times[idx]) > 0;
}

function normalizeIdList(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  )];
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
  const rng = getRng(context);

  const cities = getCitiesFromTravelTimes(citiesDataset);
  const fallbackCity = cities[0] || "Berkeley";

  // Odd scenario: random city
  // Even scenario: anchor to startinglocation (or any fixed city you want)
  const fixedCity = citiesDataset?.startinglocation || fallbackCity;
  const chosenCity = forcedCity
    ? String(forcedCity)
    : forceRandomCity
    ? (pickRandom(cities, rng) || fallbackCity)
    : (scenarioIndex % 2 === 1)
    ? (pickRandom(cities, rng) || fallbackCity)
    : fixedCity;

  // Pick store from chosen city
  const candidateStores = getStoresInCity(storeDataset, chosenCity);
  const chosenStoreConfig = pickRandom(candidateStores, rng) || pickRandom(storeDataset?.stores || [], rng) || {};
  const chosenStore = String(chosenStoreConfig?.store || "");

  // Pick 2-3 distinct items
  const availableItems = getStoreItems(chosenStoreConfig);
  const itemCount = randomInt(2, 3, rng);
  const selectedItems = pickDistinctItems(availableItems, itemCount, rng);

  // Build items object with random qty
  const items = {};
  for (const item of selectedItems) {
    items[item] = randomInt(1, 3, rng);
  }

  const order = {
    id: String(`${resolveOrderIdPrefix(context, orderIdPrefix)}${orderIndex}`),
    city: String(chosenCity),
    store: String(chosenStore),
    items,
    earnings: randomInt(payMin, payMax, rng),
    estimatedTime: 0,
    localTravelTime: 0
  };

  order.localTravelTime = estimateGeneratedLocalTravelTime(rng);

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

export function getBundleLegality(bundle = []) {
  if (!Array.isArray(bundle) || bundle.length === 0) {
    return { legal: false, reason: "empty_bundle" };
  }
  if (bundle.length <= 1) return { legal: true, reason: "single_order" };
  const firstStore = String(bundle[0]?.store || "");
  if (!firstStore) return { legal: false, reason: "missing_store" };
  const sameStore = bundle.every((order) => String(order?.store || "") === firstStore);
  return sameStore
    ? { legal: true, reason: "same_store_multi_order" }
    : { legal: false, reason: "multi_store_bundle" };
}

// Enumerates all legal order bundles of size 1..kMax without scoring them.
export function enumerateLegalBundles(orders = [], kMax = 3) {
  const source = Array.isArray(orders) ? orders : [];
  const n = source.length;

  // Clamp bundle size to valid range
  const maxSize = Math.max(1, Math.min(Number(kMax) || 1, n));
  const bundles = [];

  // Build all combinations for size = 1..maxSize
  for (let size = 1; size <= maxSize; size += 1) {
    combine(source, size, 0, [], bundles);
  }

  return bundles
    .map((bundle) => ({
      bundle,
      legality: getBundleLegality(bundle)
    }))
    .filter((entry) => entry.legality.legal);
}

function buildUncertaintyFlags({ sequence = [], perOrder = [], context = {} } = {}) {
  const flags = [];
  const currentCity = String(context.currentCity ?? context.playerCity ?? "");
  if (!currentCity) flags.push("missing_start_city");
  for (const order of sequence) {
    if (!order?.city) flags.push(`missing_city:${order?.id || "unknown"}`);
    if (!order?.store) flags.push(`missing_store:${order?.id || "unknown"}`);
    if (!findStoreConfig(context.storeDataset || {}, order?.store)) {
      flags.push(`missing_store_config:${order?.store || "unknown"}`);
    }
  }
  for (const row of perOrder) {
    if (row.routeMissing) flags.push(`missing_city_route:${row.fromCity}->${row.toCity}`);
    if (row.pickTimeSeconds <= 0 && Object.keys(row.items || {}).length > 0) {
      flags.push(`missing_pick_time:${row.id}`);
    }
  }
  return normalizeIdList(flags);
}

// Scores one concrete delivery sequence. Route optimisation happens outside this function.
function scoreBundleSequence(sequence = [], context = {}) {
  // Empty bundle => zero score
  if (!Array.isArray(sequence) || sequence.length === 0) {
    return {
      score: 0,
      totalEarnings: 0,
      totalTimeSeconds: 0,
      travelTimeSeconds: 0,
      localTravelTimeSeconds: 0,
      crossCityTravelTimeSeconds: 0,
      pickTimeSeconds: 0,
      effectivePickTimeSeconds: 0,
      sharedItemSavingsSeconds: 0,
      endingCity: context.currentCity ?? "",
      perOrder: [],
      uncertaintyFlags: ["empty_bundle"]
    };
  }

  // Simulated player location while executing this bundle in order
  let simulatedCity = String(context.currentCity ?? context.playerCity ?? "");

  let totalEarnings = 0;
  let localTravelTimeSeconds = 0;
  let crossCityTravelTimeSeconds = 0;
  let pickTimeSeconds = 0;
  const perOrder = [];

  for (const order of sequence) {
    const pay = Number(order?.earnings) || 0;
    const fromCity = simulatedCity;
    const toCity = String(order?.city || "");
    const crossCitySeconds = crossCityExtraTime(toCity, fromCity, context);
    const localSeconds = Math.max(0, Number(order?.localTravelTime) || 0);
    const storedBase = Number(order?.estimatedTime);
    const estimatedPickSeconds = Math.max(0, Number(estimatePickItemTime(order, context)) || 0);
    const pickSeconds = Number.isFinite(storedBase) && storedBase > 0
      ? Math.max(0, storedBase - localSeconds)
      : estimatedPickSeconds;
    const orderTime = crossCitySeconds + localSeconds + pickSeconds;

    totalEarnings += pay;
    localTravelTimeSeconds += localSeconds;
    crossCityTravelTimeSeconds += crossCitySeconds;
    pickTimeSeconds += pickSeconds;

    perOrder.push({
      id: order?.id ?? "",
      fromCity,
      toCity,
      city: toCity,
      store: order?.store ?? "",
      items: order?.items && typeof order.items === "object" ? { ...order.items } : {},
      pay,
      earnings: pay,
      localTravelTimeSeconds: localSeconds,
      crossCityTravelTimeSeconds: crossCitySeconds,
      pickTimeSeconds: pickSeconds,
      orderTimeSeconds: orderTime,
      routeMissing: !routeExistsBetweenCities(fromCity, toCity, context)
    });

    // After completing this order, player ends at order city
    if (order?.city) simulatedCity = String(order.city);
  }

  const discounted = applySharedItemBundleSavings(
    sequence,
    perOrder.map((entry) => Number(entry?.orderTimeSeconds) || 0),
    { storeDataset: context?.storeDataset || {} }
  );
  const sharedItemSavingsSeconds = Math.max(0, Number(discounted.savingsSeconds) || 0);
  const effectiveTotalTime = Math.max(0, Number(discounted.discountedTotalTime) || 0);
  const effectivePickTimeSeconds = Math.max(0, pickTimeSeconds - sharedItemSavingsSeconds);
  const travelTimeSeconds = localTravelTimeSeconds + crossCityTravelTimeSeconds;

  // Avoid divide by zero
  const safeTime = effectiveTotalTime > 0 ? effectiveTotalTime : 1e-9;
  const score = totalEarnings / safeTime;
  const uncertaintyFlags = buildUncertaintyFlags({ sequence, perOrder, context });

  return {
    score,
    totalPay: totalEarnings,
    totalEarnings,
    totalTime: effectiveTotalTime,
    totalTimeSeconds: effectiveTotalTime,
    travelTimeSeconds,
    localTravelTimeSeconds,
    crossCityTravelTimeSeconds,
    pickTimeSeconds,
    effectivePickTimeSeconds,
    sharedItemSavingsSeconds,
    endingCity: simulatedCity,
    perOrder,
    uncertaintyFlags
  };
}

// Scores all delivery sequences for one bundle and keeps the route-optimised one.
function scoreBundleBestSequence(bundle = [], context = {}) {
  const sequenceCandidates = permutations(bundle);
  let best = null;

  for (const sequence of sequenceCandidates) {
    const scored = scoreBundleSequence(sequence, context);
    const bundleIds = bundle.map((order) => String(order?.id ?? "")).filter(Boolean);
    const sequenceIds = sequence.map((order) => String(order?.id ?? "")).filter(Boolean);
    const candidate = {
      ...scored,
      bundle,
      bundleIds,
      sequenceIds
    };
    if (!best || (Number(candidate?.score) || 0) > (Number(best?.score) || 0)) {
      best = candidate;
    }
  }

  return best || {
    score: 0,
    totalPay: 0,
    totalEarnings: 0,
    totalTime: 0,
    totalTimeSeconds: 0,
    travelTimeSeconds: 0,
    localTravelTimeSeconds: 0,
    crossCityTravelTimeSeconds: 0,
    pickTimeSeconds: 0,
    effectivePickTimeSeconds: 0,
    sharedItemSavingsSeconds: 0,
    endingCity: context.currentCity ?? "",
    perOrder: [],
    bundleIds: [],
    sequenceIds: [],
    uncertaintyFlags: ["no_route_candidate"]
  };
}

function enrichCandidateRegret(candidate = {}, bestScore = 0, rank = 0) {
  const score = Number(candidate?.score);
  const ratio = Number.isFinite(score) && bestScore > 0 ? score / bestScore : null;
  const regret = ratio == null ? null : Math.max(0, 1 - ratio);
  return {
    ...candidate,
    rank,
    scoreRatioToBest: ratio,
    regretToBest: regret,
    isBest: rank === 1,
    isNearBest: ratio != null && ratio >= 0.95
  };
}

function serializeCandidateBundle(candidate = {}) {
  return {
    rank: Number(candidate.rank) || 0,
    legal: true,
    legality_reason: candidate.legalityReason || "same_store_multi_order",
    bundle_ids: normalizeIdList(candidate.bundleIds),
    delivery_sequence_ids: normalizeIdList(candidate.sequenceIds),
    bundle_size: normalizeIdList(candidate.bundleIds).length,
    score: Number(candidate.score) || 0,
    score_ratio_to_best: candidate.scoreRatioToBest == null ? null : Number(candidate.scoreRatioToBest),
    regret_to_best: candidate.regretToBest == null ? null : Number(candidate.regretToBest),
    earnings: Number(candidate.totalEarnings ?? candidate.totalPay) || 0,
    total_time_seconds: Number(candidate.totalTimeSeconds ?? candidate.totalTime) || 0,
    travel_time_seconds: Number(candidate.travelTimeSeconds) || 0,
    local_travel_time_seconds: Number(candidate.localTravelTimeSeconds) || 0,
    cross_city_travel_time_seconds: Number(candidate.crossCityTravelTimeSeconds) || 0,
    pick_time_seconds: Number(candidate.pickTimeSeconds) || 0,
    effective_pick_time_seconds: Number(candidate.effectivePickTimeSeconds) || 0,
    shared_item_savings_seconds: Number(candidate.sharedItemSavingsSeconds) || 0,
    ending_city: String(candidate.endingCity ?? ""),
    uncertainty_flags: normalizeIdList(candidate.uncertaintyFlags),
    per_order: Array.isArray(candidate.perOrder) ? candidate.perOrder : []
  };
}

// Solves all candidate bundles and returns best/second plus full candidate metadata.
function solveBestAndSecondBundle(orders = [], context = {}) {
  const maxBundle = Number(context.maxBundle ?? context.kMax ?? 3);

  const legalBundleEntries = enumerateLegalBundles(orders, maxBundle);
  if (legalBundleEntries.length === 0) {
    return {
      best: null,
      second: null,
      candidates: [],
      bestScore: 0,
      secondScore: 0
    };
  }

  const scored = legalBundleEntries.map(({ bundle, legality }) => {
    const scoreResult = scoreBundleBestSequence(bundle, context);
    return {
      ...scoreResult,
      legalityReason: legality.reason
    };
  });

  scored.sort((a, b) => {
    const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const sizeDiff = (a.bundleIds?.length || 0) - (b.bundleIds?.length || 0);
    if (sizeDiff !== 0) return sizeDiff;
    return String(a.bundleIds?.join("+") || "").localeCompare(String(b.bundleIds?.join("+") || ""));
  });

  const bestScore = Number(scored[0]?.score) || 0;
  const candidates = scored.map((candidate, index) => enrichCandidateRegret(candidate, bestScore, index + 1));
  const secondScore = Number(candidates[1]?.score) || 0;
  const best = candidates[0] ?? null;
  const second = candidates[1] ?? null;

  return {
    best,
    second,
    candidates,
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
  const rng = getRng(context);
  const orders = [];
  const cities = getCitiesFromTravelTimes(citiesDataset);
  const cityAssignments = buildCityAssignments({
    count,
    cities,
    storeDataset,
    targetCity,
    forcedCity,
    rng
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
  const protocol = context.protocol || getCanonicalResearchStudyProtocol();
  const phaseConfig = resolveProtocolPhaseForRound(round, protocol);
  const phase = String(phaseConfig?.id || context.phase || "");
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
  const candidateBundles = Array.isArray(caseResult?.solution?.candidates)
    ? caseResult.solution.candidates.map((candidate) => serializeCandidateBundle(candidate))
    : [];
  const bestCandidate = candidateBundles[0] || null;
  const secondCandidate = candidateBundles[1] || null;
  const uncertaintyFlags = normalizeIdList(candidateBundles.flatMap((candidate) => candidate.uncertainty_flags || []));

  return {
    orders: orders.map((order = {}) => ({
      id: String(order.id ?? ""),
      city: String(order.city ?? ""),
      store: String(order.store ?? ""),
      items: order.items && typeof order.items === "object" ? { ...order.items } : {},
      earnings: Number(order.earnings) || 0,
      estimatedTime: Number(order.estimatedTime) || 0,
      localTravelTime: Number(order.localTravelTime) || 0
    })),
    scenario: {
      round,
      phase,
      scenario_id: scenarioId,
      max_bundle: maxBundle,
      order_ids: orderIds,
      candidate_bundle_count: candidateBundles.length,
      reward_model_version: REWARD_MODEL_VERSION,
      route_optimizer_version: ROUTE_OPTIMIZER_VERSION,
      legal_bundle_model_version: LEGAL_BUNDLE_MODEL_VERSION,
      recommendation_phase: Boolean(phaseConfig?.recommendations_enabled)
    },
    optimal: {
      scenario_id: scenarioId,
      phase,
      best_bundle_ids: bestBundleIds,
      second_best_bundle_ids: secondBestBundleIds,
      ending_city_best: String(caseResult?.solution?.best?.endingCity ?? ""),
      best_score: Number(caseResult?.solution?.bestScore) || 0,
      second_best_score: Number(caseResult?.solution?.secondScore) || 0,
      reward_model_version: REWARD_MODEL_VERSION,
      route_optimizer_version: ROUTE_OPTIMIZER_VERSION,
      legal_bundle_model_version: LEGAL_BUNDLE_MODEL_VERSION,
      reward_components: {
        earnings: Number(bestCandidate?.earnings) || 0,
        total_time_seconds: Number(bestCandidate?.total_time_seconds) || 0,
        travel_time_seconds: Number(bestCandidate?.travel_time_seconds) || 0,
        local_travel_time_seconds: Number(bestCandidate?.local_travel_time_seconds) || 0,
        cross_city_travel_time_seconds: Number(bestCandidate?.cross_city_travel_time_seconds) || 0,
        pick_time_seconds: Number(bestCandidate?.pick_time_seconds) || 0,
        effective_pick_time_seconds: Number(bestCandidate?.effective_pick_time_seconds) || 0,
        shared_item_savings_seconds: Number(bestCandidate?.shared_item_savings_seconds) || 0,
        regret_to_best: 0,
        uncertainty_flags: uncertaintyFlags
      },
      second_best_reward_components: secondCandidate ? {
        earnings: Number(secondCandidate.earnings) || 0,
        total_time_seconds: Number(secondCandidate.total_time_seconds) || 0,
        travel_time_seconds: Number(secondCandidate.travel_time_seconds) || 0,
        pick_time_seconds: Number(secondCandidate.pick_time_seconds) || 0,
        regret_to_best: Number(secondCandidate.regret_to_best) || 0,
        uncertainty_flags: normalizeIdList(secondCandidate.uncertainty_flags)
      } : null,
      candidate_bundles: candidateBundles,
      candidate_bundle_count: candidateBundles.length
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
  const { saveScenarioDatasetBundle } = await import("../firebaseDB.js");
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
  if (!metadata.scenarioSetVersionId) {
    metadata.scenarioSetVersionId = createScenarioSetVersionId(datasetRoot);
  }
  if (!metadata.datasetName) {
    metadata.datasetName = datasetRoot;
  }

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

export function generateScenarioSetPayload(options = {}, datasets = {}) {
  const FIXED_ORDERS_PER_SCENARIO = 4;
  const {
    datasetName = "experiment",
    totalRounds = BUNDLEGAME_STUDY_TOTAL_ROUNDS,
    maxBundle = 3,
    payMin = 8,
    payMax = 24,
    scenarioSetId = datasetName,
    seed = DEFAULT_GENERATION_SEED,
    generatedAt = new Date().toISOString(),
    scenarioSetVersionId = ""
  } = options;

  const normalizedDataset = resolveDatasetRootName(datasetName);
  const normalizedSeed = String(seed || DEFAULT_GENERATION_SEED).trim();
  const normalizedInput = {
    datasetName: normalizedDataset,
    totalRounds,
    maxBundle,
    payMin,
    payMax,
    ordersPerScenario: FIXED_ORDERS_PER_SCENARIO,
    seed: normalizedSeed
  };

  validatePipelineInputs(normalizedInput);
  const resolvedScenarioSetId = scenarioSetId || normalizedDataset;
  const rng = createSeededRandom(normalizedSeed);
  const storeDataset = datasets.storeDataset || {};
  const citiesDataset = datasets.citiesDataset || {};
  const protocol = getCanonicalResearchStudyProtocol();
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
      : selectFairTargetCity(allCities, targetCityCount, previousBestCity, rng);
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
      protocol,
      rng,
      datasetName: normalizedDataset,
      scenarioSetId: resolvedScenarioSetId
    });

    const scenarioRound = buildScenarioRound(caseResult, {
      round,
      maxBundle,
      protocol,
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
    scenarioSetVersionId: String(scenarioSetVersionId || "").trim()
      || createScenarioSetVersionId(normalizedDataset, new Date(generatedAt)),
    totalRounds: Number(totalRounds),
    maxBundle: Number(maxBundle),
    payMin: Number(payMin),
    payMax: Number(payMax),
    seed: normalizedSeed,
    generatedAt,
    generatorSchemaVersion: GENERATOR_SCHEMA_VERSION,
    rewardModelVersion: REWARD_MODEL_VERSION,
    routeOptimizerVersion: ROUTE_OPTIMIZER_VERSION,
    legalBundleModelVersion: LEGAL_BUNDLE_MODEL_VERSION,
    protocolVersion: BUNDLEGAME_STUDY_PROTOCOL_VERSION,
    expectedTotalRounds: BUNDLEGAME_STUDY_TOTAL_ROUNDS
  };

  const serialized = serializeScenarioOutput(roundOutputs, metadata);
  return {
    roundOutputs,
    serialized,
    metadata,
    datasetName: normalizedDataset
  };
}

// High-level orchestration entry point for full generation pipeline.
export async function runScenarioGenerationPipeline(options = {}) {
  const {
    datasetName = "experiment"
  } = options;

  const normalizedDataset = resolveDatasetRootName(datasetName);
  await assertDatasetNameAvailable(normalizedDataset);
  const [storeDataset, citiesDataset] = await Promise.all([
    fetchStoreDataset("store"),
    fetchCitiesDataset("cities")
  ]);
  const generated = generateScenarioSetPayload({
    ...options,
    datasetName: normalizedDataset
  }, {
    storeDataset,
    citiesDataset
  });
  const { serialized, roundOutputs, metadata } = generated;
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
      optimal: serialized?.optimal?.optimal?.length || 0,
      candidateBundles: (serialized?.optimal?.optimal || [])
        .reduce((sum, row) => sum + (Array.isArray(row?.candidate_bundles) ? row.candidate_bundles.length : 0), 0),
      seed: metadata.seed,
      rewardModelVersion: metadata.rewardModelVersion
    },
    saved
  };
}
