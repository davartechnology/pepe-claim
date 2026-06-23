const supabase = require('../config/supabase');
const constants = require('../utils/constants');
const { randomInt } = require('../utils/random');

/**
 * GET /api/bonus/status
 */
async function getBonusStatus(req, res) {
    try {
        const user = req.user;
        const now = new Date();

        let available = true;
        let nextAvailableInHours = 0;

        if (user.last_bonus) {
            const lastBonus = new Date(user.last_bonus);
            const hoursSince = (now - lastBonus) / (1000 * 60 * 60);

            if (hoursSince < constants.DAILY_BONUS_COOLDOWN_HOURS) {
                available = false;
                nextAvailableInHours = constants.DAILY_BONUS_COOLDOWN_HOURS - hoursSince;
            }
        }

        return res.json({
            available,
            nextAvailableInHours: Math.ceil(nextAvailableInHours),
            minReward: constants.DAILY_BONUS_MIN,
            maxReward: constants.DAILY_BONUS_MAX
        });
    } catch (err) {
        console.error('Erreur getBonusStatus:', err);
        return res.status(500).json({ error: 'Erreur récupération statut bonus' });
    }
}

/**
 * POST /api/bonus/claim
 */
async function claimBonus(req, res) {
    try {
        const user = req.user;
        const now = new Date();

        if (user.last_bonus) {
            const lastBonus = new Date(user.last_bonus);
            const hoursSince = (now - lastBonus) / (1000 * 60 * 60);

            if (hoursSince < constants.DAILY_BONUS_COOLDOWN_HOURS) {
                return res.status(429).json({
                    error: 'Daily Bonus déjà réclamé, réessayez plus tard'
                });
            }
        }

        const reward = randomInt(constants.DAILY_BONUS_MIN, constants.DAILY_BONUS_MAX);
        const newBalance = Number(user.balance) + reward;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                balance: newBalance,
                last_bonus: now.toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Erreur update bonus:', updateError);
            return res.status(500).json({ error: 'Erreur lors du claim du bonus' });
        }

        await supabase.from('bonus_history').insert({
            user_id: user.id,
            reward
        });

        return res.json({
            success: true,
            reward,
            newBalance
        });
    } catch (err) {
        console.error('Erreur claimBonus:', err);
        return res.status(500).json({ error: 'Erreur serveur lors du bonus' });
    }
}

module.exports = { getBonusStatus, claimBonus };