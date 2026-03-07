// Estimates bundle savings from shared items in same store+city groups.
// Rule: if an item appears in multiple orders of the same store+city,
// item travel-to-location time is counted once; duplicates are saved.
const LOCAL_TRAVEL_BUNDLE_SAVE_RATE = 0.25; // 25% local-travel reduction for bundled groups

function normalizeItemKeys(items = {}) {
  if (!items || typeof items !== "object") return [];
  return Object.keys(items)
    .map((k) => String(k || "").toLowerCase().trim())
    .filter(Boolean);
}

function resolveStoreConfig(storeName = "", options = {}) {
  if (typeof options?.getStoreConfig === "function") {
    return options.getStoreConfig(storeName) || null;
  }
  const stores = Array.isArray(options?.storeDataset?.stores) ? options.storeDataset.stores : [];
  return stores.find((s) => String(s?.store || "") === String(storeName || "")) || null;
}

function manhattanDistance(a = [0, 0], b = [0, 0]) {
  return Math.abs((a[0] ?? 0) - (b[0] ?? 0)) + Math.abs((a[1] ?? 0) - (b[1] ?? 0));
}

function findItemPosition(locations = [], itemName = "") {
  const needle = String(itemName || "").toLowerCase().trim();
  for (let r = 0; r < locations.length; r += 1) {
    const row = Array.isArray(locations[r]) ? locations[r] : (Array.isArray(locations[r]?.cells) ? locations[r].cells : []);
    for (let c = 0; c < row.length; c += 1) {
      if (String(row[c] || "").toLowerCase().trim() === needle) return [r, c];
    }
  }
  return null;
}

function itemAccessSeconds(storeConfig = {}, itemName = "") {
  const locations = Array.isArray(storeConfig?.locations) ? storeConfig.locations : [];
  const entrance = Array.isArray(storeConfig?.Entrance) ? storeConfig.Entrance : [0, 0];
  const secondsPerCell = (Number(storeConfig?.cellDistance ?? 1000) || 1000) / 1000;
  const pos = findItemPosition(locations, itemName);
  if (!pos) return 0;
  return manhattanDistance(entrance, pos) * secondsPerCell;
}

function estimatePickItemSeconds(order = {}, storeConfig = {}) {
  const locations = Array.isArray(storeConfig?.locations) ? storeConfig.locations : [];
  const entrance = Array.isArray(storeConfig?.Entrance) ? storeConfig.Entrance : [0, 0];
  const secondsPerCell = (Number(storeConfig?.cellDistance ?? 1000) || 1000) / 1000;
  const secondsPerUniqueItem = 3;

  const uniqueItems = normalizeItemKeys(order?.items);
  let currentPos = entrance;
  let walkSteps = 0;

  for (const item of uniqueItems) {
    const pos = findItemPosition(locations, item);
    if (!pos) continue;
    walkSteps += manhattanDistance(currentPos, pos);
    currentPos = pos;
  }

  return (walkSteps * secondsPerCell) + (uniqueItems.length * secondsPerUniqueItem);
}

export function calculateSharedItemTravelSavings(orders = [], options = {}) {
  const list = Array.isArray(orders) ? orders : [];
  if (list.length <= 1) return 0;

  const groups = new Map();
  for (const order of list) {
    const store = String(order?.store || "");
    const city = String(order?.city || "");
    const key = `${store}@@${city}`;
    const group = groups.get(key) || [];
    group.push(order);
    groups.set(key, group);
  }

  let savingsSeconds = 0;
  for (const [key, groupOrders] of groups.entries()) {
    if (groupOrders.length < 2) continue;

    const [storeName] = key.split("@@");
    const cfg = resolveStoreConfig(storeName, options);
    if (!cfg) continue;

    const itemCounts = new Map();
    for (const order of groupOrders) {
      const uniqueKeys = new Set(normalizeItemKeys(order?.items));
      for (const item of uniqueKeys) {
        itemCounts.set(item, (itemCounts.get(item) || 0) + 1);
      }
    }

    for (const [item, count] of itemCounts.entries()) {
      if (count <= 1) continue;
      const access = itemAccessSeconds(cfg, item);
      savingsSeconds += access * (count - 1);
    }

    // Extra bundle benefit: local delivery-time reduction for bundled orders.
    // local = baseEstimatedTime - pickTime, clamped at 0.
    const totalLocalTravel = groupOrders.reduce((sum, order) => {
      const base = Math.max(0, Number(order?.estimatedTime) || 0);
      const pick = Math.max(0, estimatePickItemSeconds(order, cfg));
      return sum + Math.max(0, base - pick);
    }, 0);
    savingsSeconds += totalLocalTravel * LOCAL_TRAVEL_BUNDLE_SAVE_RATE;
  }

  return savingsSeconds;
}

export function applySharedItemBundleSavings(orders = [], orderTimes = [], options = {}) {
  const times = Array.isArray(orderTimes) ? orderTimes : [];
  const rawTotalTime = times.reduce((sum, t) => sum + Math.max(0, Number(t) || 0), 0);
  const sharedSavings = calculateSharedItemTravelSavings(orders, options);
  const discountedTotalTime = Math.max(0, rawTotalTime - sharedSavings);
  return {
    rawTotalTime,
    discountedTotalTime,
    savingsSeconds: sharedSavings
  };
}
