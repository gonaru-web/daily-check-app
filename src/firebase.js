import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBDgun4u92y2D9xjan7ya4vTfEovjy9CXE",
  authDomain: "daily-check-799a4.firebaseapp.com",
  projectId: "daily-check-799a4",
  storageBucket: "daily-check-799a4.firebasestorage.app",
  messagingSenderId: "496567511020",
  appId: "1:496567511020:web:17bde98f1e828dc9f4c2c9",
  measurementId: "G-0NHE4EYJ1C"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
