// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { browser } from '$app/environment';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "REDACTED_API_KEY",
  authDomain: "REDACTED_PROJECT_ID.firebaseapp.com",
  projectId: "REDACTED_PROJECT_ID",
  storageBucket: "REDACTED_PROJECT_ID.appspot.com",
  messagingSenderId: "REDACTED_SENDER_ID",
  appId: "1:REDACTED_SENDER_ID:web:c76c1f46364a8a072fb655",
  measurementId: "REDACTED_MEASUREMENT_ID"
};

// Initialize Firebase only in the browser
let app;
let firestore;

if (browser && !getApps().length) {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
}

export { firestore, app };