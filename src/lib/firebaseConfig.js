// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { browser } from '$app/environment';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// Values loaded from environment variables (.env file)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Dev-only Firestore/Auth emulator hook. OFF unless VITE_USE_FIREBASE_EMULATOR === "true",
// so a normal build NEVER points at the emulator and a normal emulator session never leaks
// to prod. When enabled, both the game and the admin masterdata UI read/write the LOCAL
// emulator (project bundling-63c10 is not touched). This is the unblock for the pilot
// smoke-test: run `firebase emulators:start`, import build/<version>.seed.json via the admin
// masterdata UI, point central config scenario_set at it, then play the real game locally.
// See docs/EMULATOR_SMOKE.md.
const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
const EMU_HOST = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
const EMU_FIRESTORE_PORT = Number(import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT || 8080);
const EMU_AUTH_PORT = Number(import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT || 9099);

// Connect the emulators exactly once, on the FRESH app, before any Firestore/Auth call
// (connectFirestoreEmulator throws if the instance has already been used).
function connectEmulators(firestoreInstance, authInstance) {
  if (!USE_EMULATOR) return;
  try {
    connectFirestoreEmulator(firestoreInstance, EMU_HOST, EMU_FIRESTORE_PORT);
    connectAuthEmulator(authInstance, `http://${EMU_HOST}:${EMU_AUTH_PORT}`, { disableWarnings: true });
    // Loud on purpose: make it unmistakable the app is on LOCAL data, not production.
    console.warn(`[firebase] EMULATOR MODE — Firestore ${EMU_HOST}:${EMU_FIRESTORE_PORT}, Auth ${EMU_HOST}:${EMU_AUTH_PORT} (prod project NOT used)`);
  } catch (err) {
    console.error("[firebase] failed to connect emulators:", err);
  }
}

// Initialize Firebase only in the browser
let app;
let firestore;
let auth;

if (browser && !getApps().length) {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  auth = getAuth(app);
  connectEmulators(firestore, auth); // fresh app only -> safe single connect before any use
} else if (browser) {
  app = getApps()[0];
  firestore = getFirestore(app);
  auth = getAuth(app);
}

export { firestore, auth, app };
