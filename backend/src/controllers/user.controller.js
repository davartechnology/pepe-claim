const supabase = require('../config/supabase');
const constants = require('../utils/constants');

/**
 * GET /api/user/dashboard
 */
async function getDashboard(req, res) {
    try {
        const user = req.user;

        // Gains d'aujourd'hui : claims + bonus + referral du jour
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [claimsToday, bonusToday, referralToday] = await Promise.all([
            supabase.from('claim_history')
                .select('reward')
                .eq('user_id', user.id)
                .gte('created_at', startOfDay.toISOString()),
            supabase.from('bonus_history')
                .select('reward')
                .eq('user_id', user.id)
                .gte('created_at', startOfDay.toISOString()),
            supabase.from('referral_earnings')
                .select('reward')
                .eq('to_user', user.id)
                .gte('created_at', startOfDay.toISOString())
        ]);

        const todaysEarnings =
            (claimsToday.data || []).reduce((s, r) => s + Number(r.reward), 0) +
            (bonusToday.data || []).reduce((s, r) => s + Number(r.reward), 0) +
            (referralToday.data || []).reduce((s, r) => s + Number(r.reward), 0);

        const totalReferralCount = user.level1_count + user.level2_count + user.level3_count;

        return res.json({
            username: user.username,
            balance: Number(user.balance),
            todaysClaims: user.claims_today,
            claimsRemaining: constants.MAX_CLAIMS_PER_DAY - user.claims_today,
            referralCount: totalReferralCount,
            todaysEarnings
        });
    } catch (err) {
        console.error('Erreur getDashboard:', err);
        return res.status(500).json({ error: 'Erreur récupération dashboard' });
    }
}

module.exports = { getDashboard };