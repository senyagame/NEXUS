// nexus-id.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDocs, query, where, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
    authDomain: "nexus-90a19.firebaseapp.com",
    projectId: "nexus-90a19",
    storageBucket: "nexus-90a19.firebasestorage.app",
    messagingSenderId: "78051357921",
    appId: "1:78051357921:web:477ab2794b67e0c706b3a0",
    measurementId: "G-X65550ENG3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ОБЕРНИ ВЕСЬ КОД, КОТОРЫЙ РАБОТАЕТ С DOM-ЭЛЕМЕНТАМИ, В DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Перемести все эти объявления и присвоения внутрь DOMContentLoaded
    const authSection = document.getElementById('auth-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const userDashboard = document.getElementById('user-dashboard');

    const loginIdentifierInput = document.getElementById('login-email');
    if (loginIdentifierInput) { // ДОБАВЛЕНА ПРОВЕРКА НА СУЩЕСТВОВАНИЕ ЭЛЕМЕНТА
        loginIdentifierInput.placeholder = "Email / Логин / Номер телефона";
    } else {
        console.error("Элемент с ID 'login-email' не найден.");
    }

    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const loginMessage = document.getElementById('login-message');

    const registerUsernameInput = document.getElementById('register-username');
    const registerEmailInput = document.getElementById('register-email');
    const registerPhoneInput = document.getElementById('register-phone');
    const registerPasswordInput = document.getElementById('register-password');
    const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
    const registerButton = document.getElementById('register-button');
    const registerMessage = document.getElementById('register-message');

    const showRegisterFormLink = document.getElementById('show-register-form-link');
    const showLoginFormLink = document.getElementById('show-login-form-link');

    const userDisplayNameSpan = document.getElementById('user-display-name');
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const backToProfileLink = document.getElementById('back-to-profile-link');

    // Удалена переменная yandexLoginButton, так как кнопка удалена из HTML

    // Перемещаем ВСЕ ФУНКЦИИ И ОБРАБОТЧИКИ СОБЫТИЙ, КОТОРЫЕ РАБОТАЮТ С DOM
    // ВНИМАНИЕ: Если функция 'showMessage' и 'showAuthForm' используются вне DOMContentLoaded,
    // их нужно оставить вне, но их вызовы, работающие с DOM, должны быть внутри.
    // В данном случае, так как они работают с элементами, которые объявляются внутри,
    // их тоже логично поместить внутрь или убедиться, что они вызываются после DOMContentLoaded.

    function showMessage(element, message, type) {
        if (!element) {
            console.error(`Элемент для сообщения не найден: ${message}`);
            return;
        }
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
            element.textContent = '';
        }, 5000);
    }

    function showAuthForm(formToShow) {
        if (!loginForm || !registerForm) {
            console.error("Один из элементов формы (loginForm или registerForm) не найден.");
            return;
        }

        if (formToShow === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else if (formToShow === 'register') {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        }
        loginMessage.style.display = 'none';
        registerMessage.style.display = 'none';
    }

    // Все обработчики событий и вызовы функций, которые зависят от DOM-элементов
    // должны быть здесь или вызваны после этого блока.
    if (showRegisterFormLink) {
        showRegisterFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Нажата ссылка 'Зарегистрироваться'.");
            showAuthForm('register');
        });
    } else {
        console.error("Элемент с ID 'show-register-form-link' не найден в DOM.");
    }

    if (showLoginFormLink) {
        showLoginFormLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Нажата ссылка 'Авторизоваться'.");
            showAuthForm('login');
        });
    } else {
        console.error("Элемент с ID 'show-login-form-link' не найден в DOM.");
    }

    registerButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const username = registerUsernameInput.value.trim();
        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value;
        const confirmPassword = registerConfirmPasswordInput.value;
        const phoneNumber = registerPhoneInput.value.trim();

        if (!username || !email || !password || !confirmPassword) {
            showMessage(registerMessage, "Пожалуйста, заполните все обязательные поля.", "error");
            return;
        }
        if (password !== confirmPassword) {
            showMessage(registerMessage, "Пароли не совпадают!", "error");
            return;
        }
        if (password.length < 6) {
            showMessage(registerMessage, "Пароль должен быть не менее 6 символов.", "error");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                username: username,
                email: email,
                phoneNumber: phoneNumber,
                avatarUrl: "",
                createdAt: serverTimestamp(),
                authMethod: 'email_password'
            }, { merge: true });

            showMessage(registerMessage, "Регистрация успешна! Вы вошли в систему.", "success");
            console.log("Пользователь зарегистрирован и его профиль создан в Firestore:", user.uid, username);

            window.location.href = "profile.html";

        } catch (error) {
            let errorMessage = "Произошла ошибка при регистрации.";
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Этот Email уже используется.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Некорректный формат Email.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Пароль слишком слабый (минимум 6 символов).';
                    break;
                default:
                    errorMessage = `Ошибка: ${error.message}`;
            }
            console.error("Ошибка регистрации:", error.code, error.message);
            showMessage(registerMessage, errorMessage, "error");
        }
    });

    loginButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const identifier = loginIdentifierInput.value.trim();
        const password = loginPasswordInput.value;

        if (!identifier || !password) {
            showMessage(loginMessage, "Пожалуйста, введите Email / Логин / Номер телефона и пароль.", "error");
            return;
        }

        try {
            let emailToSignIn = identifier;

            if (!identifier.includes('@') || !identifier.includes('.')) {
                console.log(`Ищем пользователя по логину или телефону: ${identifier}`);
                const usersRef = collection(db, 'users');
                let q;

                q = query(usersRef, where('username', '==', identifier));
                let querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    q = query(usersRef, where('phoneNumber', '==', identifier));
                    querySnapshot = await getDocs(q);
                }

                if (!querySnapshot.empty) {
                    const userData = querySnapshot.docs[0].data();
                    emailToSignIn = userData.email;
                    console.log(`Найден пользователь по идентификатору: ${identifier}, его email: ${emailToSignIn}`);
                } else {
                    showMessage(loginMessage, "Пользователь с таким логином или номером телефона не найден.", "error");
                    return;
                }
            }

            await signInWithEmailAndPassword(auth, emailToSignIn, password);
            showMessage(loginMessage, "Вход успешен!", "success");

            window.location.href = "profile.html";

        } catch (error) {
            let errorMessage = "Произошла ошибка при входе.";
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Некорректный формат Email.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Аккаунт отключен.';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Неверные данные для входа.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль.';
                    break;
                default:
                    errorMessage = `Ошибка: ${error.message}`;
            }
            console.error("Ошибка входа:", error.code, error.message);
            showMessage(loginMessage, errorMessage, "error");
        }
    });

    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Пользователь вышел.");
            window.location.href = "auth.html";
        } catch (error) {
            console.error("Ошибка выхода:", error.message);
        }
    });

    onAuthStateChanged(auth, async (user) => {
        if (!authSection || !userDashboard || !backToProfileLink) {
            console.error("Один из основных элементов UI (authSection, userDashboard, backToProfileLink) не найден.");
            return;
        }

        if (user) {
            authSection.style.display = 'none';
            userDashboard.style.display = 'block';
            backToProfileLink.style.display = 'block';

            userDisplayNameSpan.textContent = user.displayName || user.email || 'Неизвестный пользователь';
            userEmailSpan.textContent = user.email;

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.username) {
                    userDisplayNameSpan.textContent = userData.username;
                }
            }

            console.log("Пользователь вошел:", user.email, "UID:", user.uid, "DisplayName:", user.displayName);

            // Логика, связанная с сохранением данных пользователя Яндекс ID, удалена
        } else {
            authSection.style.display = 'block';
            userDashboard.style.display = 'none';
            backToProfileLink.style.display = 'none';
            showAuthForm('login');
            console.log("Пользователь вышел из системы.");
        }
    });

    // Этот слушатель уже был, он будет работать после перемещения остального кода
    // if (!auth.currentUser) {
    //     showAuthForm('login');
    // }
    // Примечание: `auth.currentUser` может быть `null` в момент `DOMContentLoaded`,
    // поэтому этот блок, возможно, не идеален для начального отображения формы.
    // Лучше полагаться на `onAuthStateChanged` для определения начального состояния,
    // но для быстрого решения можно оставить или адаптировать.
    // Твой текущий код уже показывает форму логина в `onAuthStateChanged` при выходе,
    // что логичнее.
    // Поэтому, если ты хочешь, чтобы форма логина всегда отображалась по умолчанию,
    // когда пользователь не вошел, этот if можно оставить.
    if (!auth.currentUser) {
        showAuthForm('login');
    }

}); // Конец DOMContentLoaded