import { initializeApp } from "firebase/app";

const required = (key) => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing Firebase env var: ${key}. Add it to abpc/.env (see abpc/.env.example).`);
  }
  return String(value);
};

const firebaseConfig = {
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
};

export const firebaseApp = initializeApp(firebaseConfig);

