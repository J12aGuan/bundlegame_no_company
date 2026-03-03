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
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return out;
}

function normalizeBase(name = '') {
  return String(name || '')
    .trim()
    .replace(/\.json$/i, '')
    .replace(/(Scenarios|Scenario|Orders|Order|Optimal)$/i, '')
    .replace(/[_-]+$/g, '');
}

function remapId(value, map) {
  const key = String(value ?? '');
  return map.get(key) || key;
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

const roots = ['experiment', 'experiment_tutorial'];
const result = [];

for (const root of roots) {
  const ref = doc(db, 'MasterData', root);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    result.push({ root, skipped: true, reason: 'missing doc' });
    continue;
  }

  const data = snap.data() || {};
  const base = normalizeBase(root);
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const optimal = Array.isArray(data.optimal) ? data.optimal : [];

  const oldOrderIds = orders.map((o) => String(o?.id ?? ''));
  const orderIdMap = new Map();
  const renamedOrders = orders.map((o, idx) => {
    const newId = `${base}Order${idx + 1}`;
    orderIdMap.set(String(o?.id ?? ''), newId);
    return { ...o, id: newId };
  });

  const sortedScenarios = [...scenarios].sort((a, b) => (Number(a?.round) || 0) - (Number(b?.round) || 0));
  const scenarioIdMap = new Map();
  const renamedScenarios = sortedScenarios.map((s, idx) => {
    const oldId = String(s?.scenario_id ?? '');
    const newScenarioId = `${base}Scenario${idx + 1}`;
    if (oldId) scenarioIdMap.set(oldId, newScenarioId);

    const orderIds = Array.isArray(s?.order_ids)
      ? s.order_ids.map((id) => remapId(id, orderIdMap))
      : [];

    return {
      ...s,
      round: Number(s?.round) || (idx + 1),
      scenario_id: newScenarioId,
      order_ids: orderIds
    };
  });

  const renamedOptimal = optimal.map((o = {}, idx) => ({
    ...o,
    scenario_id: remapId(o?.scenario_id, scenarioIdMap),
    best_bundle_ids: Array.isArray(o?.best_bundle_ids)
      ? o.best_bundle_ids.map((id) => remapId(id, orderIdMap))
      : [],
    second_best_bundle_ids: Array.isArray(o?.second_best_bundle_ids)
      ? o.second_best_bundle_ids.map((id) => remapId(id, orderIdMap))
      : []
  }));

  await setDoc(ref, {
    ...data,
    orders: renamedOrders,
    scenarios: renamedScenarios,
    optimal: renamedOptimal
  });

  result.push({
    root,
    base,
    counts: {
      orders: renamedOrders.length,
      scenarios: renamedScenarios.length,
      optimal: renamedOptimal.length
    },
    sample: {
      scenario_id: renamedScenarios[0]?.scenario_id || null,
      order_id: renamedOrders[0]?.id || null
    }
  });
}

console.log(JSON.stringify(result, null, 2));
