// Estimates bundle savings from shared items in same store+city groups.
// Rule: if an item appears in multiple orders of the same store+city,
// item travel-to-location time is counted once; duplicates are saved.
const SHARED_ITEM_ACCESS_SAVE_RATE = 1; // Same shared item means we only travel to that location once

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

function findItemPositions(locations = [], itemName = "") {
  const needle = String(itemName || "").toLowerCase().trim();
  const positions = [];
  for (let r = 0; r < locations.length; r += 1) {
    const row = Array.isArray(locations[r]) ? locations[r] : (Array.isArray(locations[r]?.cells) ? locations[r].cells : []);
    for (let c = 0; c < row.length; c += 1) {
      if (String(row[c] || "").toLowerCase().trim() === needle) positions.push([r, c]);
    }
  }
  return positions;
}

function itemAccessSeconds(storeConfig = {}, itemName = "") {
  const locations = Array.isArray(storeConfig?.locations) ? storeConfig.locations : [];
  const entrance = Array.isArray(storeConfig?.Entrance) ? storeConfig.Entrance : [0, 0];
  const secondsPerCell = (Number(storeConfig?.cellDistance ?? 1000) || 1000) / 1000;
  const positions = findItemPositions(locations, itemName);
  if (positions.length === 0) return 0;
  const nearestDistance = positions.reduce((best, pos) => {
    const distance = manhattanDistance(entrance, pos);
    return Math.min(best, distance);
  }, Number.POSITIVE_INFINITY);
  return nearestDistance * secondsPerCell;
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
      savingsSeconds += access * (count - 1) * SHARED_ITEM_ACCESS_SAVE_RATE;
    }
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
