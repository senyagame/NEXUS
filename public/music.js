// music.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"; // Обновлена версия для единообразия
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Обновлена версия
import { auth, db } from './auth-nexus-id/src/firebase-auth-service.js';

/**
 * Форматирует время из секунд в формат ММ:СС.
 * @param {number} seconds - Общее количество секунд.
 * @returns {string} Отформатированное время (например, "3:05").
 */
export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Инициализирует кастомный аудиоплеер для заданного контейнера.
 * @param {HTMLElement} container - DOM-элемент, содержащий элементы плеера.
 */
export function initializeCustomPlayer(container) {
    const playPauseBtn = container.querySelector('.play-pause-btn');
    const progressBar = container.querySelector('.custom-progress-bar');
    const currentTimeSpan = container.querySelector('.current-time');
    const totalDurationSpan = container.querySelector('.total-duration');
    const audio = container.querySelector('audio');
    const nexusPlayerTitle = container.querySelector('.nexus-player-title');

    let isPlaying = false;

    // ... (остальной код функции initializeCustomPlayer остается без изменений) ...
    if (audio) {
        audio.addEventListener('loadedmetadata', () => {
            if (progressBar) progressBar.max = audio.duration;
            if (totalDurationSpan) totalDurationSpan.textContent = formatTime(audio.duration);
        });

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
        console.warn('Аудио элемент не найден в контейнере:', container);
        if (playPauseBtn) {
            playPauseBtn.textContent = '⛔';
            playPauseBtn.disabled = true;
            playPauseBtn.title = 'Аудиофайл не найден';
        }
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    if (!auth) {
        console.error("Firebase Auth не инициализирован. Функции авторизации будут недоступны.");
        alert("Произошла ошибка при инициализации авторизации. Пожалуйста, перезагрузите страницу.");
        return;
    }

    let currentUserId = null;

    async function updateFavoriteHeartState(heartButton, songData) {
        // ... (код этой функции остается без изменений) ...
        try {
            if (!currentUserId) {
                heartButton.textContent = '🔒';
                heartButton.disabled = true;
                heartButton.title = 'Войдите для добавления в избранное';
                heartButton.classList.remove("is-favorite");
                return;
            }
            heartButton.disabled = false;
            const userFavoritesRef = doc(db, "favorites", currentUserId);
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
            console.error("[updateFavoriteHeartState Error]: Ошибка при обновлении статуса избранного.", error);
            heartButton.textContent = '❓';
            heartButton.disabled = true;
            heartButton.title = 'Ошибка загрузки статуса';
        }
    }

    async function toggleFavorite(heartButton, songData) {
        // ... (код этой функции остается без изменений) ...
        if (!currentUserId) {
            // Вместо alert можно показать модальное окно с предложением войти
            const authRedirectUrl = `/auth Nexus ID/auth.html?redirectUrl=${encodeURIComponent(window.location.href)}`;
            if (confirm("Пожалуйста, войдите в систему, чтобы добавлять треки в избранное. Перейти на страницу авторизации?")) {
                window.location.href = authRedirectUrl;
            }
            return;
        }
        try {
            const userFavoritesRef = doc(db, "favorites", currentUserId);
            const docSnap = await getDoc(userFavoritesRef);
            const isCurrentlyFavorite = heartButton.classList.contains("is-favorite");
            if (isCurrentlyFavorite) {
                await updateDoc(userFavoritesRef, { tracks: arrayRemove(songData) });
                // Можно использовать менее навязчивые уведомления (toast)
                console.log(`"${songData.song}" удален из понравившихся.`);
            } else {
                if (docSnap.exists()) {
                    await updateDoc(userFavoritesRef, { tracks: arrayUnion(songData) });
                } else {
                    await setDoc(userFavoritesRef, { tracks: [songData] });
                }
                console.log(`"${songData.song}" добавлен в понравившиеся!`);
            }
            await updateFavoriteHeartState(heartButton, songData);
        } catch (error) {
            console.error("[toggleFavorite Error]: Ошибка при добавлении/удалении трека.", error);
            alert("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
        }
    }

    const musicContainers = document.querySelectorAll('.music-container');
    musicContainers.forEach(container => {
        initializeCustomPlayer(container);
        const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
        if (favoriteHeartBtn) {
            favoriteHeartBtn.style.display = 'none'; // Скрываем до проверки авторизации
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

    // --- ГЛАВНЫЕ ИЗМЕНЕНИЯ ЗДЕСЬ ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Пользователь вошел в систему
            currentUserId = user.uid;
            console.log(`Пользователь вошел: ${user.uid}`);

            // ИЗМЕНЕНО: Проверяем, является ли пользователь новым
            const metadata = user.metadata;
            const creationTime = new Date(metadata.creationTime);
            const lastSignInTime = new Date(metadata.lastSignInTime);
            
            // Сравниваем время создания и время последнего входа.
            // Порог в 5 секунд нужен на случай небольшой задержки в системе.
            const isNewUser = (lastSignInTime.getTime() - creationTime.getTime()) < 5000;

            if (isNewUser) {
                // НОВОЕ: Показываем приветствие для нового пользователя
                console.log("Обнаружен новый пользователь!");
                alert("Добро пожаловать в Nexus Music! Рады, что вы с нами.");
                // Здесь можно показать красивое модальное окно или подсказки по интерфейсу
            }

        } else {
            // Пользователь вышел из системы
            currentUserId = null;
            console.log("Пользователь не вошел.");
        }

        // Обновляем состояние всех кнопок "избранное" независимо от того, новый пользователь или нет
        musicContainers.forEach(container => {
            const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
            if (favoriteHeartBtn) {
                const songData = {
                    song: container.dataset.song,
                    artist: container.dataset.artist,
                    yandexLink: container.dataset.yandexLink
                    // Передаем все данные, необходимые для toggleFavorite
                };
                updateFavoriteHeartState(favoriteHeartBtn, songData);
                favoriteHeartBtn.style.display = 'inline-block'; // Показываем кнопку
            }
        });
    });
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

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

    // Обновление ссылки для авторизации с учетом редиректа
    // Убедитесь, что путь к auth.html правильный, исходя из структуры папок
    const authLink = document.getElementById('auth-link');
    if (authLink) {
        const redirectUrl = encodeURIComponent(window.location.href);
        authLink.href = `/auth-nexus-id/auth.html?redirectUrl=${redirectUrl}`;
    }
});