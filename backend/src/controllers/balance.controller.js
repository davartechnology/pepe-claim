const supabase = require('../config/supabase');
const constants = require('../utils/constants');

/**
 * GET /api/balance
 */
async function getBalance(req, res) {
    try {
        const user = req.user;

        const [claimsResult, bonusResult, referralResult] = await Promise.all([
            supabase.from('claim_history').select('reward').eq('user_id', user.id),
            supabase.from('bonus_history').select('reward').eq('user_id', user.id),
            supabase.from('referral_earnings').select('reward').eq('to_user', user.id)
        ]);

        const totalClaims = (claimsResult.data || []).length;
        const totalClaimsReward = (claimsResult.data || []).reduce((s, r) => s + Number(r.reward), 0);
        const totalBonusEarned = (bonusResult.data || []).reduce((s, r) => s + Number(r.reward), 0);
        const totalReferralEarnings = (referralResult.data || []).reduce((s, r) => s + Number(r.reward), 0);

        return res.json({
            userId: user.id,
            currentBalance: Number(user.balance),
            totalClaims,
            totalClaimsReward,
            totalBonusEarned,
            totalReferralEarnings,
            withdrawableBalance: Number(user.balance),
            minWithdrawAmount: constants.MIN_WITHDRAW_AMOUNT
        });
    } catch (err) {
        console.error('Erreur getBalance:', err);
        return res.status(500).json({ error: 'Erreur récupération solde' });
    }
}

module.exports = { getBalance };