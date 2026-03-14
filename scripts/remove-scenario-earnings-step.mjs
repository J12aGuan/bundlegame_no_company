import { initializeApp, getApps } from "firebase/app";
import { getDoc, getFirestore, doc, setDoc } from "firebase/firestore";
import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "");

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

function cleanScenarioEntry(entry = {}) {
  if (!entry || typeof entry !== "object" || entry.type !== "scenario_dataset") {
    return entry;
  }

  const cleanedMetadata = { ...(entry.metadata || {}) };
  delete cleanedMetadata.earningsStep;
  delete cleanedMetadata.earningStep;

  return {
    ...entry,
    metadata: cleanedMetadata
  };
}

async function main() {
  const datasetsRef = doc(firestore, "MasterData", "datasets");
  const snap = await getDoc(datasetsRef);

  if (!snap.exists()) {
    console.log("MasterData/datasets not found.");
    return;
  }

  const data = snap.data() || {};
  const datasets = data.datasets && typeof data.datasets === "object" ? data.datasets : {};
  const cleanedDatasets = {};
  let updatedCount = 0;

  for (const [key, value] of Object.entries(datasets)) {
    const cleaned = cleanScenarioEntry(value);
    cleanedDatasets[key] = cleaned;
    if (JSON.stringify(cleaned) !== JSON.stringify(value)) {
      updatedCount += 1;
    }
  }

  await setDoc(datasetsRef, { datasets: cleanedDatasets }, { merge: true });
  console.log(`Removed earningsStep from ${updatedCount} scenario dataset entries.`);
}

main().catch((error) => {
  console.error("Failed to remove scenario earningsStep fields:", error);
  process.exit(1);
});
