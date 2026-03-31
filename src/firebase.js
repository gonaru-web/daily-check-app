import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "여기에_진짜_apiKey",
  authDomain: "여기에_진짜_authDomain",
  projectId: "여기에_진짜_projectId",
  storageBucket: "여기에_진짜_storageBucket",
  messagingSenderId: "여기에_진짜_messagingSenderId",
  appId: "여기에_진짜_appId",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
