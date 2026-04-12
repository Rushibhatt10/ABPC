import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { firebaseApp } from "./firebaseApp";

export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

