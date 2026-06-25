const supabase = require('../config/supabase');

/**
 * GET /api/referral
 * Retourne le lien de parrainage, les compteurs par niveau et les gains totaux.
 */
async function getReferralInfo(req, res) {
    try {
        const user = req.user;

        const { data: earningsRows, error } = await supabase
            .from('referral_earnings')
            .select('reward')
            .eq('to_user', user.id);

        if (error) {
            console.error('Erreur fetch referral_earnings:', error);
            return res.status(500).json({ error: 'Erreur récupération gains de parrainage' });
        }

        const totalEarnings = earningsRows.reduce((sum, row) => sum + Number(row.reward), 0);

        const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'PEPECLAIMBOT';
        const referralLink = `https://t.me/${botUsername}?startapp=${user.id}`;

        return res.json({
            referralLink,
            level1Count: user.level1_count,
            level2Count: user.level2_count,
            level3Count: user.level3_count,
            referralEarnings: totalEarnings,
            percentages: {
                level1: 15,
                level2: 10,
                level3: 5
            }
        });
    } catch (err) {
        console.error('Erreur getReferralInfo:', err);
        return res.status(500).json({ error: 'Erreur serveur parrainage' });
    }
}

module.exports = { getReferralInfo };