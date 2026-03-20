import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase/app';
import { collection, deleteField, doc, getDoc, getDocs, getFirestore, setDoc } from 'firebase/firestore';

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

async function main() {
  const usersSnap = await getDocs(collection(firestore, 'Users'));
  let scannedUsers = 0;
  let updatedSummaries = 0;
  let missingSummaries = 0;

  for (const userDoc of usersSnap.docs) {
    scannedUsers += 1;
    const summaryRef = doc(firestore, 'Users', userDoc.id, 'Summary', 'summary');
    const summarySnap = await getDoc(summaryRef);

    if (!summarySnap.exists()) {
      missingSummaries += 1;
      continue;
    }

    const data = summarySnap.data() || {};
    const hasCreatedAt = Object.prototype.hasOwnProperty.call(data, 'createdAt');
    const hasUpdatedAt = Object.prototype.hasOwnProperty.call(data, 'updatedAt');

    if (!hasCreatedAt && !hasUpdatedAt) {
      continue;
    }

    await setDoc(summaryRef, {
      createdAt: deleteField(),
      updatedAt: deleteField()
    }, { merge: true });

    updatedSummaries += 1;
  }

  console.log(JSON.stringify({
    ok: true,
    scannedUsers,
    updatedSummaries,
    missingSummaries,
    removedFields: ['createdAt', 'updatedAt']
  }, null, 2));
}

main().catch((error) => {
  console.error('Failed to remove summary timestamps:', error);
  process.exit(1);
});
