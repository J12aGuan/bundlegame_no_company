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

const allowedKeys = new Set([
  'datasetName',
  'targetDifficulty',
  'totalRounds',
  'maxBundle',
  'payMin',
  'payMax',
  'earningsStep'
]);

for (const id of ['experiment', 'experiment_tutorial']) {
  const ref = doc(db, 'MasterData', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) continue;
  const data = snap.data() || {};
  const oldMeta = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const cleaned = {};
  for (const [k, v] of Object.entries(oldMeta)) {
    if (allowedKeys.has(k)) cleaned[k] = v;
  }
  await setDoc(ref, { metadata: cleaned }, { merge: true });
}

console.log('metadata cleaned');
