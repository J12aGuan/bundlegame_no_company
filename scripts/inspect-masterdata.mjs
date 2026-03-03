import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
const snap = await getDocs(collection(db, 'MasterData'));
const docs = [];
for (const d of snap.docs) {
  const data = d.data() || {};
  docs.push({
    id: d.id,
    keys: Object.keys(data),
    scenarios: Array.isArray(data.scenarios) ? data.scenarios.length : undefined,
    orders: Array.isArray(data.orders) ? data.orders.length : undefined,
    optimal: Array.isArray(data.optimal) ? data.optimal.length : undefined
  });
}
console.log(JSON.stringify(docs, null, 2));
