import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC9a3kmI18HIwL1n_flmB14TYDV8vwGm0Q",
  authDomain: "maya-71d7b.firebaseapp.com",
  projectId: "maya-71d7b",
  storageBucket: "maya-71d7b.firebasestorage.app",
  messagingSenderId: "573647686364",
  appId: "1:573647686364:web:4e8c6200d4c7b9eb950219",
  measurementId: "G-TMZ3SNM2QB"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);