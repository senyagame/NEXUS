import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

export function initializeCustomPlayer(container) {
    const playPauseBtn = container.querySelector('.play-pause-btn');
    const progressBar = container.querySelector('.custom-progress-bar');
    const currentTimeSpan = container.querySelector('.current-time');
    const totalDurationSpan = container.querySelector('.total-duration');
    const audio = container.querySelector('audio');
    const nexusPlayerTitle = container.querySelector('.nexus-player-title');
    const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');

    let isPlaying = false;

    const songDurationStr = container.dataset.duration;
    if (songDurationStr) {
        const [minutes, seconds] = songDurationStr.split(':').map(Number);
        const initialTotalDuration = (minutes * 60) + seconds;
        if (totalDurationSpan) {
            totalDurationSpan.textContent = songDurationStr;
        }
        if (progressBar) {
            progressBar.max = initialTotalDuration;
        }
    } else {
        if (totalDurationSpan) {
            totalDurationSpan.textContent = '0:00';
        }
    }

    if (audio) {
        if (audio.readyState >= 2) {
            if (progressBar) progressBar.max = audio.duration;
            if (totalDurationSpan) totalDurationSpan.textContent = formatTime(audio.duration);
        } else {
            audio.addEventListener('loadedmetadata', () => {
                if (progressBar) progressBar.max = audio.duration;
                if (totalDurationSpan) totalDurationSpan.textContent = formatTime(audio.duration);
            });
        }
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playPauseBtn.textContent = '▶';
                    if (nexusPlayerTitle) nexusPlayerTitle.style.display = 'block';
                } else {
                    document.querySelectorAll('audio').forEach(otherAudio => {
                        if (otherAudio !== audio && !otherAudio.paused) {
                            otherAudio.pause();
                            const otherContainer = otherAudio.closest('.music-container');
                            if (otherContainer) {
                                const otherPlayPauseBtn = otherContainer.querySelector('.play-pause-btn');
                                const otherNexusPlayerTitle = otherContainer.querySelector('.nexus-player-title');
                                
                                if (otherPlayPauseBtn) otherPlayPauseBtn.textContent = '▶';
                                if (otherNexusPlayerTitle) otherNexusPlayerTitle.style.display = 'block';
                            }
                        }
                    });

                    audio.play();
                    playPauseBtn.textContent = '⏸';
                    if (nexusPlayerTitle) nexusPlayerTitle.style.display = 'none';
                }
                isPlaying = !isPlaying;
            });
        }

        audio.addEventListener('timeupdate', () => {
            if (progressBar) progressBar.value = audio.currentTime;
            if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audio.currentTime);
        });

        if (progressBar) {
            progressBar.addEventListener('input', () => {
                audio.currentTime = progressBar.value;
            });
        }

        audio.addEventListener('ended', () => {
            if (playPauseBtn) playPauseBtn.textContent = '▶';
            isPlaying = false;
            if (progressBar) progressBar.value = 0;
            if (currentTimeSpan) currentTimeSpan.textContent = '0:00';
            if (nexusPlayerTitle) nexusPlayerTitle.style.display = 'block';
        });
    } else {
        console.warn('Audio element not found or invalid in container:', container);
        if (playPauseBtn) {
            playPauseBtn.textContent = '⛔';
            playPauseBtn.disabled = true;
            playPauseBtn.title = 'Локальный аудиофайл не найден';
        }
        if (progressBar) progressBar.style.display = 'none';
        if (currentTimeSpan) currentTimeSpan.style.display = 'none';
        if (totalDurationSpan) totalDurationSpan.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", async function () {
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

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    let currentUserId = null;

    async function updateFavoriteHeartState(heartButton, songData) {
        if (!currentUserId) {
            heartButton.textContent = '🔒';
            heartButton.disabled = true;
            heartButton.title = 'Войдите для добавления в избранное';
            heartButton.classList.remove("is-favorite");
            return;
        }
        
        heartButton.disabled = false;
        heartButton.title = 'Добавить в избранное';

        const userFavoritesRef = doc(db, "favorites", currentUserId);
        try {
            const docSnap = await getDoc(userFavoritesRef);
            if (docSnap.exists()) {
                const favorites = docSnap.data().tracks || [];
                // Проверка по нескольким полям для уникальности трека
                const isFavorite = favorites.some(fav =>
                    fav.song === songData.song &&
                    fav.artist === songData.artist &&
                    fav.yandexLink === songData.yandexLink // Используем yandexLink как уникальный идентификатор
                );
                if (isFavorite) {
                    heartButton.textContent = '❤️';
                    heartButton.classList.add("is-favorite");
                    heartButton.title = 'Удалить из избранного';
                } else {
                    heartButton.textContent = '🤍';
                    heartButton.classList.remove("is-favorite");
                    heartButton.title = 'Добавить в избранное';
                }
            } else {
                // Документа пользователя с избранным еще нет
                heartButton.textContent = '🤍';
                heartButton.classList.remove("is-favorite");
                heartButton.title = 'Добавить в избранное';
            }
        } catch (error) {
            console.error("❌ Ошибка при проверке избранного:", error);
            heartButton.textContent = '❓';
            heartButton.disabled = true;
            heartButton.title = 'Ошибка загрузки избранного';
        }
    }

    async function toggleFavorite(heartButton, songData) {
        if (!currentUserId) {
            alert("Пожалуйста, войдите в систему, чтобы добавлять треки в избранное.");
            console.warn("User not logged in. Cannot toggle favorite."); // Отладочное сообщение
            return;
        }

        const userFavoritesRef = doc(db, "favorites", currentUserId);
        try {
            const docSnap = await getDoc(userFavoritesRef);
            let favorites = docSnap.exists() ? docSnap.data().tracks || [] : [];
            
            const isFavorite = favorites.some(fav =>
                fav.song === songData.song &&
                fav.artist === songData.artist &&
                fav.yandexLink === songData.yandexLink
            );

            if (isFavorite) {
                // Удаляем из избранного
                await updateDoc(userFavoritesRef, {
                    tracks: arrayRemove(songData)
                });
                alert(`${songData.song} удален из понравившихся.`);
                console.log(`🗑️ ${songData.song} удален из избранного.`); // Отладочное сообщение
            } else {
                // Добавляем в избранное
                if (docSnap.exists()) {
                    // Документ уже существует, обновляем массив
                    await updateDoc(userFavoritesRef, {
                        tracks: arrayUnion(songData)
                    });
                } else {
                    // Документ не существует, создаем его с первым треком
                    await setDoc(userFavoritesRef, { tracks: [songData] });
                }
                alert(`${songData.song} добавлен в понравившиеся!`);
                console.log(`❤️ ${songData.song} добавлен в избранное.`); // Отладочное сообщение
            }
            // Обновляем состояние кнопки после операции
            await updateFavoriteHeartState(heartButton, songData);

        } catch (error) {
            console.error("❌ Ошибка при изменении статуса избранного:", error);
            alert("Произошла ошибка при изменении статуса избранного. Проверьте консоль для деталей.");
        }
    }

    const musicContainers = document.querySelectorAll('.music-container');
    musicContainers.forEach(container => {
        initializeCustomPlayer(container); // Инициализация плеера для каждого контейнера

        const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
        if (favoriteHeartBtn) {
            // Собираем все данные о песне из dataset для сохранения в Firestore
            const songData = {
                song: container.dataset.song,
                artist: container.dataset.artist,
                date: container.dataset.date || '', // Добавляем пустую строку, если нет
                duration: container.dataset.duration || '', // Добавляем пустую строку, если нет
                img: container.dataset.img || '', // Добавляем пустую строку, если нет
                yandexLink: container.dataset.yandexLink || '', // Добавляем пустую строку, если нет
                audioSrc: container.dataset.audioSrc || '' // Добавляем пустую строку, если нет
            };
            favoriteHeartBtn.addEventListener('click', () => toggleFavorite(favoriteHeartBtn, songData));
        }
    });

    // Слушатель состояния аутентификации
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("🔥 [music.js]: Пользователь вошел. UID:", currentUserId); // Отладочное сообщение
            
            // После входа пользователя, обновите состояние всех кнопок избранного
            musicContainers.forEach(async (container) => {
                const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
                if (favoriteHeartBtn) {
                    const songData = {
                        song: container.dataset.song,
                        artist: container.dataset.artist,
                        yandexLink: container.dataset.yandexLink
                        // Для проверки избранного достаточно уникальных полей
                    };
                    await updateFavoriteHeartState(favoriteHeartBtn, songData);
                }
            });
        } else {
            currentUserId = null;
            console.log("❌ [music.js]: Пользователь не вошел."); // Отладочное сообщение
            
            // Если пользователь не вошел, заблокируйте все кнопки избранного
            musicContainers.forEach(container => {
                const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
                if (favoriteHeartBtn) {
                    favoriteHeartBtn.textContent = '🔒';
                    favoriteHeartBtn.disabled = true;
                    favoriteHeartBtn.title = 'Войдите для добавления в избранное';
                    favoriteHeartBtn.classList.remove("is-favorite");
                }
            });
        }
    });

    // Логика для заголовка при скролле
    const mainHeader = document.getElementById('main-header');
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
        if (mainHeader) { // Проверка на существование элемента
            if (window.scrollY > scrollThreshold) {
                mainHeader.classList.add('scrolled');
            } else {
                mainHeader.classList.remove('scrolled');
            }
        }
    });
});