const supabase = require('../config/supabase');
const constants = require('../utils/constants');
const { randomInt, randomChance, randomChoice } = require('../utils/random');
const { isPositiveNumber } = require('../utils/validators');

/**
 * Logique interne par jeu : calcule le résultat et le gain.
 */
function playCoinFlip(choice, betAmount) {
    const outcome = randomChoice(['heads', 'tails']);
    const win = outcome === choice;
    const winAmount = win ? betAmount * constants.GAMES.coinflip.multiplier : 0;
    return { outcome, win, winAmount };
}

function playDice(betAmount) {
    const roll = randomInt(1, 6);
    const win = constants.GAMES.dice.winningRolls.includes(roll);
    const winAmount = win ? betAmount * constants.GAMES.dice.multiplier : 0;
    return { outcome: roll, win, winAmount };
}

function playLuckyNumber(choice, betAmount) {
    const drawn = randomInt(1, 10);
    const win = drawn === choice;
    const winAmount = win ? betAmount * constants.GAMES.lucky_number.multiplier : 0;
    return { outcome: drawn, win, winAmount };
}

function playSlots(betAmount) {
    // Probabilités : combinaisons rares pondérées pour rester soutenable économiquement
    const roll = Math.random();
    let outcome, winAmount;

    if (roll < 0.02) {
        // 2% de chance : 🐸🐸🐸 = x10
        outcome = '🐸🐸🐸';
        winAmount = betAmount * constants.GAMES.slots.payouts['3_pepe'];
    } else if (roll < 0.10) {
        // 8% de chance : 🐸🐸⭐ = x3
        outcome = '🐸🐸⭐';
        winAmount = betAmount * constants.GAMES.slots.payouts['2_pepe_1_star'];
    } else if (roll < 0.30) {
        // 20% de chance : 🐸⭐⭐ = x2
        outcome = '🐸⭐⭐';
        winAmount = betAmount * constants.GAMES.slots.payouts['1_pepe_2_star'];
    } else {
        outcome = '⭐⭐⭐';
        winAmount = 0;
    }

    return { outcome, win: winAmount > 0, winAmount };
}

/**
 * POST /api/games/play
 * Body: { gameType: 'coinflip'|'dice'|'lucky_number'|'slots', betAmount: number, choice?: string|number }
 */
async function playGame(req, res) {
    try {
        const user = req.user;
        const { gameType, betAmount, choice } = req.body;

        const gameConfig = constants.GAMES[gameType];
        if (!gameConfig) {
            return res.status(400).json({ error: 'Type de jeu invalide' });
        }

        if (!isPositiveNumber(betAmount) || betAmount < gameConfig.minBet) {
            return res.status(400).json({
                error: `Mise minimum requise : ${gameConfig.minBet} PEPE`
            });
        }

        if (Number(user.balance) < betAmount) {
            return res.status(400).json({ error: 'Solde insuffisant' });
        }

        let result;

        switch (gameType) {
            case 'coinflip':
                if (!['heads', 'tails'].includes(choice)) {
                    return res.status(400).json({ error: 'Choix invalide (heads/tails)' });
                }
                result = playCoinFlip(choice, betAmount);
                break;

            case 'dice':
                result = playDice(betAmount);
                break;

            case 'lucky_number':
                const num = Number(choice);
                if (!Number.isInteger(num) || num < 1 || num > 10) {
                    return res.status(400).json({ error: 'Choix invalide (1 à 10)' });
                }
                result = playLuckyNumber(num, betAmount);
                break;

            case 'slots':
                result = playSlots(betAmount);
                break;

            default:
                return res.status(400).json({ error: 'Type de jeu non supporté' });
        }

        // Calcul du nouveau solde : on retire la mise, on ajoute le gain (0 si perdu)
        const newBalance = Number(user.balance) - betAmount + result.winAmount;

        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', user.id);

        if (updateError) {
            console.error('Erreur update solde jeu:', updateError);
            return res.status(500).json({ error: 'Erreur lors de la mise à jour du solde' });
        }

        await supabase.from('games').insert({
            user_id: user.id,
            game_type: gameType,
            bet_amount: betAmount,
            result: String(result.outcome),
            win_amount: result.winAmount
        });

        return res.json({
            success: true,
            win: result.win,
            outcome: result.outcome,
            betAmount,
            winAmount: result.winAmount,
            newBalance
        });
    } catch (err) {
        console.error('Erreur playGame:', err);
        return res.status(500).json({ error: 'Erreur serveur lors du jeu' });
    }
}

module.exports = { playGame };