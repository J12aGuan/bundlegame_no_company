import { saveScenarioDatasetBundle } from "../firebaseDB.js";
import {
  fetchCentralConfigForGeneration,
  fetchTutorialConfigForGeneration,
  fetchOrdersDataset,
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchExistingScenarioSet,
  fetchScenarioDatasetBundle
} from "./scenarioData.js";
import {
  estimateLocalTravelTime,
  estimatePickItemTime,
  crossCityExtraTime
} from "./scenarioTime.js";

// Loads all required datasets/config for generation (to be implemented).
export async function fetchGenerationInputs(options = {}) {}
export {
  fetchCentralConfigForGeneration,
  fetchTutorialConfigForGeneration,
  fetchOrdersDataset,
  fetchStoreDataset,
  fetchCitiesDataset,
  fetchExistingScenarioSet,
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

// Extracts available city names from the cities travel-time matrix.
function getCitiesFromTravelTimes(citiesDataset = {}) {
  return Object.keys(citiesDataset?.travelTimes || {});
}

// Returns all store configs belonging to a given city.
function getStoresInCity(storeDataset = {}, city = "") {
  const stores = Array.isArray(storeDataset?.stores) ? storeDataset.stores : [];
  return stores.filter((s) => String(s?.city) === String(city));
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

// Canonicalizes difficulty strings.
function normalizeDifficulty(value = "") {
  return String(value || "").toLowerCase().trim();
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

// Normalizes a score relative to best score so best maps to 100.
function normalizeToBest100(score, bestScore) {
  const s = Number(score) || 0;
  const best = Number(bestScore) || 0;
  if (best <= 0) return 0;

  const normalized = (s / best) * 100;
  return Math.max(0, Math.min(100, Number(normalized.toFixed(2))));
}

// Tunes a candidate case by adjusting earnings with step-halving delta search.
function tuneCaseByDeltaSearch(seedCase = {}, targetDifficulty = "", context = {}) {
  const maxBundle = Number(context.maxBundle ?? context.kMax ?? 3);
  let orders = Array.isArray(seedCase?.orders) ? seedCase.orders.map((o) => ({ ...o })) : [];
  let solution = seedCase?.solution ?? solveBestAndSecondBundle(orders, { ...context, maxBundle });

  const payMin = Number(context.payMin ?? 1);
  const payMax = Number(context.payMax ?? 99);
  let step = Math.max(1, Math.floor((payMax - payMin) / 2));
  const maxIters = Math.max(8, Number(context.tuningIters ?? 24));
  const targetCenter = getTargetGapCenter(targetDifficulty);

  let bestOrders = orders;
  let bestSolution = solution;
  let bestDist = distanceToTargetGap(Number(solution?.relativeGap) || 0, targetDifficulty, targetCenter);

  for (let i = 0; i < maxIters; i += 1) {
    if (caseMatchesDifficulty({ solution }, targetDifficulty)) break;
    if (step < 1) break;

    const needIncrease = shouldIncreaseGap(Number(solution?.relativeGap) || 0, targetDifficulty);
    const trialOrders = applyGapDelta(orders, solution, needIncrease ? step : -step, payMin, payMax);

    // No tunable movement available for this step size.
    if (!trialOrders.changed) {
      if (step === 1) break;
      step = Math.max(1, Math.floor(step / 2));
      continue;
    }

    const trialSolution = solveBestAndSecondBundle(trialOrders.orders, { ...context, maxBundle });
    const trialDist = distanceToTargetGap(Number(trialSolution?.relativeGap) || 0, targetDifficulty, targetCenter);

    if (trialDist <= bestDist) {
      orders = trialOrders.orders;
      solution = trialSolution;
      bestOrders = orders;
      bestSolution = solution;
      bestDist = trialDist;
    } else {
      step = Math.max(1, Math.floor(step / 2));
    }
  }

  return {
    scenarioIndex: seedCase?.scenarioIndex ?? 1,
    orders: bestOrders,
    solution: bestSolution
  };
}

// Clamps numeric value to [min, max].
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Applies an earnings delta to best/second bundles to increase or decrease gap.
function applyGapDelta(orders = [], solution = {}, delta = 0, payMin = 1, payMax = 99) {
  const bestIds = new Set(solution?.best?.bundleIds || []);
  const secondIds = new Set(solution?.second?.bundleIds || []);
  const bestOnly = [...bestIds].filter((id) => !secondIds.has(id));
  const secondOnly = [...secondIds].filter((id) => !bestIds.has(id));
  const bestTarget = bestOnly.length ? bestOnly : [...bestIds];
  const secondTarget = secondOnly.length ? secondOnly : [...secondIds];

  const byId = new Map((orders || []).map((o) => [String(o?.id ?? ""), { ...o }]));
  const magnitude = Math.abs(Number(delta) || 0);
  if (magnitude <= 0) return { changed: false, orders: orders.map((o) => ({ ...o })) };

  const [bestMove, secondMove] = delta > 0
    ? [magnitude, -magnitude] // increase gap
    : [-magnitude, magnitude]; // decrease gap

  let changed = false;
  changed = moveEarnings(byId, bestTarget, bestMove, payMin, payMax) || changed;
  changed = moveEarnings(byId, secondTarget, secondMove, payMin, payMax) || changed;

  return {
    changed,
    orders: orders.map((o) => byId.get(String(o?.id ?? "")) || { ...o })
  };
}

// Moves earnings for a list of order IDs and reports if any value changed.
function moveEarnings(byId, ids = [], delta = 0, payMin = 1, payMax = 99) {
  let changed = false;
  for (const id of ids) {
    const order = byId.get(String(id));
    if (!order) continue;
    const prev = Number(order.earnings) || 0;
    const next = clamp(prev + delta, payMin, payMax);
    if (next !== prev) changed = true;
    order.earnings = next;
    byId.set(String(id), order);
  }
  return changed;
}

// Decides whether current gap should be increased for the target difficulty.
function shouldIncreaseGap(relativeGap = 0, targetDifficulty = "") {
  const target = normalizeDifficulty(targetDifficulty);
  if (target === "easy") return relativeGap < 0.25;
  if (target === "hard") return relativeGap >= 0.10;
  if (target === "medium") {
    if (relativeGap < 0.10) return true;
    if (relativeGap >= 0.25) return false;
  }
  return false;
}

// Computes how far current relative gap is from target band/center.
function distanceToTargetGap(relativeGap = 0, targetDifficulty = "", targetCenter = 0.175) {
  const target = normalizeDifficulty(targetDifficulty);
  if (target === "easy") return relativeGap >= 0.25 ? 0 : 0.25 - relativeGap;
  if (target === "hard") return relativeGap < 0.10 ? 0 : relativeGap - 0.10;
  if (target === "medium") {
    if (relativeGap >= 0.10 && relativeGap < 0.25) return 0;
  }
  return Math.abs(relativeGap - targetCenter);
}

// Returns a default target-gap center value per difficulty class.
function getTargetGapCenter(targetDifficulty = "") {
  const target = normalizeDifficulty(targetDifficulty);
  if (target === "easy") return 0.35;
  if (target === "hard") return 0.05;
  return 0.175; // medium/default center
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

  const targetDifficulty = String(metadata.targetDifficulty ?? "").trim();
  if (targetDifficulty) cleaned.targetDifficulty = targetDifficulty;

  const totalRounds = Number(metadata.totalRounds);
  if (Number.isFinite(totalRounds) && totalRounds > 0) cleaned.totalRounds = Math.floor(totalRounds);

  const maxBundle = Number(metadata.maxBundle);
  if (Number.isFinite(maxBundle) && maxBundle > 0) cleaned.maxBundle = Math.floor(maxBundle);

  const payMin = Number(metadata.payMin);
  if (Number.isFinite(payMin)) cleaned.payMin = payMin;

  const payMax = Number(metadata.payMax);
  if (Number.isFinite(payMax)) cleaned.payMax = payMax;

  const earningsStep = Number(metadata.earningsStep ?? metadata.earningStep);
  if (Number.isFinite(earningsStep) && earningsStep > 0) cleaned.earningsStep = earningsStep;

  // Verify numeric fields only when all are present.
  if (
    Number.isFinite(cleaned.payMin) &&
    Number.isFinite(cleaned.payMax) &&
    Number.isFinite(cleaned.earningsStep)
  ) {
    if (cleaned.payMax <= cleaned.payMin) {
      throw new Error("Invalid metadata: payMax must be greater than payMin.");
    }
    if (cleaned.earningsStep > (cleaned.payMax - cleaned.payMin)) {
      throw new Error("Invalid metadata: earningsStep must be <= (payMax - payMin).");
    }
  }

  return cleaned;
}

function validatePipelineInputs(input = {}) {
  const name = String(input.datasetName || "").trim();
  if (!name) throw new Error("datasetName is required.");

  const difficulty = normalizeDifficulty(input.targetDifficulty);
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new Error("targetDifficulty must be one of: easy, medium, hard.");
  }

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
  const earningsStep = Number(input.earningsStep);

  if (!Number.isFinite(payMin) || !Number.isFinite(payMax) || payMax <= payMin) {
    throw new Error("Invalid pay range: payMax must be greater than payMin.");
  }
  if (!Number.isFinite(earningsStep) || earningsStep <= 0) {
    throw new Error("earningsStep must be > 0.");
  }
  validateEarningsStepFeasibility(payMin, payMax, earningsStep);
}

function validateEarningsStepFeasibility(payMin, payMax, earningsStep) {
  const range = payMax - payMin;
  if (range < earningsStep * 2) {
    throw new Error("payMax - payMin must be at least 2x earningsStep.");
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
// Estimates total completion time for one order from local, pick, and cross-city travel.
export function estimateOrderCompletionTime(order, context = {}) {
  const localTravel = estimateLocalTravelTime();
  const pickItem = estimatePickItemTime(order, context);

  const currentCity = context.currentCity ?? context.playerCity ?? "";
  const extraCrossCity = crossCityExtraTime(order?.city, currentCity, context);

  return localTravel + pickItem + extraCrossCity;
}

// Builds one synthetic order with generated city/store/items/earnings/time.
export function createOrderModel(context = {}) {
  const {
    scenarioIndex = 1, // 1-based
    orderIndex = 1, // 1-based global or per scenario
    orderIdPrefix = "",
    storeDataset = {},
    citiesDataset = {},
    forcedCity = "",
    forceRandomCity = false,
    currentCity = "", // player current city for cross-city extra time
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

  // Compute estimated time if not already provided
  if (!order.estimatedTime || !Number.isFinite(order.estimatedTime)) {
    order.estimatedTime = estimateOrderCompletionTime(order, {
      ...context,
      currentCity,
      citiesDataset,
      storeDataset
    });
  }

  return order;
}

// Enumerates all order bundles of size 1..kMax.
export function enumerateBundles(orders = [], kMax = 3) {
  const source = Array.isArray(orders) ? orders : [];
  const n = source.length;

  // Clamp bundle size to valid range
  const maxSize = Math.max(1, Math.min(Number(kMax) || 1, n));
  const bundles = [];

  // Build all combinations for size = 1..maxSize
  for (let size = 1; size <= maxSize; size += 1) {
    combine(source, size, 0, [], bundles);
  }

  return bundles;
}

// Computes score and summary metrics for a single bundle.
export function computeBundleScore(bundle = [], context = {}) {
  // Empty bundle => zero score
  if (!Array.isArray(bundle) || bundle.length === 0) {
    return {
      score: 0,
      normalizedScore: context?.bestScore != null ? normalizeToBest100(0, context.bestScore) : null,
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

  // Avoid divide by zero
  const safeTime = totalTime > 0 ? totalTime : 1e-9;
  const score = totalPay / safeTime;
  const normalizedScore = context?.bestScore != null
    ? normalizeToBest100(score, context.bestScore)
    : null;

  return {
    score,
    normalizedScore,
    totalPay,
    totalTime,
    endingCity: simulatedCity,
    perOrder
  };
}

// Computes absolute and relative gap between best and second scores.
export function computeGap(bestScore, secondScore) {
  const best = Number(bestScore) || 0;
  const second = Number(secondScore) || 0;

  // Keep non-negative and stable if inputs are weird
  const gap = Math.max(0, best - second);
  const relativeGap = best > 0 ? gap / best : 0;

  return { gap, relativeGap };
}

// Maps relative gap to easy/medium/hard difficulty.
export function classifyDifficulty(relativeGap) {
  const g = Number(relativeGap) || 0;

  // Easy: clear winner
  if (g >= 0.25) return "easy";

  // Medium: somewhat close
  if (g >= 0.10) return "medium";

  // Hard: near tie
  return "hard";
}

// Solves all candidate bundles and returns best/second plus scoring diagnostics.
export function solveBestAndSecondBundle(orders = [], context = {}) {
  const maxBundle = Number(context.maxBundle ?? context.kMax ?? 3);

  // 1) Generate all candidate bundles
  const bundles = enumerateBundles(orders, maxBundle);
  if (bundles.length === 0) {
    return {
      best: null,
      second: null,
      all: [],
      bestScore: 0,
      secondScore: 0,
      gap: 0,
      relativeGap: 0,
      difficulty: "hard"
    };
  }

  // 2) Score each bundle once (avoid re-scoring randomness)
  const scored = bundles.map((bundle) => {
    const scoreResult = computeBundleScore(bundle, context);
    return {
      bundle,
      bundleIds: bundle.map((o) => o?.id ?? ""),
      ...scoreResult
    };
  });

  // 3) Rank by raw score (highest first)
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  const bestScore = Number(scored[0]?.score) || 0;
  const secondScore = Number(scored[1]?.score) || 0;

  // 4) Add normalized score (best = 100)
  const normalized = scored.map((row) => ({
    ...row,
    normalizedScore: normalizeToBest100(row.score, bestScore)
  }));

  const best = normalized[0] ?? null;
  const second = normalized[1] ?? null;

  // 5) Gap metrics + difficulty
  const { gap, relativeGap } = computeGap(bestScore, secondScore);
  const difficulty = classifyDifficulty(relativeGap);

  return {
    best,
    second,
    all: normalized,
    bestScore,
    secondScore,
    gap,
    relativeGap,
    difficulty
  };
}

// Generates one candidate scenario case and solves its bundles.
export function generateCandidateCase(context = {}) {
  const {
    scenarioIndex = 1,
    ordersPerScenario = 4,
    startOrderIndex = 1,
    orderIdPrefix = "",
    maxBundle = 3
  } = context;

  const count = Math.max(1, Number(ordersPerScenario) || 1);
  const orders = [];

  for (let i = 0; i < count; i += 1) {
    const order = createOrderModel({
      ...context,
      scenarioIndex,
      orderIndex: startOrderIndex + i,
      orderIdPrefix
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

// Checks whether a generated case falls in the requested difficulty band.
export function caseMatchesDifficulty(caseResult, targetDifficulty) {
  const relativeGap = Number(caseResult?.solution?.relativeGap);
  if (!Number.isFinite(relativeGap)) return false;

  const target = normalizeDifficulty(targetDifficulty);

  if (target === "easy") return relativeGap >= 0.25;
  if (target === "medium") return relativeGap >= 0.10 && relativeGap < 0.25;
  if (target === "hard") return relativeGap < 0.10;

  // Unknown target => no filter
  return true;
}

// Repeats generation+tuning until a case matches the requested difficulty.
export function generateCaseUntilDifficultyMatch(targetDifficulty, context = {}) {
  const {
    scenarioIndex = 1,
    ordersPerScenario = 4,
    startOrderIndex = 1
  } = context;
  while (true) {
    const seedCase = generateCandidateCase({
      ...context,
      scenarioIndex,
      ordersPerScenario,
      startOrderIndex
    });
    const tunedCase = tuneCaseByDeltaSearch(seedCase, targetDifficulty, context);
    if (caseMatchesDifficulty(tunedCase, targetDifficulty)) return tunedCase;
  }
}

// Builds the persisted round/scenario shape from a matched case.
export function buildScenarioRound(caseResult, context = {}) {
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
export function serializeScenarioOutput(scenarios = [], metadata = {}) {
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
export async function saveGeneratedScenarioSet(scenarios = [], scenarioSetId = "experiment", options = {}) {
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
    targetDifficulty = "easy",
    totalRounds = 10,
    maxBundle = 3,
    payMin = 8,
    payMax = 24,
    earningsStep = 1,
    scenarioSetId = datasetName
  } = options;

  const normalizedDataset = resolveDatasetRootName(datasetName);
  const normalizedInput = {
    datasetName: normalizedDataset,
    targetDifficulty,
    totalRounds,
    maxBundle,
    payMin,
    payMax,
    earningsStep,
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

  for (let round = 1; round <= Number(totalRounds); round += 1) {
    const isEvenRound = round % 2 === 0;
    const isOddRoundAfterFirst = round % 2 === 1 && round > 1;
    const forcedCity = isOddRoundAfterFirst ? previousBestCity : "";

    const caseResult = generateCaseUntilDifficultyMatch(targetDifficulty, {
      scenarioIndex: round,
      startOrderIndex: nextOrderIndex,
      ordersPerScenario: FIXED_ORDERS_PER_SCENARIO,
      maxBundle,
      payMin,
      payMax,
      earningsStep,
      forcedCity,
      forceRandomCity: isEvenRound,
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
    targetDifficulty,
    totalRounds: Number(totalRounds),
    maxBundle: Number(maxBundle),
    payMin: Number(payMin),
    payMax: Number(payMax),
    earningsStep: Number(earningsStep)
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
