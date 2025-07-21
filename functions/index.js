const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https"); // Добавили для yandexAuth
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin"); // Добавили для yandexAuth
const axios = require("axios"); // Добавили для yandexAuth
const express = require("express"); // Добавили для yandexAuth
const cors = require("cors"); // Добавили для yandexAuth

initializeApp();

// --- Функция для отключения аккаунта по заявке из Firestore ---

const STATUS_REJECTED = "rejected";
const STATUS_COMPLETED = "completed";
const STATUS_FAILED = "failed";
const CONFIRM_PHRASE = "Я хочу удалить аккаунт"; // Используем фразу "удалить", как в вашем коде

exports.disableUserAccountOnRequest = onDocumentCreated(
    "delete-users/{docId}",
    async (event) => {
        logger.info("Function triggered for document:", event.params.docId);

        const snap = event.data;
        if (!snap) {
            logger.warn("No data associated with the event for document:", event.params.docId);
            return null;
        }

        const data = snap.data();
        const userId = data.uid;
        const userEmail = data.email;
        const confirmText = data.content_confirm;

        if (!confirmText || confirmText !== CONFIRM_PHRASE) {
            logger.warn(`Неверная подтверждающая фраза для пользователя ${userEmail}.`);
            await snap.ref.update({
                status: STATUS_REJECTED,
                reason: "Incorrect or missing confirmation phrase",
            });
            return null;
        }

        try {
            await getAuth().updateUser(userId, {
                disabled: true,
            });
            logger.info(`Пользователь ${userEmail} (UID: ${userId}) успешно отключен.`);
            await snap.ref.update({
                status: STATUS_COMPLETED,
            });
            return null;
        } catch (error) {
            logger.error(`Ошибка при отключении пользователя ${userEmail} (UID: ${userId}):`, error);
            await snap.ref.update({
                status: STATUS_FAILED,
                error: error.message,
            });
            return null;
        }
    }
);


// --- Функция для Яндекс.Авторизации (остается без изменений) ---

const app = express();
app.use(cors({ origin: true }));
const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID;
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;
const FRONTEND_AUTH_URL = "https://nexus-id-site.vercel.app/profile.html";

app.get("/yandex-callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send("Ошибка: Код авторизации не был предоставлен.");
    if (!YANDEX_CLIENT_ID || !YANDEX_CLIENT_SECRET) return res.status(500).send("Ошибка конфигурации сервера.");
    try {
        const tokenResponse = await axios.post("https://oauth.yandex.ru/token", {
            grant_type: "authorization_code",
            code: code,
            client_id: YANDEX_CLIENT_ID,
            client_secret: YANDEX_CLIENT_SECRET,
        }, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
        const accessToken = tokenResponse.data.access_token;
        const userResponse = await axios.get("https://login.yandex.ru/info", {
            headers: { Authorization: `OAuth ${accessToken}` },
        });
        const yandexUser = userResponse.data;
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUserByEmail(yandexUser.default_email);
        } catch (error) {
            if (error.code === "auth/user-not-found") {
                firebaseUser = await admin.auth().createUser({
                    uid: `yandex:${yandexUser.id}`,
                    email: yandexUser.default_email,
                    emailVerified: true,
                    displayName: yandexUser.display_name || yandexUser.login,
                    photoURL: `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`,
                });
            } else { throw error; }
        }
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        return res.redirect(`${FRONTEND_AUTH_URL}?custom_token=${customToken}`);
    } catch (error) {
        console.error("Yandex Auth Error:", error.response ? error.response.data : error.message);
        return res.status(500).send("Произошла ошибка аутентификации. Перейдите на страницу авторизации и повторите попытку. ");
    }
});

exports.yandexAuth = onRequest({
    secrets: ["YANDEX_CLIENT_SECRET", "YANDEX_CLIENT_ID"]
}, app);