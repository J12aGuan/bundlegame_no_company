import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

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
const legacyIds = [
  'experimentScenarios',
  'experimentScenarios_tutorial',
  'order_main',
  'order_tutorial',
  'optimal',
  'optimal_tutorial'
];

const deleted = [];
const skipped = [];

for (const id of legacyIds) {
  const ref = doc(db, 'MasterData', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    skipped.push(id);
    continue;
  }
  await deleteDoc(ref);
  deleted.push(id);
}

const listSnap = await getDocs(collection(db, 'MasterData'));
const remaining = listSnap.docs.map((d) => d.id).sort();

console.log(JSON.stringify({ deleted, skipped, remaining }, null, 2));
