import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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

const datasetRoots = ['experiment', 'experiment_tutorial'];
const migrated = [];

for (const root of datasetRoots) {
  const srcRef = doc(db, 'MasterData', root);
  const srcSnap = await getDoc(srcRef);
  if (!srcSnap.exists()) {
    migrated.push({ root, skipped: true, reason: 'source missing' });
    continue;
  }

  const data = srcSnap.data() || {};
  const entry = {
    type: 'scenario_dataset',
    version: 1,
    scenarios: Array.isArray(data.scenarios) ? data.scenarios : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    optimal: Array.isArray(data.optimal) ? data.optimal : [],
    metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {}
  };

  await setDoc(doc(db, 'MasterData', 'datasets'), {
    datasets: {
      [root]: entry
    }
  }, { merge: true });

  migrated.push({
    root,
    counts: {
      scenarios: entry.scenarios.length,
      orders: entry.orders.length,
      optimal: entry.optimal.length
    }
  });
}

// Remove old standalone dataset docs after migration.
for (const root of datasetRoots) {
  const ref = doc(db, 'MasterData', root);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
  }
}

const datasetsSnap = await getDoc(doc(db, 'MasterData', 'datasets'));
const keys = datasetsSnap.exists() ? Object.keys((datasetsSnap.data()?.datasets || {})).sort() : [];

console.log(JSON.stringify({ migrated, datasetsDocKeys: keys }, null, 2));
