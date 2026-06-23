/**
 * Gestion de la navigation entre écrans + helpers d'affichage
 */

function navigateTo(screenName) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((el) => el.classList.remove('active'));

    const targetScreen = document.getElementById(`screen-${screenName}`);
    if (targetScreen) targetScreen.classList.add('active');

    const navBtn = document.querySelector(`.nav-btn[data-nav="${screenName}"]`);
    if (navBtn) navBtn.classList.add('active');

    // Recharge les données spécifiques à l'écran ouvert
    onScreenOpen(screenName);
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');

    clearTimeout(showToast._timeout);
    showToast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatNumber(num) {
    return Number(num).toLocaleString('fr-FR');
}

function pulseBalance() {
    const el = document.querySelector('.balance-card__amount');
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 250);
}

function setButtonLoading(button, isLoading, loadingText = 'Chargement...') {
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
    }
}

const HISTORY_LABELS = {
    claim: { icon: '🎬', label: 'Claim' },
    daily_bonus: { icon: '🎁', label: 'Daily Bonus' },
    referral_earning: { icon: '👥', label: 'Parrainage' },
    game_win: { icon: '🏆', label: 'Gain Jeu' },
    game_loss: { icon: '🎲', label: 'Perte Jeu' },
    withdraw_request: { icon: '💸', label: 'Retrait' }
};

function renderHistory(events) {
    const container = document.getElementById('historyList');

    if (!events.length) {
        container.innerHTML = '<p class="hint">Aucun historique pour le moment.</p>';
        return;
    }

    container.innerHTML = events.map((event) => {
        const meta = HISTORY_LABELS[event.type] || { icon: '•', label: event.type };
        const isPositive = event.amount >= 0;
        const date = new Date(event.createdAt).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="history-item">
                <div class="history-item__info">
                    <span class="history-item__type">${meta.icon} ${meta.label}</span>
                    <span class="history-item__date">${date}</span>
                </div>
                <span class="history-item__amount ${isPositive ? 'history-item__amount--positive' : 'history-item__amount--negative'}">
                    ${isPositive ? '+' : ''}${formatNumber(event.amount)} PEPE
                </span>
            </div>
        `;
    }).join('');
}