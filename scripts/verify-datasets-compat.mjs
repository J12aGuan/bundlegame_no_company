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

const [centralSnap, tutorialSnap, datasetsSnap] = await Promise.all([
  getDoc(doc(db, 'MasterData', 'centralConfig')),
  getDoc(doc(db, 'MasterData', 'tutorialConfig')),
  getDoc(doc(db, 'MasterData', 'datasets'))
]);

const centralSet = centralSnap.data()?.scenario_set;
const tutorialSet = tutorialSnap.data()?.scenario_set;
const map = datasetsSnap.data()?.datasets || {};

const check = (id) => {
  const d = map[id];
  return {
    exists: !!d,
    scenarios: Array.isArray(d?.scenarios) ? d.scenarios.length : 0,
    orders: Array.isArray(d?.orders) ? d.orders.length : 0,
    optimal: Array.isArray(d?.optimal) ? d.optimal.length : 0,
    type: d?.type || null,
    version: d?.version || null
  };
};

console.log(JSON.stringify({
  centralSet,
  tutorialSet,
  central: check(centralSet),
  tutorial: check(tutorialSet)
}, null, 2));
