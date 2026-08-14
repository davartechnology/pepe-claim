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
        showToast(`Erreur: ${err.message} (status: ${err.status || 'N/A'})`, true);
    }
}

// ===== ÉCRAN: CLAIM =====
// Un setInterval par régie pub (tads/gigapub/adsgram/monetag) pour son cooldown de 15 min indépendant.
const claimNetworkTimers = {};

function formatCountdown(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function stopNetworkCountdown(networkKey) {
    if (claimNetworkTimers[networkKey]) {
        clearInterval(claimNetworkTimers[networkKey]);
        delete claimNetworkTimers[networkKey];
    }
}

function clearAllNetworkCountdowns() {
    Object.keys(claimNetworkTimers).forEach(stopNetworkCountdown);
}

function setNetworkButtonAvailable(btn) {
    const timerEl = btn.querySelector('.claim-network-btn__timer');
    btn.disabled = false;
    if (timerEl) {
        timerEl.hidden = true;
        timerEl.textContent = '';
    }
}

function startNetworkCountdown(networkKey, secondsRemaining) {
    stopNetworkCountdown(networkKey);

    const btn = document.querySelector(`.claim-network-btn[data-network="${networkKey}"]`);
    if (!btn) return;
    const timerEl = btn.querySelector('.claim-network-btn__timer');

    let remaining = Math.max(0, Math.ceil(secondsRemaining));

    const tick = () => {
        if (remaining <= 0) {
            stopNetworkCountdown(networkKey);
            setNetworkButtonAvailable(btn);
            return;
        }
        btn.disabled = true;
        if (timerEl) {
            timerEl.hidden = false;
            timerEl.textContent = formatCountdown(remaining);
        }
        remaining -= 1;
    };

    tick();
    claimNetworkTimers[networkKey] = setInterval(tick, 1000);
}

/**
 * Met à jour tous les affichages de la récompense de claim (home, écran claim, boutons réseau)
 * à partir de la valeur renvoyée par le backend, pour ne jamais se désynchroniser.
 */
function updateClaimRewardDisplays(reward) {
    if (reward === undefined || reward === null) return;

    const homeLabel = document.getElementById('homeClaimLabel');
    if (homeLabel) homeLabel.textContent = `Claim ${reward} PEPE`;

    const rewardValue = document.getElementById('claimRewardValue');
    if (rewardValue) rewardValue.textContent = reward;

    document.querySelectorAll('.claim-network-btn__reward').forEach((el) => {
        el.textContent = `+${reward} PEPE`;
    });
}

async function loadClaimStatus() {
    try {
        const status = await api.getClaimStatus();

        updateClaimRewardDisplays(status.reward);
        document.getElementById('claimStatusRemaining').textContent =
            `${status.claimsRemaining}/${status.maxClaimsPerDay}`;

        const hint = document.getElementById('claimHint');
        const networkButtons = document.querySelectorAll('.claim-network-btn');

        if (status.claimsRemaining <= 0) {
            clearAllNetworkCountdowns();
            networkButtons.forEach((btn) => {
                btn.disabled = true;
                const timerEl = btn.querySelector('.claim-network-btn__timer');
                if (timerEl) {
                    timerEl.hidden = true;
                    timerEl.textContent = '';
                }
            });
            hint.textContent = `Limite quotidienne atteinte (${status.claimsToday}/${status.maxClaimsPerDay}). Revenez demain !`;
            return;
        }

        hint.textContent = '';

        networkButtons.forEach((btn) => {
            const networkKey = btn.dataset.network;
            const networkStatus = (status.networks || []).find((n) => n.key === networkKey);
            if (!networkStatus) return;

            if (networkStatus.available) {
                stopNetworkCountdown(networkKey);
                setNetworkButtonAvailable(btn);
            } else {
                startNetworkCountdown(networkKey, networkStatus.secondsRemaining);
            }
        });
    } catch (err) {
        console.error('Erreur statut claim:', err);
    }
}

/**
 * Met à jour uniquement le libellé du bouton réseau pendant le chargement de la pub,
 * sans toucher à sa structure interne (spans nom/récompense/timer).
 */
function setNetworkButtonLoading(btn, isLoading, loadingText = 'Pub en cours...') {
    const nameEl = btn.querySelector('.claim-network-btn__name');

    if (isLoading) {
        if (nameEl) {
            btn.dataset.originalName = nameEl.textContent;
            nameEl.textContent = loadingText;
        }
        btn.disabled = true;
    } else if (nameEl && btn.dataset.originalName) {
        nameEl.textContent = btn.dataset.originalName;
    }
}

/**
 * Déclenche la pub d'une régie précise (bouton choisi par l'utilisateur),
 * puis valide le claim correspondant si la pub a bien été vue.
 * Seul ce bouton est affecté : les 3 autres régies restent cliquables.
 */
async function handleClaimViaNetwork(networkKey, btn) {
    stopNetworkCountdown(networkKey);
    setNetworkButtonLoading(btn, true, 'Pub en cours...');

    try {
        await watchAd(networkKey);

        const result = await api.claim(networkKey);
        showToast(`+${result.reward} PEPE crédités !`);
        telegramHapticSuccess();
        pulseBalance();

        setNetworkButtonLoading(btn, false);
        await Promise.all([loadDashboard(), loadClaimStatus()]);

        if (typeof reinitTadsBanner === 'function') {
            reinitTadsBanner();
        }
    } catch (err) {
        console.error(`Erreur claim via ${networkKey}:`, err);
        showToast(err.message || 'Erreur lors du claim', true);
        telegramHapticError();

        setNetworkButtonLoading(btn, false);
        // En cas d'erreur, resynchronise l'état réel (ne réactive que ce bouton si le cooldown le permet)
        await loadClaimStatus();
    }
}

function setupClaimNetworkButtons() {
    document.querySelectorAll('.claim-network-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const network = btn.dataset.network;
            handleClaimViaNetwork(network, btn);
        });
    });
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

// ===== GAMES: NAVIGATION VERS CHAQUE JEU =====
function setupGameMenuNavigation() {
    document.querySelectorAll('[data-game-nav]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const game = btn.dataset.gameNav;
            const screenMap = {
                coinflip: 'game-coinflip',
                dice: 'game-dice',
                lucky_number: 'game-lucky',
                slots: 'game-slots'
            };
            navigateToGameScreen(screenMap[game]);
        });
    });
}

function navigateToGameScreen(screenId) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    document.getElementById(`screen-${screenId}`).classList.add('active');
}

// ===== GAMES: COIN FLIP =====
function setupCoinflipChoices() {
    document.querySelectorAll('#screen-game-coinflip .choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#screen-game-coinflip .choice-btn').forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCoinflipChoice = btn.dataset.choice;
        });
    });
}

async function playCoinflip(btn) {
    const betAmount = Number(document.getElementById('betCoinflip').value);
    const resultEl = document.getElementById('resultCoinflip');
    const coin = document.getElementById('coinflipCoin');

    if (!selectedCoinflipChoice) {
        resultEl.textContent = 'Choisissez Heads ou Tails';
        return;
    }
    if (!betAmount || betAmount < 100) {
        resultEl.textContent = 'Mise minimum : 100 PEPE';
        return;
    }

    setButtonLoading(btn, true, 'En cours...');
    resultEl.textContent = '';
    coin.classList.remove('show-heads', 'show-tails');
    coin.classList.add('flipping');

    try {
        const result = await api.playGame('coinflip', betAmount, selectedCoinflipChoice);

        setTimeout(() => {
            coin.classList.remove('flipping');
            coin.classList.add(result.outcome === 'heads' ? 'show-heads' : 'show-tails');

            if (result.win) {
                resultEl.textContent = `🎉 ${result.outcome.toUpperCase()} ! Gagné +${formatNumber(result.winAmount)} PEPE`;
                resultEl.style.color = 'var(--green)';
                telegramHapticSuccess();
            } else {
                resultEl.textContent = `${result.outcome.toUpperCase()}... Perdu`;
                resultEl.style.color = 'var(--danger)';
                telegramHapticError();
            }
            pulseBalance();
            loadDashboard();
            setButtonLoading(btn, false);
        }, 1400);
    } catch (err) {
        coin.classList.remove('flipping');
        resultEl.textContent = err.message || 'Erreur lors du jeu';
        resultEl.style.color = 'var(--danger)';
        setButtonLoading(btn, false);
    }
}

// ===== GAMES: DICE =====
async function playDice(btn) {
    const betAmount = Number(document.getElementById('betDice').value);
    const resultEl = document.getElementById('resultDice');
    const die = document.getElementById('diceCube');
    const diceFaces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    if (!betAmount || betAmount < 100) {
        resultEl.textContent = 'Mise minimum : 100 PEPE';
        return;
    }

    setButtonLoading(btn, true, 'En cours...');
    resultEl.textContent = '';
    die.classList.add('rolling');

    try {
        const result = await api.playGame('dice', betAmount);

        setTimeout(() => {
            die.classList.remove('rolling');
            die.textContent = diceFaces[result.outcome] || '⚀';

            if (result.win) {
                resultEl.textContent = `🎉 Résultat: ${result.outcome} ! Gagné +${formatNumber(result.winAmount)} PEPE`;
                resultEl.style.color = 'var(--green)';
                telegramHapticSuccess();
            } else {
                resultEl.textContent = `Résultat: ${result.outcome}... Perdu`;
                resultEl.style.color = 'var(--danger)';
                telegramHapticError();
            }
            pulseBalance();
            loadDashboard();
            setButtonLoading(btn, false);
        }, 1000);
    } catch (err) {
        die.classList.remove('rolling');
        resultEl.textContent = err.message || 'Erreur lors du jeu';
        resultEl.style.color = 'var(--danger)';
        setButtonLoading(btn, false);
    }
}

// ===== GAMES: LUCKY NUMBER =====
async function playLuckyNumber(btn) {
    const choice = Number(document.getElementById('choiceLucky').value);
    const betAmount = Number(document.getElementById('betLucky').value);
    const resultEl = document.getElementById('resultLucky');
    const display = document.getElementById('luckyDisplay');

    if (!choice) {
        resultEl.textContent = 'Choisissez un nombre entre 1 et 10';
        return;
    }
    if (!betAmount || betAmount < 100) {
        resultEl.textContent = 'Mise minimum : 100 PEPE';
        return;
    }

    setButtonLoading(btn, true, 'En cours...');
    resultEl.textContent = '';
    display.classList.add('spinning');

    try {
        const result = await api.playGame('lucky_number', betAmount, choice);

        setTimeout(() => {
            display.classList.remove('spinning');
            display.textContent = result.outcome;

            if (result.win) {
                resultEl.textContent = `🎉 Numéro ${result.outcome} ! Gagné +${formatNumber(result.winAmount)} PEPE`;
                resultEl.style.color = 'var(--green)';
                telegramHapticSuccess();
            } else {
                resultEl.textContent = `Numéro tiré: ${result.outcome}... Perdu`;
                resultEl.style.color = 'var(--danger)';
                telegramHapticError();
            }
            pulseBalance();
            loadDashboard();
            setButtonLoading(btn, false);
        }, 1000);
    } catch (err) {
        display.classList.remove('spinning');
        resultEl.textContent = err.message || 'Erreur lors du jeu';
        resultEl.style.color = 'var(--danger)';
        setButtonLoading(btn, false);
    }
}

// ===== GAMES: SLOTS =====
async function playSlots(btn) {
    const betAmount = Number(document.getElementById('betSlots').value);
    const resultEl = document.getElementById('resultSlots');
    const reels = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];

    if (!betAmount || betAmount < 100) {
        resultEl.textContent = 'Mise minimum : 100 PEPE';
        return;
    }

    setButtonLoading(btn, true, 'En cours...');
    resultEl.textContent = '';
    reels.forEach((r) => r.classList.add('spinning'));

    try {
        const result = await api.playGame('slots', betAmount);
        const finalSymbols = parseSlotOutcome(result.outcome);

        setTimeout(() => {
            reels.forEach((reel, i) => {
                reel.classList.remove('spinning');
                reel.querySelector('.slot-reel__inner').textContent = finalSymbols[i];
            });

            if (result.win) {
                resultEl.textContent = `🎉 ${result.outcome} ! Gagné +${formatNumber(result.winAmount)} PEPE`;
                resultEl.style.color = 'var(--green)';
                telegramHapticSuccess();
            } else {
                resultEl.textContent = `${result.outcome}... Perdu`;
                resultEl.style.color = 'var(--danger)';
                telegramHapticError();
            }
            pulseBalance();
            loadDashboard();
            setButtonLoading(btn, false);
        }, 1200);
    } catch (err) {
        reels.forEach((r) => r.classList.remove('spinning'));
        resultEl.textContent = err.message || 'Erreur lors du jeu';
        resultEl.style.color = 'var(--danger)';
        setButtonLoading(btn, false);
    }
}

function parseSlotOutcome(outcome) {
    if (outcome && outcome.length >= 3) {
        return [...outcome];
    }
    return ['🐸', '⭐', '🐸'];
}

function setupGameButtons() {
    document.querySelectorAll('.play-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const gameType = btn.dataset.game;
            switch (gameType) {
                case 'coinflip': playCoinflip(btn); break;
                case 'dice': playDice(btn); break;
                case 'lucky_number': playLuckyNumber(btn); break;
                case 'slots': playSlots(btn); break;
            }
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
    document.querySelectorAll('.nav-btn[data-nav], .action-btn[data-nav], .back-btn[data-nav]').forEach((el) => {
        el.addEventListener('click', () => navigateTo(el.dataset.nav));
    });
}

function setupActionButtons() {
    document.getElementById('btnClaimBonus').addEventListener('click', handleClaimBonus);
    document.getElementById('btnCopyLink').addEventListener('click', handleCopyReferralLink);
    document.getElementById('btnWithdraw').addEventListener('click', handleWithdraw);
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupActionButtons();
    setupClaimNetworkButtons();
    setupGameMenuNavigation();
    setupCoinflipChoices();
    setupGameButtons();
    loadDashboard();
    loadClaimStatus();
});