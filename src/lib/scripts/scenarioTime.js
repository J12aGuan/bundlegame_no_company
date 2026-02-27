export function estimateLocalTravelTime() {
  return Math.floor(Math.random() * 7) + 4; // 4..10 seconds
}

export function estimatePickItemTime(order, context = {}) {
  const storeDataset = context.storeDataset ?? {};
  const storeConfig = findStoreConfigForOrder(storeDataset, order?.store);
  if (!storeConfig) return 0;

  const locations = Array.isArray(storeConfig.locations) ? storeConfig.locations : [];
  const entrance = Array.isArray(storeConfig.Entrance) ? storeConfig.Entrance : [0, 0];

  // store cellDistance is in ms in existing gameplay code
  const secondsPerCell = Number(storeConfig.cellDistance ?? 1000) / 1000;
  const grabSecondsPerItem = Number(context.grabSecondsPerItem ?? 2);

  const lineItems = normalizeOrderItems(order?.items);
  let currentPos = entrance;
  let totalWalkSteps = 0;
  let totalUnits = 0;

  for (const item of lineItems) {
    const position = findItemPosition(locations, item.name);
    if (!position) continue;
    totalWalkSteps += manhattanDistance(currentPos, position);
    currentPos = position;
    totalUnits += item.qty;
  }

  const walkSeconds = totalWalkSteps * secondsPerCell;
  const grabSeconds = totalUnits * grabSecondsPerItem;
  return walkSeconds + grabSeconds;
}

export function crossCityExtraTime() {}


// Helper methods
function manhattanDistance(a = [0, 0], b = [0, 0]) {
  return Math.abs((a[0] ?? 0) - (b[0] ?? 0)) + Math.abs((a[1] ?? 0) - (b[1] ?? 0));
}

function findItemPosition(locations = [], itemName = "") {
  const needle = String(itemName).toLowerCase().trim();
  for (let r = 0; r < locations.length; r += 1) {
    const row = Array.isArray(locations[r]) ? locations[r] : [];
    for (let c = 0; c < row.length; c += 1) {
      if (String(row[c]).toLowerCase().trim() === needle) {
        return [r, c];
      }
    }
  }
  return null;
}

function normalizeOrderItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.map((name) => ({ name, qty: 1 }));
  }
  return Object.entries(items).map(([name, qty]) => ({
    name,
    qty: Number.isFinite(Number(qty)) && Number(qty) > 0 ? Number(qty) : 1
  }));
}

function findStoreConfigForOrder(storeDataset = {}, storeName = "") {
  const stores = Array.isArray(storeDataset?.stores) ? storeDataset.stores : [];
  return stores.find((s) => String(s?.store) === String(storeName)) ?? null;
}

