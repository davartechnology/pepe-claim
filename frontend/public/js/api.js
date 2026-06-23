/**
 * Wrapper centralisé pour tous les appels au backend PEPE CLAIM.
 * Remplacez API_BASE_URL par l'URL de votre backend Railway une fois déployé.
 */
const API_BASE_URL = 'http://localhost:3000/api';

async function apiRequest(path, { method = 'GET', body = null } = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'x-telegram-init-data': getTelegramInitData()
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(data.error || `Erreur HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

const api = {
    // Dashboard
    getDashboard: () => apiRequest('/user/dashboard'),

    // Claim
    getClaimStatus: () => apiRequest('/claim/status'),
    claim: (adNetwork) => apiRequest('/claim', { method: 'POST', body: { adNetwork } }),

    // Bonus
    getBonusStatus: () => apiRequest('/bonus/status'),
    claimBonus: () => apiRequest('/bonus/claim', { method: 'POST' }),

    // Referral
    getReferral: () => apiRequest('/referral'),

    // Balance
    getBalance: () => apiRequest('/balance'),

    // Withdraw
    requestWithdraw: (wallet, amount) =>
        apiRequest('/withdraw', { method: 'POST', body: { wallet, amount } }),
    getWithdrawHistory: () => apiRequest('/withdraw/history'),

    // Games
    playGame: (gameType, betAmount, choice) =>
        apiRequest('/games/play', { method: 'POST', body: { gameType, betAmount, choice } }),

    // History
    getHistory: () => apiRequest('/history')
};