import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

function loadEnv(filePath) {
  const out = {};
  const txt = fs.readFileSync(filePath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^"|"$/g, '');
    out[k] = v;
  }
  return out;
}

function normalizeId(value = '') {
  return String(value || '').trim().replace(/\.json$/i, '');
}

function resolveRoot(value = '') {
  return normalizeId(value)
    .replace(/(Scenarios|Orders|Optimal)(?=_|$)/ig, '')
    .replace(/(_scenarios|_orders|_optimal)$/i, '')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
    .trim();
}

async function getData(db, id) {
  const snap = await getDoc(doc(db, 'MasterData', id));
  return snap.exists() ? snap.data() : null;
}

async function firstExisting(db, ids = []) {
  for (const id of ids) {
    if (!id) continue;
    const data = await getData(db, id);
    if (data) return { id, data };
  }
  return { id: null, data: null };
}

const env = loadEnv(path.resolve('.env'));
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
});
const db = getFirestore(app);

const central = await getData(db, 'centralConfig') || {};
const tutorial = await getData(db, 'tutorialConfig') || {};

const sets = [
  normalizeId(central.scenario_set || 'experimentScenarios'),
  normalizeId(tutorial.scenario_set || 'experimentScenarios_tutorial')
].filter(Boolean);

const uniqueSets = [...new Set(sets)];
const results = [];

for (const scenarioSetId of uniqueSets) {
  const root = resolveRoot(scenarioSetId);
  const scenarioDoc = await getData(db, scenarioSetId);
  const scenarios = Array.isArray(scenarioDoc?.scenarios) ? scenarioDoc.scenarios : [];

  const likelyOrderDoc = /tutorial/i.test(scenarioSetId) ? 'order_tutorial' : 'order_main';
  const orderFound = await firstExisting(db, [likelyOrderDoc, `${root}Orders`, `${root}_orders`]);
  const orders = Array.isArray(orderFound.data?.orders) ? orderFound.data.orders : [];

  const optimalFound = await firstExisting(db, [
    `${root}Optimal`,
    `${root}_optimal`,
    /tutorial/i.test(scenarioSetId) ? 'optimal_tutorial' : 'optimal',
    'optimal'
  ]);
  const optimal = Array.isArray(optimalFound.data?.optimal) ? optimalFound.data.optimal : [];
  const oldMeta = optimalFound.data?.metadata && typeof optimalFound.data.metadata === 'object'
    ? optimalFound.data.metadata
    : {};

  await setDoc(doc(db, 'MasterData', root), {
    scenarios,
    orders,
    optimal,
    metadata: {
      ...oldMeta,
      migratedAt: new Date().toISOString(),
      migratedFrom: {
        scenarioDoc: scenarioSetId,
        ordersDoc: orderFound.id,
        optimalDoc: optimalFound.id
      }
    }
  });

  results.push({
    scenarioSetId,
    root,
    counts: { scenarios: scenarios.length, orders: orders.length, optimal: optimal.length },
    source: { ordersDoc: orderFound.id, optimalDoc: optimalFound.id }
  });
}

// Update config pointers to grouped roots for clarity (no fallback mode)
if (central?.scenario_set) {
  await setDoc(doc(db, 'MasterData', 'centralConfig'), {
    ...central,
    scenario_set: resolveRoot(central.scenario_set)
  });
}
if (tutorial?.scenario_set) {
  await setDoc(doc(db, 'MasterData', 'tutorialConfig'), {
    ...tutorial,
    scenario_set: resolveRoot(tutorial.scenario_set)
  });
}

console.log(JSON.stringify({ migrated: results, centralTo: resolveRoot(central?.scenario_set), tutorialTo: resolveRoot(tutorial?.scenario_set) }, null, 2));
