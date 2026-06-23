/**
 * Orchestration principale de l'application PEPE CLAIM
 */

let selectedCoinflipChoice = null;

// ===== CHARGEMENT INITIAL =====
async function loadDashboard() {
    try {
        const data = await api.getDashboard();
        document.getElementById('username').textContent = `@${data.username}`;
        document.getElementById('balanceValue').textContent = formatNumber(data.balance);
        document.getElementById('claimsRemaining').textContent = data.claimsRemaining;
        document.getElementById('todaysEarnings').textContent = formatNumber(data.todaysEarnings);
        document.getElementById('referralCount').textContent = data.referralCount;
    } catch (err) {
        console.error('Erreur chargement dashboard:', err);
        showToast('Erreur de connexion au serveur', true);
    }
}

// ===== ÉCRAN: CLAIM =====
async function loadClaimStatus() {
    try {
        const status = await api.getClaimStatus();
        document.getElementById('claimStatusRemaining').textContent =
            `${status.claimsAvailable > 0 ? status.claimsAvailable : 0}/${status.maxClaimsPerDay}`;
        document.getElementById('claimStatusRecharge').textContent =
            status.nextRechargeMinutes > 0 ? `${status.nextRechargeMinutes} min` : 'Disponible';

        const btn = document.getElementById('btnWatchAd');
        const hint = document.getElementById('claimHint');

        if (status.claimsRemaining <= 0) {
            btn.disabled = true;
            hint.textContent = 'Limite quotidienne atteinte (52/52). Revenez demain !';
        } else if (status.claimsAvailable <= 0) {
            btn.disabled = true;
            hint.textContent = `Prochaine recharge dans ${status.nextRechargeMinutes} min`;
        } else {
            btn.disabled = false;
            hint.textContent = '';
        }
    } catch (err) {
        console.error('Erreur statut claim:', err);
    }
}

/**
 * Simule l'affichage d'une pub vidéo via la régie disponible.
 * TODO: remplacer ce setTimeout par le vrai SDK de chaque régie
 * (TADS, Adexium, Adsxuit, Adsmone) une fois les comptes/scripts fournis.
 * Le SDK doit appeler resolve() uniquement quand la pub a été vue ENTIÈREMENT.
 */
function watchAd(networkKey) {
    return new Promise((resolve) => {
        showToast(`Chargement pub via ${networkKey}...`);
        setTimeout(() => resolve(true), 2000); // simulation 2s
    });
}

async function handleWatchAdAndClaim() {
    const btn = document.getElementById('btnWatchAd');
    setButtonLoading(btn, true, 'Pub en cours...');

    try {
        const status = await api.getClaimStatus();
        const networks = status.availableNetworks;

        if (!networks.length) {
            showToast('Aucune publicité disponible pour le moment', true);
            return;
        }

        // Priorité : TADS -> Adexium -> Adsxuit -> Adsmone
        const network = networks[0];
        await watchAd(network.key);

        const result = await api.claim(network.key);
        showToast(`+${result.reward} PEPE crédités !`);
        telegramHapticSuccess();
        pulseBalance();

        await Promise.all([loadDashboard(), loadClaimStatus()]);
    } catch (err) {
        console.error('Erreur claim:', err);
        showToast(err.message || 'Erreur lors du claim', true);
        telegramHapticError();
    } finally {
        setButtonLoading(btn, false);
    }
}

// ===== ÉCRAN: DAILY BONUS =====
async function loadBonusStatus() {
    try {
        const status = await api.getBonusStatus();
        const btn = document.getElementById('btnClaimBonus');
        const hint = document.getElementById('bonusHint');

        if (status.available) {
            btn.disabled = false;
            hint.textContent = '';
        } else {
            btn.disabled = true;
            hint.textContent = `Prochain bonus disponible dans ${status.nextAvailableInHours}h`;
        }
    } catch (err) {
        console.error('Erreur statut bonus:', err);
    }
}

async function handleClaimBonus() {
    const btn = document.getElementById('btnClaimBonus');
    setButtonLoading(btn, true, 'Réclamation...');

    try {
        const result = await api.claimBonus();
        showToast(`🎁 Vous avez reçu ${result.reward} PEPE !`);
        telegramHapticSuccess();
        pulseBalance();

        await Promise.all([loadDashboard(), loadBonusStatus()]);
    } catch (err) {
        showToast(err.message || 'Erreur lors du bonus', true);
        telegramHapticError();
    } finally {
        setButtonLoading(btn, false);
    }
}

// ===== ÉCRAN: REFERRALS =====
async function loadReferralInfo() {
    try {
        const data = await api.getReferral();
        document.getElementById('referralLinkInput').value = data.referralLink;
        document.getElementById('level1Count').textContent = data.level1Count;
        document.getElementById('level2Count').textContent = data.level2Count;
        document.getElementById('level3Count').textContent = data.level3Count;
        document.getElementById('referralEarningsValue').textContent = formatNumber(data.referralEarnings);
    } catch (err) {
        console.error('Erreur chargement referral:', err);
    }
}

function handleCopyReferralLink() {
    const input = document.getElementById('referralLinkInput');
    navigator.clipboard.writeText(input.value)
        .then(() => showToast('Lien copié !'))
        .catch(() => showToast('Impossible de copier', true));
}

// ===== ÉCRAN: BALANCE =====
async function loadBalanceInfo() {
    try {
        const data = await api.getBalance();
        document.getElementById('infoUserId').textContent = data.userId.slice(0, 8) + '...';
        document.getElementById('infoBalance').textContent = formatNumber(data.currentBalance) + ' PEPE';
        document.getElementById('infoTotalClaims').textContent = data.totalClaims;
        document.getElementById('infoTotalBonus').textContent = formatNumber(data.totalBonusEarned) + ' PEPE';
        document.getElementById('infoTotalReferral').textContent = formatNumber(data.totalReferralEarnings) + ' PEPE';
        document.getElementById('infoWithdrawable').textContent = formatNumber(data.withdrawableBalance) + ' PEPE';
    } catch (err) {
        console.error('Erreur chargement balance:', err);
    }
}

// ===== ÉCRAN: WITHDRAW =====
async function handleWithdraw() {
    const wallet = document.getElementById('withdrawWallet').value.trim();
    const amount = Number(document.getElementById('withdrawAmount').value);
    const btn = document.getElementById('btnWithdraw');
    const hint = document.getElementById('withdrawHint');

    if (!wallet || !amount) {
        hint.textContent = 'Veuillez remplir tous les champs';
        return;
    }

    setButtonLoading(btn, true, 'Envoi en cours...');
    hint.textContent = '';

    try {
        const result = await api.requestWithdraw(wallet, amount);
        showToast('✅ Paiement envoyé via FaucetPay !');
        telegramHapticSuccess();

        document.getElementById('withdrawWallet').value = '';
        document.getElementById('withdrawAmount').value = '';

        await loadDashboard();
    } catch (err) {
        hint.textContent = err.message || 'Erreur lors du retrait';
        telegramHapticError();
    } finally {
        setButtonLoading(btn, false);
    }
}

// ===== ÉCRAN: GAMES =====
function setupCoinflipChoices() {
    document.querySelectorAll('#gameCoinflip .choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#gameCoinflip .choice-btn').forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCoinflipChoice = btn.dataset.choice;
        });
    });
}

async function handlePlayGame(gameType, cardEl, btn) {
    const betInput = cardEl.querySelector('.bet-input');
    const betAmount = Number(betInput.value);
    const resultEl = cardEl.querySelector('.game-result');

    let choice = null;
    if (gameType === 'coinflip') {
        choice = selectedCoinflipChoice;
        if (!choice) {
            resultEl.textContent = 'Choisissez Heads ou Tails';
            return;
        }
    } else if (gameType === 'lucky_number') {
        choice = Number(cardEl.querySelector('.choice-select').value);
        if (!choice) {
            resultEl.textContent = 'Choisissez un nombre entre 1 et 10';
            return;
        }
    }

    if (!betAmount || betAmount < 100) {
        resultEl.textContent = 'Mise minimum : 100 PEPE';
        return;
    }

    setButtonLoading(btn, true, 'En cours...');
    resultEl.textContent = '';

    try {
        const result = await api.playGame(gameType, betAmount, choice);

        if (result.win) {
            resultEl.textContent = `🎉 Gagné ! +${formatNumber(result.winAmount)} PEPE`;
            resultEl.style.color = 'var(--green)';
            telegramHapticSuccess();
        } else {
            resultEl.textContent = `Perdu... Résultat: ${result.outcome}`;
            resultEl.style.color = 'var(--danger)';
            telegramHapticError();
        }

        pulseBalance();
        await loadDashboard();
    } catch (err) {
        resultEl.textContent = err.message || 'Erreur lors du jeu';
        resultEl.style.color = 'var(--danger)';
    } finally {
        setButtonLoading(btn, false);
    }
}

function setupGameButtons() {
    document.querySelectorAll('.play-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const gameType = btn.dataset.game;
            const cardEl = btn.closest('.game-card');
            handlePlayGame(gameType, cardEl, btn);
        });
    });
}

// ===== ÉCRAN: HISTORY =====
async function loadHistory() {
    try {
        const data = await api.getHistory();
        renderHistory(data.events);
    } catch (err) {
        console.error('Erreur chargement historique:', err);
    }
}

// ===== HOOK: appelé à chaque changement d'écran =====
function onScreenOpen(screenName) {
    switch (screenName) {
        case 'claim': loadClaimStatus(); break;
        case 'bonus': loadBonusStatus(); break;
        case 'referrals': loadReferralInfo(); break;
        case 'balance': loadBalanceInfo(); break;
        case 'history': loadHistory(); break;
    }
}

// ===== INITIALISATION =====
function setupNavigation() {
    document.querySelectorAll('[data-nav]').forEach((el) => {
        el.addEventListener('click', () => navigateTo(el.dataset.nav));
    });
}

function setupActionButtons() {
    document.getElementById('btnWatchAd').addEventListener('click', handleWatchAdAndClaim);
    document.getElementById('btnClaimBonus').addEventListener('click', handleClaimBonus);
    document.getElementById('btnCopyLink').addEventListener('click', handleCopyReferralLink);
    document.getElementById('btnWithdraw').addEventListener('click', handleWithdraw);
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupActionButtons();
    setupCoinflipChoices();
    setupGameButtons();
    loadDashboard();
});