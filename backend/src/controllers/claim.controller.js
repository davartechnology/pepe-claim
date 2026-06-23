const supabase = require('../config/supabase');
const constants = require('../utils/constants');
const adNetworkService = require('../services/adNetwork.service');
const referralEngine = require('../services/referralEngine.service');
const { isValidAdNetwork } = require('../utils/validators');

/**
 * GET /api/claim/status
 * Retourne l'état actuel des claims de l'utilisateur (claims dispo, prochaine recharge...)
 */
async function getClaimStatus(req, res) {
    try {
        const user = req.user;
        const now = new Date();
        const lastRecharge = new Date(user.last_recharge);
        const minutesSinceRecharge = (now - lastRecharge) / 60000;

        const nextRechargeInMinutes = Math.max(
            0,
            constants.CLAIM_RECHARGE_INTERVAL_MIN - minutesSinceRecharge
        );

        return res.json({
            reward: constants.CLAIM_REWARD,
            claimsAvailable: user.claims_available,
            claimsToday: user.claims_today,
            maxClaimsPerDay: constants.MAX_CLAIMS_PER_DAY,
            claimsRemaining: constants.MAX_CLAIMS_PER_DAY - user.claims_today,
            nextRechargeMinutes: Math.ceil(nextRechargeInMinutes),
            availableNetworks: adNetworkService.getAvailableNetworks()
        });
    } catch (err) {
        console.error('Erreur getClaimStatus:', err);
        return res.status(500).json({ error: 'Erreur récupération statut claim' });
    }
}

/**
 * POST /api/claim
 * Body: { adNetwork: 'tads' }
 * Valide un claim après visionnage complet d'une pub.
 */
async function claimReward(req, res) {
    try {
        const user = req.user;
        const { adNetwork } = req.body;

        // 1. Validation de la régie pub
        if (!adNetwork || !isValidAdNetwork(adNetwork)) {
            return res.status(400).json({ error: 'Régie publicitaire invalide' });
        }

        // 2. Vérifie les limites quotidiennes
        if (user.claims_today >= constants.MAX_CLAIMS_PER_DAY) {
            return res.status(429).json({ error: 'Limite quotidienne de claims atteinte (52/52)' });
        }

        // 3. Vérifie qu'il reste des claims disponibles (recharge)
        if (user.claims_available <= 0) {
            return res.status(429).json({ error: 'Aucun claim disponible, attendez la prochaine recharge' });
        }

        // 4. Crédite l'utilisateur
        const newBalance = Number(user.balance) + constants.CLAIM_REWARD;
        const newClaimsToday = user.claims_today + 1;
        const newClaimsAvailable = user.claims_available - 1;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                balance: newBalance,
                claims_today: newClaimsToday,
                claims_available: newClaimsAvailable,
                last_claim: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Erreur update claim:', updateError);
            return res.status(500).json({ error: 'Erreur lors du claim' });
        }

        // 5. Historique
        await supabase.from('claim_history').insert({
            user_id: user.id,
            reward: constants.CLAIM_REWARD,
            ad_network: adNetwork
        });

        // 6. Distribution des commissions de parrainage (sur le montant du claim)
        await referralEngine.distributeReferralEarnings(user.id, constants.CLAIM_REWARD);

        return res.json({
            success: true,
            reward: constants.CLAIM_REWARD,
            newBalance,
            claimsRemaining: constants.MAX_CLAIMS_PER_DAY - newClaimsToday,
            claimsAvailable: newClaimsAvailable
        });
    } catch (err) {
        console.error('Erreur claimReward:', err);
        return res.status(500).json({ error: 'Erreur serveur lors du claim' });
    }
}

module.exports = { getClaimStatus, claimReward };