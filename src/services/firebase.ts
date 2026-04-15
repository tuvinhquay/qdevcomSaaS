import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const hasAllFirebaseEnv = Object.values(firebaseConfig).every(Boolean);
const apiKeyLooksValid = firebaseConfig.apiKey.startsWith("AIza");

let firebaseInitError: string | null = null;
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (!hasAllFirebaseEnv) {
  firebaseInitError =
    "Missing Firebase environment variables in .env.local";
} else if (!apiKeyLooksValid) {
  firebaseInitError =
    "NEXT_PUBLIC_FIREBASE_API_KEY is not in the expected Firebase format";
} else {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    firebaseInitError =
      error instanceof Error ? error.message : "Failed to initialize Firebase";
  }
}

export const firebaseEnabled = auth !== null && googleProvider !== null;
export { app, auth, googleProvider, firebaseInitError };
