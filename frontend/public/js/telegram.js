/**
 * Initialisation du SDK Telegram Web App
 */
const tg = window.Telegram?.WebApp;

function initTelegram() {
    if (!tg) {
        console.warn('⚠️ Telegram WebApp non détecté (mode navigateur classique)');
        return;
    }

    tg.ready();
    tg.expand();

    // Couleurs du header adaptées au thème sombre de l'app
    tg.setHeaderColor('#0E1A12');
    tg.setBackgroundColor('#0E1A12');
}

/**
 * Retourne les initData brutes à envoyer dans le header x-telegram-init-data
 */
function getTelegramInitData() {
    return tg?.initData || '';
}

/**
 * Retourne les infos utilisateur Telegram (username, first_name, etc.)
 * Disponible uniquement côté client pour affichage immédiat (pas pour la sécurité).
 */
function getTelegramUser() {
    return tg?.initDataUnsafe?.user || null;
}

function telegramHapticSuccess() {
    tg?.HapticFeedback?.notificationOccurred('success');
}

function telegramHapticError() {
    tg?.HapticFeedback?.notificationOccurred('error');
}

initTelegram();