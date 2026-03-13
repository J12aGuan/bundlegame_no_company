import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { deleteField, doc, getFirestore, setDoc } from 'firebase/firestore';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');

if (!fs.existsSync(envPath)) {
  throw new Error(`Missing .env at ${envPath}`);
}

for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!(key in process.env)) process.env[key] = value;
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

for (const [key, value] of Object.entries(firebaseConfig)) {
  if (!value) throw new Error(`Missing Firebase env: ${key}`);
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const tutorialRef = doc(firestore, 'MasterData', 'tutorialConfig');
await setDoc(tutorialRef, { timeLimit: deleteField() }, { merge: true });

console.log(JSON.stringify({
  ok: true,
  doc: 'MasterData/tutorialConfig',
  removedField: 'timeLimit'
}, null, 2));
