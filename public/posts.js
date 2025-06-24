import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// === ИСПРАВЛЕННАЯ FIREBASE КОНФИГУРАЦИЯ ДЛЯ ПРОЕКТА nexus-90a19 ===
const firebaseConfig = {
  apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
  authDomain: "nexus-90a19.firebaseapp.com",
  projectId: "nexus-90a19",
  storageBucket: "nexus-90a19.appspot.com",
  messagingSenderId: "327211386840",
  appId: "1:327211386840:web:69110e5b7fd7e7f3b69327"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Получаем ссылки на модальные окна
const postModal = document.getElementById("post-modal");
const mainModal = document.getElementById("modal");

// Глобальные функции для управления модальными окнами
window.openPostModal = function () {
    if (postModal) postModal.style.display = "block";
};
window.closePostModal = function () {
    if (postModal) postModal.style.display = "none";
};
window.openModal = function () {
    if (mainModal) mainModal.style.display = "block";
};
window.closeModal = function () {
    if (mainModal) mainModal.style.display = "none";
};

document.addEventListener("DOMContentLoaded", function () {
    const postForm = document.getElementById("post-form");
    const postsContainer = document.getElementById("posts-container");

    let currentUserUid = null;
    let unsubscribePosts;

    // Слушатель состояния авторизации
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserUid = user.uid;
            console.log("🔥 [post.js]: Пользователь вошел. UID:", currentUserUid);
            loadPosts(currentUserUid);
        } else {
            currentUserUid = null;
            console.log("❌ [post.js]: Пользователь не вошел.");
            if(postsContainer) postsContainer.innerHTML = "<p>Пожалуйста, войдите, чтобы увидеть свои заметки.</p>";
            if (unsubscribePosts) {
                unsubscribePosts();
            }
        }
    });

    // Обработка отправки формы
    if (postForm) {
        postForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const titleInput = document.getElementById("title");
            const descriptionInput = document.getElementById("description");
            const title = titleInput.value;
            const description = descriptionInput.value;

            if (currentUserUid && title) {
                addPost({ title, description, uid: currentUserUid });
                closePostModal();
                titleInput.value = "";
                descriptionInput.value = "";
            } else if (!currentUserUid) {
                alert("Пожалуйста, войдите в аккаунт, чтобы добавить заметку.");
            } else {
                alert("Пожалуйста, введите заголовок для заметки.");
            }
        });
    }

    // Добавление поста в Firestore
    async function addPost(post) {
        try {
            const notesCollectionRef = collection(db, "notes");
            await addDoc(notesCollectionRef, post);
            console.log("✅ Заметка добавлена");
        } catch (error) {
            console.error("❌ Ошибка при добавлении заметки: ", error);
            alert("Произошла ошибка при добавлении заметки.");
        }
    }

    // Отображение поста на странице
    function displayPost(post) {
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.innerHTML = `
            <div class="title">${post.title}</div>
            <div class="description">${post.description}</div>
            <button class="delete-btn" data-post-id="${post.id}">Удалить</button>
        `;
        // Добавляем обработчик на кнопку удаления
        postElement.querySelector('.delete-btn').addEventListener('click', () => {
            confirmDelete(post.id);
        });
        postsContainer.prepend(postElement); // Добавляем новые посты в начало
    }

    // Подтверждение удаления
    function confirmDelete(postId) {
        if (confirm("Вы уверены, что хотите удалить эту запись?")) {
            deletePost(postId);
        }
    }

    // Удаление поста из Firestore
    async function deletePost(postId) {
        if (!currentUserUid) {
            alert("Вы должны быть авторизованы, чтобы удалить заметку.");
            return;
        }
        try {
            const noteDocRef = doc(db, "notes", postId);
            await deleteDoc(noteDocRef);
            console.log("🗑️ Заметка удалена");
        } catch (error) {
            console.error("❌ Ошибка при удалении заметки: ", error);
            alert("Произошла ошибка при удалении заметки.");
        }
    }

    // Загрузка постов и подписка на обновления
    function loadPosts(uid) {
        if (!uid) return;
        if (!postsContainer) return;

        const q = query(collection(db, "notes"), where("uid", "==", uid));

        if (unsubscribePosts) {
            unsubscribePosts();
        }

        unsubscribePosts = onSnapshot(q, (querySnapshot) => {
            postsContainer.innerHTML = "";
            if (querySnapshot.empty) {
                postsContainer.innerHTML = "<p>У вас пока нет заметок. Создайте первую!</p>";
            } else {
                querySnapshot.forEach((doc) => {
                    displayPost({ id: doc.id, ...doc.data() });
                });
            }
            console.log("📝 Заметки загружены/обновлены.");
        }, (error) => {
            console.error("❌ Ошибка при получении заметок: ", error);
            postsContainer.innerHTML = "<p>Не удалось загрузить заметки. Попробуйте обновить страницу.</p>";
        });
    }

    // Пример анимации, если элементы есть на странице
    const headerText = document.getElementById("header-text");
    const newsText = document.getElementById("news-text");
    const comingSoonText = document.getElementById("coming-soon");

    if (headerText && newsText) {
        headerText.addEventListener("animationend", () => {
            newsText.style.display = "block";
            newsText.style.animationPlayState = "running";
        });
    }

    if (newsText && comingSoonText) {
        newsText.addEventListener("animationend", () => {
            comingSoonText.style.display = "block";
            comingSoonText.style.animationPlayState = "running";
        });
    }
});
