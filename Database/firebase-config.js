// Database/firebase-config.js (ПРИМЕР, УБЕДИСЬ, ЧТО У ТЕБЯ ТАК)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  // ТВОИ РЕАЛЬНЫЕ ДАННЫЕ NEXUS ИЗ КОНСОЛИ FIREBASE
  apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
  authDomain: "nexus-90a19.firebaseapp.com",
  projectId: "nexus-90a19",
  storageBucket: "nexus-90a19.firebasestorage.app",
  messagingSenderId: "78051357921",
  appId: "1:78051357921:web:477ab2794b67e0c706b3a0",
  measurementId: "G-X65550ENG3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };