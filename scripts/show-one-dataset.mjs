import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

const snap = await getDoc(doc(db, 'MasterData', 'experiment'));
if (!snap.exists()) {
  console.log('NOT_FOUND');
  process.exit(0);
}
const d = snap.data() || {};
const out = {
  metadata: d.metadata || {},
  scenarios_count: Array.isArray(d.scenarios) ? d.scenarios.length : 0,
  orders_count: Array.isArray(d.orders) ? d.orders.length : 0,
  optimal_count: Array.isArray(d.optimal) ? d.optimal.length : 0,
  scenarios_sample: Array.isArray(d.scenarios) ? d.scenarios.slice(0, 2) : [],
  orders_sample: Array.isArray(d.orders) ? d.orders.slice(0, 2) : [],
  optimal_sample: Array.isArray(d.optimal) ? d.optimal.slice(0, 2) : []
};
console.log(JSON.stringify(out, null, 2));
