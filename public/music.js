// music.js

import {
    auth,
    db,
    onAuthStateChanged,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from './auth-nexus-id/src/firebase.js';

export function initializeCustomPlayer(container) {
    const playPauseBtn = container.querySelector('.play-pause-btn');
    const audio = container.querySelector('audio');

    if (audio && playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            const isCurrentlyPlaying = !audio.paused;
            document.querySelectorAll('audio').forEach(otherAudio => {
                if (otherAudio !== audio) {
                    otherAudio.pause();
                }
            });
            if (isCurrentlyPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
        });

        audio.addEventListener('play', () => {
            playPauseBtn.textContent = '❚❚';
            playPauseBtn.classList.add('playing');
        });

        audio.addEventListener('pause', () => {
            playPauseBtn.textContent = '▶';
            playPauseBtn.classList.remove('playing');
        });

        audio.addEventListener('ended', () => {
            playPauseBtn.textContent = '▶';
            playPauseBtn.classList.remove('playing');
        });

    } else {
        if (!audio) console.warn('Аудио элемент не найден в контейнере:', container);
        if (playPauseBtn) {
            playPauseBtn.textContent = '⛔';
            playPauseBtn.disabled = true;
        }
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    if (!auth || !db) {
        console.error("Firebase Auth или Firestore не инициализирован.");
        return;
    }
    let currentUserId = null;
    async function updateFavoriteHeartState(heartButton, songData) {
        try {
            if (!currentUserId) {
                heartButton.textContent = '🔒';
                heartButton.disabled = false; 
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
            console.error("[updateFavoriteHeartState Error]:", error);
            heartButton.textContent = '❓';
            heartButton.disabled = true;
            heartButton.title = 'Ошибка загрузки статуса';
        }
    }
    async function toggleFavorite(heartButton, songData) {
        if (!currentUserId) {
            const authRedirectUrl = `./auth-nexus-id/auth.html`;
            if (confirm("❤️ Чтобы добавлять треки в избранное, необходимо авторизоваться.\nПерейти к авторизации?")) {
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
            } else {
                if (docSnap.exists()) {
                    await updateDoc(userFavoritesRef, { tracks: arrayUnion(songData) });
                } else {
                    await setDoc(userFavoritesRef, { tracks: [songData] });
                }
            }
            await updateFavoriteHeartState(heartButton, songData);
        } catch (error) {
            console.error("[toggleFavorite Error]:", error);
            alert("Произошла ошибка. Попробуйте еще раз.");
        }
    }
    const musicContainers = document.querySelectorAll('.music-container');
    musicContainers.forEach(container => {
        initializeCustomPlayer(container);
        const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
        if (favoriteHeartBtn) {
            favoriteHeartBtn.style.display = 'none';
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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            const metadata = user.metadata;
            const creationTime = new Date(metadata.creationTime);
            const lastSignInTime = new Date(metadata.lastSignInTime);
            const isNewUser = (lastSignInTime.getTime() - creationTime.getTime()) < 5000;
            if (isNewUser) {
                alert("Добро пожаловать в Nexus Music! Рады, что вы с нами.");
            }
        } else {
            currentUserId = null;
        }
        musicContainers.forEach(container => {
            const favoriteHeartBtn = container.querySelector('.favorite-heart-btn');
            if (favoriteHeartBtn) {
                const songData = {
                    song: container.dataset.song,
                    artist: container.dataset.artist,
                    yandexLink: container.dataset.yandexLink
                };
                updateFavoriteHeartState(favoriteHeartBtn, songData);
                favoriteHeartBtn.style.display = 'inline-block';
            }
        });
    });
    const mainHeader = document.getElementById('main-header');
    if (mainHeader) {
        window.addEventListener('scroll', () => {
            mainHeader.classList.toggle('scrolled', window.scrollY > 100);
        });
    }
    const authLink = document.getElementById('auth-link');
    if (authLink) {
        const redirectUrl = encodeURIComponent(window.location.href);
        authLink.href = `./auth-nexus-id/auth.html`;
    }
});