// public/auth-nexus-id/src/firebase.js

// Импортируем все необходимые функции из Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    OAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword, // Добавляем, так как это может быть полезно для централизации
    createUserWithEmailAndPassword // Добавляем, так как это может быть полезно для централизации
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    getDoc,
    updateDoc, // Добавляем updateDoc, arrayUnion, arrayRemove для music.js
    arrayUnion,
    arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ✅ Единая и правильная конфигурация вашего проекта Firebase
// Используйте ту, которая была в nexus-id.js, так как она более полная
const firebaseConfig = {
    apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
    authDomain: "nexus-90a19.firebaseapp.com",
    projectId: "nexus-90a19",
    storageBucket: "nexus-90a19.firebasestorage.app",
    messagingSenderId: "78051357921",
    appId: "1:78051357921:web:477ab2794b67e0c706b3a0",
    measurementId: "G-X65550ENG3"
};

// ✅ Инициализация Firebase приложения
const app = initializeApp(firebaseConfig);

// ✅ Инициализация Firebase Authentication и Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Экспорт всех нужных переменных и функций
// Теперь все они будут доступны из этого одного файла
export {
    app,
    auth,
    db,
    OAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
};

console.log("Firebase инициализирован и экспортированы сервисы из firebase.js");