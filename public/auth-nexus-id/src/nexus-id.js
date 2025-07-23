// public/auth-nexus-id/src/nexus-id.js

// ✅ Импортируем auth, db и ВСЕ НЕОБХОДИМЫЕ ФУНКЦИИ ИЗ firebase.js
import {
    auth,
    db,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    getDoc
} from './firebase.js'; // <-- Ключевое изменение: путь импорта на firebase.js

const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userDashboard = document.getElementById('user-dashboard');

const loginIdentifierInput = document.getElementById('login-email');
// Проверяем, существует ли элемент, прежде чем пытаться установить placeholder
if (loginIdentifierInput) {
    loginIdentifierInput.placeholder = "Email / Логин / Номер телефона";
} else {
    console.warn("Элемент с ID 'login-email' не найден.");
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

if (registerButton) { // Добавлена проверка на существование элемента
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
} else {
    console.warn("Элемент с ID 'register-button' не найден.");
}


if (loginButton) { // Добавлена проверка на существование элемента
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
} else {
    console.warn("Элемент с ID 'login-button' не найден.");
}


if (logoutButton) { // Добавлена проверка на существование элемента
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Пользователь вышел.");
            window.location.href = "auth.html";
        } catch (error) {
            console.error("Ошибка выхода:", error.message);
        }
    });
} else {
    console.warn("Элемент с ID 'logout-button' не найден.");
}


// Убедимся, что все элементы, используемые в onAuthStateChanged, существуют
// Этот блок кода должен быть устойчив к отсутствию элементов, если скрипт используется на разных страницах
onAuthStateChanged(auth, async (user) => {
    if (authSection && userDashboard && backToProfileLink) {
        if (user) {
            authSection.style.display = 'none';
            userDashboard.style.display = 'block';
            backToProfileLink.style.display = 'block';

            if (userDisplayNameSpan) {
                userDisplayNameSpan.textContent = user.displayName || user.email || 'Неизвестный пользователь';
            }
            if (userEmailSpan) {
                userEmailSpan.textContent = user.email;
            }

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.username && userDisplayNameSpan) {
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
    } else {
        // Если элементы UI отсутствуют, это не является ошибкой для этого скрипта,
        // если он предназначен для работы на разных страницах (например, на auth.html и profile.html)
        // console.warn("Один из основных элементов UI (authSection, userDashboard, backToProfileLink) не найден. Это нормально, если этот скрипт работает на странице, где эти элементы не требуются.");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (authSection && loginForm) { 
        if (!auth.currentUser) {
            showAuthForm('login');
        }
    }
});