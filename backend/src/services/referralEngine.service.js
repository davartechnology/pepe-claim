const supabase = require('../config/supabase');
const constants = require('../utils/constants');

/**
 * Distribue les commissions de parrainage suite à un CLAIM.
 * @param {string} userId - L'utilisateur qui vient de faire le claim
 * @param {number} claimReward - Le montant du claim (ex: 70 PEPE)
 */
async function distributeReferralEarnings(userId, claimReward) {
    const { data: user } = await supabase
        .from('users')
        .select('id, referrer_id')
        .eq('id', userId)
        .single();

    if (!user || !user.referrer_id) return;

    // Niveau 1
    const level1Reward = claimReward * constants.REFERRAL_PERCENT_LEVEL1;
    await creditReferral(user.referrer_id, userId, 1, level1Reward);

    const { data: level1User } = await supabase
        .from('users')
        .select('id, referrer_id')
        .eq('id', user.referrer_id)
        .single();

    if (!level1User || !level1User.referrer_id) return;

    // Niveau 2
    const level2Reward = claimReward * constants.REFERRAL_PERCENT_LEVEL2;
    await creditReferral(level1User.referrer_id, userId, 2, level2Reward);

    const { data: level2User } = await supabase
        .from('users')
        .select('id, referrer_id')
        .eq('id', level1User.referrer_id)
        .single();

    if (!level2User || !level2User.referrer_id) return;

    // Niveau 3
    const level3Reward = claimReward * constants.REFERRAL_PERCENT_LEVEL3;
    await creditReferral(level2User.referrer_id, userId, 3, level3Reward);
}

async function creditReferral(toUserId, fromUserId, level, reward) {
    // Crédite le solde du parrain
    const { data: toUser } = await supabase
        .from('users')
        .select('balance')
        .eq('id', toUserId)
        .single();

    if (!toUser) return;

    await supabase
        .from('users')
        .update({ balance: Number(toUser.balance) + reward })
        .eq('id', toUserId);

    // Historique
    await supabase.from('referral_earnings').insert({
        from_user: fromUserId,
        to_user: toUserId,
        level,
        reward
    });
}

module.exports = { distributeReferralEarnings };