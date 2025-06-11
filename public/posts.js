import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === ВАША ПРАВИЛЬНАЯ FIREBASE КОНФИГУРАЦИЯ ДЛЯ ПРОЕКТА nexus-90a19 ===
const firebaseConfig = {
  apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
  authDomain: "nexus-90a19.firebaseapp.com",
  projectId: "nexus-90a19",
  storageBucket: "nexus-90a19.firebasestorage.app",
  messagingSenderId: "78051357921",
  appId: "1:78051357921:web:477ab2794b67e0c706b3a0",
  measurementId: "G-X65550ENG3"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Получаем ссылки на модальные окна и элементы
const postModal = document.getElementById("post-modal");
const mainModal = document.getElementById("modal");

// Глобальные функции для открытия/закрытия модальных окон
// Эти функции должны быть доступны глобально, так как они вызываются из onclick в HTML
window.openPostModal = function () {
    if (postModal) {
        postModal.style.display = "block";
    }
};

window.closePostModal = function () {
    if (postModal) {
        postModal.style.display = "none";
    }
};

window.openModal = function () {
    if (mainModal) {
        mainModal.style.display = "block";
    }
};

window.closeModal = function () {
    if (mainModal) {
        mainModal.style.display = "none";
    }
};

document.addEventListener("DOMContentLoaded", function () {
    const headerText = document.getElementById("header-text");
    const postForm = document.getElementById("post-form");
    const postsContainer = document.getElementById("posts-container");

    let currentUserUid = null; // Переменная для хранения UID текущего пользователя
    let unsubscribe; // Для отписки от слушателя Firestore

    // Анимации заголовков и текстов - убедитесь, что эти элементы существуют в вашем HTML
    // Если их нет, этот код можно удалить или закомментировать
    const newsText = document.getElementById("news-text");
    const comingSoonText = document.getElementById("coming-soon");

    if (headerText) {
        headerText.addEventListener("animationend", function () {
            if (newsText) {
                newsText.style.display = "block";
                newsText.style.animationPlayState = "running";
            }
        });
    }

    if (newsText) {
        newsText.addEventListener("animationend", function () {
            if (comingSoonText) {
                comingSoonText.style.display = "block";
                comingSoonText.style.animationPlayState = "running";
            }
        });
    }

    // Обработчик изменения состояния авторизации
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid; // Пользователь вошел, сохраняем его UID
            console.log("🔥 [post.js]: Пользователь вошел. UID:", currentUserUid); // Отладочное сообщение
            loadPosts(currentUserUid); // Загружаем заметки для этого пользователя
            // Если у вас есть элементы, которые должны быть видимы только для авторизованных,
            // можно управлять их видимостью здесь.
        } else {
            currentUserUid = null; // Пользователь вышел
            console.log("❌ [post.js]: Пользователь не вошел."); // Отладочное сообщение
            postsContainer.innerHTML = ""; // Очищаем заметки
            if (unsubscribe) {
                unsubscribe(); // Отписываемся от слушателя, если он был активен
            }
            // Если у вас есть элементы, которые должны быть видимы только для неавторизованных,
            // можно управлять их видимостью здесь.
        }
    });

    // Обработка формы добавления поста
    if (postForm) {
        postForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const titleInput = document.getElementById("title");
            const descriptionInput = document.getElementById("description");

            const title = titleInput.value;
            const description = descriptionInput.value;

            if (currentUserUid) { // Проверяем, авторизован ли пользователь перед добавлением заметки
                console.log("Attempting to add post with UID:", currentUserUid); // Отладочное сообщение
                addPost({ title, description, uid: currentUserUid });
                closePostModal();
                titleInput.value = "";
                descriptionInput.value = "";
            } else {
                alert("Пожалуйста, войдите в аккаунт, чтобы добавить заметку.");
                console.warn("User not logged in. Cannot add post."); // Отладочное сообщение
            }
        });
    }

    // Функция добавления поста в Firebase
    async function addPost(post) {
        try {
            const notesCollectionRef = collection(db, "notes");
            const docRef = await addDoc(notesCollectionRef, post);
            console.log("✅ Заметка добавлена с ID: ", docRef.id);
        } catch (error) {
            console.error("❌ Ошибка при добавлении заметки: ", error);
            alert("Произошла ошибка при добавлении заметки. Проверьте консоль для деталей.");
        }
    }

    // Функция отображения поста на странице
    function displayPost(post) {
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.innerHTML = `
            <div class="title">${post.title}</div>
            <div class="description">${post.description}</div>
            <button class="delete-btn" onclick="confirmDelete('${post.id}')">Удалить</button>
        `;
        postsContainer.appendChild(postElement);
    }

    // Функция подтверждения удаления поста (глобальная)
    window.confirmDelete = function (postId) {
        const confirmAction = confirm("Вы уверены, что хотите удалить эту запись? Вы не сможете её восстановить!");
        if (confirmAction) {
            deletePost(postId);
        }
    };

    // Функция удаления поста из Firebase
    async function deletePost(postId) {
        try {
            // Проверяем, что пользователь авторизован, прежде чем пытаться удалить
            // Это также контролируется правилами безопасности Firestore, но полезно для UI.
            if (!currentUserUid) {
                alert("Вы должны быть авторизованы, чтобы удалить заметку.");
                return;
            }

            const noteDocRef = doc(db, "notes", postId);
            await deleteDoc(noteDocRef);
            console.log("🗑️ Заметка удалена с ID: ", postId);
        } catch (error) {
            console.error("❌ Ошибка при удалении заметки: ", error);
            alert("Произошла ошибка при удалении заметки. Проверьте консоль для деталей.");
        }
    }

    // Функция загрузки постов из Firebase для текущего пользователя и подписка на обновления
    function loadPosts(uid) {
        postsContainer.innerHTML = ""; // Очищаем контейнер перед загрузкой

        // Проверяем, что UID не null перед формированием запроса
        if (!uid) {
            console.warn("UID is null in loadPosts. Cannot load user-specific notes.");
            return;
        }

        // Запрос заметок только для текущего пользователя
        const q = query(collection(db, "notes"), where("uid", "==", uid));

        // Отписываемся от предыдущего слушателя, чтобы избежать дублирования
        if (unsubscribe) {
            unsubscribe();
        }

        unsubscribe = onSnapshot(q, (querySnapshot) => {
            postsContainer.innerHTML = ""; // Очищаем контейнер при каждом обновлении
            querySnapshot.forEach((doc) => {
                displayPost({ id: doc.id, ...doc.data() });
            });
            console.log("📝 Заметки успешно загружены/обновлены."); // Отладочное сообщение
        }, (error) => {
            console.error("❌ Ошибка при получении заметок: ", error);
            alert("Произошла ошибка при загрузке заметок. Проверьте консоль для деталей.");
        });
    }
});