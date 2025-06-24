import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * Форматирует секунды в строку вида "минуты:секунды" (например, 1:05).
 * @param {number} seconds - Общее количество секунд.
 * @returns {string} - Отформатированное время.
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Инициализирует пользовательский плеер для заданного HTML-контейнера.
 * @param {HTMLElement} container - DOM-элемент, содержащий плеер.
 */
export function initializeCustomPlayer(container) {
    const playPauseBtn = container.querySelector('.play-pause-btn');
    const progressBar = container.querySelector('.custom-progress-bar');
    const currentTimeSpan = container.querySelector('.current-time');
    const totalDurationSpan = container.querySelector('.total-duration');
    const audio = container.querySelector('audio');
    const nexusPlayerTitle = container.querySelector('.nexus-player-title');

    let isPlaying = false;

    // Установка начальной длительности из данных, если аудио еще не загружено
    const songDurationStr = container.dataset.duration;
    if (songDurationStr) {
        const [minutes, seconds] = songDurationStr.split(':').map(Number);
        const initialTotalDuration = (minutes * 60) + seconds;
        if (totalDurationSpan) totalDurationSpan.textContent = songDurationStr;
        if (progressBar) progressBar.max = initialTotalDuration;
    } else {
        if (totalDurationSpan) totalDurationSpan.textContent = '0:00';
    }

    if (audio) {
        // Обновление метаданных, когда аудиофайл загружен
        audio.addEventListener('loadedmetadata', () => {
            if (progressBar) progressBar.max = audio.duration;
            if (totalDurationSpan) totalDurationSpan.textContent = formatTime(audio.duration);
        });
        
        // Обработчик кнопки Play/Pause
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playPauseBtn.textContent = '▶';
                    if (nexusPlayerTitle) nexusPlayerTitle.style.display = 'block';
                } else {
                    // Ставим на паузу все остальные плееры на странице
                    document.querySelectorAll('audio').forEach(otherAudio => {
                        if (otherAudio !== audio && !otherAudio.paused) {
                            otherAudio.pause();
                            const otherContainer = otherAudio.closest('.music-container');
                            if (otherContainer) {
                                const otherPlayPauseBtn = otherContainer.querySelector('.play-pause-btn');
                                if (otherPlayPauseBtn) otherPlayPauseBtn.textContent = '▶';
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

        // Обновление прогресс-бара и времени
        audio.addEventListener('timeupdate', () => {
            if (progressBar) progressBar.value = audio.currentTime;
            if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audio.currentTime);
        });

        // Перемотка трека
        if (progressBar) {
            progressBar.addEventListener('input', () => {
                audio.currentTime = progressBar.value;
            });
        }

        // Сброс по окончании воспроизведения
        audio.addEventListener('ended', () => {
            if (playPauseBtn) playPauseBtn.textContent = '▶';
            isPlaying = false;
            if (progressBar) progressBar.value = 0;
            if (currentTimeSpan) currentTimeSpan.textContent = '0:00';
            if (nexusPlayerTitle) nexusPlayerTitle.style.display = 'block';
        });
    } else {
        console.warn('Аудио элемент не найден в контейнере:', container);
        if (playPauseBtn) {
            playPauseBtn.textContent = '⛔';
            playPauseBtn.disabled = true;
            playPauseBtn.title = 'Аудиофайл не найден';
        }
    }
}

// =======================================================
// ОСНОВНОЙ БЛОК ЛОГИКИ FIREBASE
// =======================================================
document.addEventListener("DOMContentLoaded", async function () {
    
    // --- ИСПРАВЛЕННАЯ КОНФИГУРАЦИЯ FIREBASE ДЛЯ ПРОЕКТА nexus-90a19 ---
    const firebaseConfig = {
      apiKey: "AIzaSyAP04srkFeyQPsp1iuhn0RwzMav9fhqCRw",
      authDomain: "nexus-90a19.firebaseapp.com",
      projectId: "nexus-90a19",
      storageBucket: "nexus-90a19.appspot.com",
      messagingSenderId: "327211386840",
      appId: "1:327211386840:web:69110e5b7fd7e7f3b69327"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    let currentUserId = null;

    /**
     * Обновляет внешний вид кнопки "избранное" в зависимости от статуса трека.
     * @param {HTMLElement} heartButton - Кнопка-сердечко.
     * @param {object} songData - Данные о треке.
     */
    async function updateFavoriteHeartState(heartButton, songData) {
        if (!currentUserId) {
            heartButton.textContent = '🔒';
            heartButton.disabled = true;
            heartButton.title = 'Войдите для добавления в избранное';
            heartButton.classList.remove("is-favorite");
            return;
        }
        
        heartButton.disabled = false;
        const userFavoritesRef = doc(db, "favorites", currentUserId);

        try {
            const docSnap = await getDoc(userFavoritesRef);
            if (docSnap.exists()) {
                const favorites = docSnap.data().tracks || [];
                const isFavorite = favorites.some(fav => fav.yandexLink === songData.yandexLink);
                
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
                heartButton.textContent = '🤍';
                heartButton.classList.remove("is-favorite");
                heartButton.title = 'Добавить в избранное';
            }
        } catch (error) {
            console.error("Ошибка при проверке избранного:", error);
            heartButton.textContent = '❓';
            heartButton.disabled = true;
        }
    }

    /**
     * Добавляет или удаляет трек из избранного пользователя.
     * @param {HTMLElement} heartButton - Кнопка-сердечко.
     * @param {object} songData - Данные о треке.
     */
    async function toggleFavorite(heartButton, songData) {
        if (!currentUserId) {
            alert("Пожалуйста, войдите в систему, чтобы добавлять треки в избранное.");
            return;
        }

        const userFavoritesRef = doc(db, "favorites", currentUserId);
        try {
            const docSnap = await getDoc(userFavoritesRef);
            const isCurrentlyFavorite = heartButton.classList.contains("is-favorite");

            if (isCurrentlyFavorite) {
                // Удаляем из избранного
                await updateDoc(userFavoritesRef, { tracks: arrayRemove(songData) });
                alert(`"${songData.song}" удален из понравившихся.`);
            } else {
                // Добавляем в избранное
                if (docSnap.exists()) {
                    await updateDoc(userFavoritesRef, { tracks: arrayUnion(songData) });
                } else {
                    await setDoc(userFavoritesRef, { tracks: [songData] });
                }
                alert(`"${songData.song}" добавлен в понравившиеся!`);
            }
            await updateFavoriteHeartState(heartButton, songData);

        } catch (error) {
            console.error("Ошибка при изменении статуса избранного:", error);
            alert("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
        }
    }

    const musicContainers = document.querySelectorAll('.music-container');
    
    // Инициализация плееров и кнопок "избранное"
    musicContainers.forEach(container => {
        initializeCustomPlayer(container);

        const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
        if (favoriteHeartBtn) {
            const songData = {
                song: container.dataset.song || '',
                artist: container.dataset.artist || '',
                date: container.dataset.date || '',
                duration: container.dataset.duration || '',
                img: container.dataset.img || '',
                yandexLink: container.dataset.yandexLink || '',
                audioSrc: container.dataset.audioSrc || ''
            };
            favoriteHeartBtn.addEventListener('click', () => toggleFavorite(favoriteHeartBtn, songData));
        }
    });

    // Слушатель состояния аутентификации для обновления UI
    onAuthStateChanged(auth, (user) => {
        currentUserId = user ? user.uid : null;
        console.log(user ? `Пользователь вошел: ${user.uid}` : "Пользователь не вошел.");
        
        musicContainers.forEach(container => {
            const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
            if (favoriteHeartBtn) {
                const songData = {
                    song: container.dataset.song,
                    artist: container.dataset.artist,
                    yandexLink: container.dataset.yandexLink
                };
                updateFavoriteHeartState(favoriteHeartBtn, songData);
            }
        });
    });

    // Дополнительная логика (например, для шапки при скролле)
    const mainHeader = document.getElementById('main-header');
    if (mainHeader) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                mainHeader.classList.add('scrolled');
            } else {
                mainHeader.classList.remove('scrolled');
            }
        });
    }
});
