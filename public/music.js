// music.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// Импортируем auth и db из нашего нового сервисного файла
import { auth, db } from './firebase-auth-service.js'; // Убедитесь, что путь правильный

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

    // Инициализация общей длительности из data-атрибута, если доступно
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
        // Обновление прогресс-бара и общей длительности после загрузки метаданных аудио
        audio.addEventListener('loadedmetadata', () => {
            if (progressBar) progressBar.max = audio.duration;
            if (totalDurationSpan) totalDurationSpan.textContent = formatTime(audio.duration);
        });

        // Обработчик кнопки воспроизведения/паузы
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (isPlaying) {
                    audio.pause();
                    playPauseBtn.textContent = '▶';
                    if (nexusPlayerTitle) nexusPlayerTitle.style.display = 'block';
                } else {
                    // Пауза всех остальных аудио, если они играют
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

        // Обновление текущего времени и прогресс-бара при воспроизведении
        audio.addEventListener('timeupdate', () => {
            if (progressBar) progressBar.value = audio.currentTime;
            if (currentTimeSpan) currentTimeSpan.textContent = formatTime(audio.currentTime);
        });

        // Перемотка аудио при изменении прогресс-бара
        if (progressBar) {
            progressBar.addEventListener('input', () => {
                audio.currentTime = progressBar.value;
            });
        }

        // Сброс состояния плеера по окончании воспроизведения
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
    // Проверяем, что auth был успешно инициализирован
    if (!auth) {
        console.error("Firebase Auth не инициализирован. Функции авторизации будут недоступны.");
        alert("Произошла ошибка при инициализации авторизации. Пожалуйста, перезагрузите страницу.");
        return; // Прерываем выполнение, если Auth не готов
    }

    let currentUserId = null; // ID текущего авторизованного пользователя

    /**
     * Обновляет состояние кнопки "Избранное" в зависимости от статуса авторизации пользователя
     * и наличия трека в избранном.
     * @param {HTMLElement} heartButton - Кнопка "сердечко".
     * @param {Object} songData - Данные о песне.
     */
    async function updateFavoriteHeartState(heartButton, songData) {
        try {
            if (!currentUserId) {
                // Если пользователь не авторизован
                heartButton.textContent = '🔒';
                heartButton.disabled = true;
                heartButton.title = 'Войдите для добавления в избранное';
                heartButton.classList.remove("is-favorite");
                return;
            }

            // Если пользователь авторизован
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
                // Если у пользователя еще нет коллекции избранного
                heartButton.textContent = '🤍';
                heartButton.classList.remove("is-favorite");
                heartButton.title = 'Добавить в избранное';
            }
        } catch (error) {
            console.error("[updateFavoriteHeartState Error]: Ошибка при обновлении статуса избранного.", error);
            heartButton.textContent = '❓'; // Отображение ошибки
            heartButton.disabled = true;
            heartButton.title = 'Ошибка загрузки статуса';
        }
    }

    /**
     * Переключает статус трека (добавить/удалить) в избранном пользователя.
     * @param {HTMLElement} heartButton - Кнопка "сердечко".
     * @param {Object} songData - Данные о песне.
     */
    async function toggleFavorite(heartButton, songData) {
        if (!currentUserId) {
            alert("Пожалуйста, войдите в систему, чтобы добавлять треки в избранное.");
            return;
        }

        try {
            const userFavoritesRef = doc(db, "favorites", currentUserId);
            const docSnap = await getDoc(userFavoritesRef);
            const isCurrentlyFavorite = heartButton.classList.contains("is-favorite");

            if (isCurrentlyFavorite) {
                await updateDoc(userFavoritesRef, { tracks: arrayRemove(songData) });
                alert(`"${songData.song}" удален из понравившихся.`);
            } else {
                if (docSnap.exists()) {
                    await updateDoc(userFavoritesRef, { tracks: arrayUnion(songData) });
                } else {
                    // Если коллекции избранного еще нет, создаем ее с первым треком
                    await setDoc(userFavoritesRef, { tracks: [songData] });
                }
                alert(`"${songData.song}" добавлен в понравившиеся!`);
            }
            // Обновляем состояние кнопки после операции
            await updateFavoriteHeartState(heartButton, songData);
        } catch (error) {
            console.error("[toggleFavorite Error]: Ошибка при добавлении/удалении трека.", error);
            alert("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
        }
    }

    const musicContainers = document.querySelectorAll('.music-container');

    // Инициализируем кастомные плееры и слушателей для кнопок избранного.
    // Изначально скрываем или отключаем кнопки избранного, чтобы избежать "мигания".
    musicContainers.forEach(container => {
        initializeCustomPlayer(container);
        const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
        if (favoriteHeartBtn) {
            // Скрываем кнопки избранного, пока не определится статус авторизации
            favoriteHeartBtn.style.display = 'none'; // Или favoriteHeartBtn.disabled = true;

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

    // Слушатель состояния авторизации Firebase.
    // Этот слушатель гарантирует, что кнопки избранного обновятся, как только
    // статус авторизации пользователя будет определен.
    onAuthStateChanged(auth, (user) => {
        currentUserId = user ? user.uid : null;
        console.log(user ? `Пользователь вошел: ${user.uid}` : "Пользователь не вошел.");

        // После получения состояния авторизации, обновляем все кнопки избранного
        musicContainers.forEach(container => {
            const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
            if (favoriteHeartBtn) {
                const songData = {
                    song: container.dataset.song,
                    artist: container.dataset.artist,
                    yandexLink: container.dataset.yandexLink
                };
                updateFavoriteHeartState(favoriteHeartBtn, songData);
                // Показываем кнопку после того, как её состояние было обновлено
                favoriteHeartBtn.style.display = '';
            }
        });
    });

    // Логика для заголовка при прокрутке страницы
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
    const authLink = document.getElementById('auth-link');
    if (authLink) {
        const redirectUrl = encodeURIComponent(window.location.href);
        authLink.href = `/auth.html?redirectUrl=${redirectUrl}`;
    }
});