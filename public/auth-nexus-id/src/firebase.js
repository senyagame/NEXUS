// firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  OAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ✅ Конфигурация твоего проекта Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
  authDomain: "nexus-90a19.firebaseapp.com",
  projectId: "nexus-90a19",
  storageBucket: "nexus-90a19.appspot.com",
  messagingSenderId: "327211386840",
  appId: "1:327211386840:web:69110e5b7fd7e7f3b69327"
};

// ✅ Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Экспорт нужных переменных и функций ОДИН РАЗ
export {
  app,
  auth,
  db,
  OAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
};
