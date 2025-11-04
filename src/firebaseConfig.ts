// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUev-dP6Iyg-jmFO_PeXoAaDCD76P6DFQ",
  authDomain: "finanzas-personales-eb58e.firebaseapp.com",
  projectId: "finanzas-personales-eb58e",
  storageBucket: "finanzas-personales-eb58e.appspot.com",
  messagingSenderId: "845579942289",
  appId: "1:845579942289:web:a3cfda6326560144d64230",
  measurementId: "G-CT9XB7XG63"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);