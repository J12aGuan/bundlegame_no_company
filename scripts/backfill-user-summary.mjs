import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, Timestamp } from 'firebase/firestore';

function parseDotEnv(raw = '') {
  const out = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = parseDotEnv(envRaw);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

for (const [key, value] of Object.entries(firebaseConfig)) {
  if (!value) {
    throw new Error(`Missing Firebase env var for ${key}`);
  }
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

function generateResultAccessKey() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 24;
  let key = '';
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i += 1) {
      key += alphabet[bytes[i] % alphabet.length];
    }
    return key;
  }
  for (let i = 0; i < length; i += 1) {
    key += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return key;
}

async function backfillUserSummary() {
  const usersSnap = await getDocs(collection(firestore, 'Users'));
  let created = 0;
  let updated = 0;

  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const userData = userDoc.data() || {};
    const summaryRef = doc(firestore, 'Users', userId, 'Summary', 'summary');
    const summarySnap = await getDoc(summaryRef);

    if (summarySnap.exists()) {
      const current = summarySnap.data() || {};
      if (current.resultAccessKey) {
        continue;
      }
      await setDoc(summaryRef, {
        resultAccessKey: generateResultAccessKey(),
        updatedAt: Timestamp.fromDate(new Date())
      }, { merge: true });
      updated += 1;
      console.log(`Updated Summary key for ${userId}`);
      continue;
    }

    const payload = {
      scenarioSet: null,
      totalRounds: 0,
      roundsCompleted: Number(userData.uniqueSetsComplete) || 0,
      optimalChoices: 0,
      totalGameTime: Number(userData.gametime) || 0,
      completedGame: false,
      earnings: Number(userData.earnings) || 0,
      resultAccessKey: generateResultAccessKey(),
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    await setDoc(summaryRef, payload);
    created += 1;
    console.log(`Created Summary for ${userId}`);
  }

  console.log(JSON.stringify({ created, updated }, null, 2));
}

backfillUserSummary().catch((error) => {
  console.error(error);
  process.exit(1);
});
