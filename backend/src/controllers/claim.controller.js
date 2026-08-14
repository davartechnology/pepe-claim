const supabase = require('../config/supabase');
const constants = require('../utils/constants');
const adNetworkService = require('../services/adNetwork.service');
const referralEngine = require('../services/referralEngine.service');
const { isValidAdNetwork } = require('../utils/validators');

const RECHARGE_INTERVAL_SECONDS = constants.CLAIM_RECHARGE_INTERVAL_MIN * 60;

/**
 * Calcule le nombre de secondes restantes avant qu'un réseau redevienne disponible.
 * Calcul en millisecondes pour éviter tout arrondi intermédiaire, et clampé à
 * RECHARGE_INTERVAL_SECONDS pour ne jamais dépasser l'intervalle max même en cas
 * de léger décalage d'horloge entre le serveur Node et la base Supabase.
 */
function computeSecondsRemaining(createdAt) {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const remainingMs = Math.max(0, RECHARGE_INTERVAL_SECONDS * 1000 - elapsedMs);
    return Math.min(RECHARGE_INTERVAL_SECONDS, Math.ceil(remainingMs / 1000));
}

/**
 * Va chercher le dernier claim de l'utilisateur pour une régie pub donnée.
 */
async function getLastClaimForNetwork(userId, adNetwork) {
    const { data, error } = await supabase
        .from('claim_history')
        .select('created_at')
        .eq('user_id', userId)
        .eq('ad_network', adNetwork)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(`Erreur récupération dernier claim (${adNetwork}):`, error);
        return null;
    }

    return data;
}

/**
 * GET /api/claim/status
 * Retourne l'état actuel des claims de l'utilisateur, avec un cooldown de 15 min
 * indépendant par régie pub (basé sur claim_history).
 */
async function getClaimStatus(req, res) {
    try {
        const user = req.user;

        const availableNetworks = adNetworkService.getAvailableNetworks();

        const networks = await Promise.all(
            availableNetworks.map(async (network) => {
                const lastClaim = await getLastClaimForNetwork(user.id, network.key);
                const secondsRemaining = lastClaim ? computeSecondsRemaining(lastClaim.created_at) : 0;

                return {
                    key: network.key,
                    name: network.name,
                    available: secondsRemaining <= 0,
                    secondsRemaining
                };
            })
        );

        return res.json({
            reward: constants.CLAIM_REWARD,
            claimsToday: user.claims_today,
            maxClaimsPerDay: constants.MAX_CLAIMS_PER_DAY,
            claimsRemaining: Math.max(0, constants.MAX_CLAIMS_PER_DAY - user.claims_today),
            networks
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
 * Le cooldown de 15 min est indépendant par régie pub (claim_history sert d'ancre).
 */
async function claimReward(req, res) {
    try {
        const user = req.user;
        const { adNetwork } = req.body;

        // 1. Validation de la régie pub
        if (!adNetwork || !isValidAdNetwork(adNetwork)) {
            return res.status(400).json({ error: 'Régie publicitaire invalide' });
        }

        // 2. Vérifie les limites quotidiennes (plafond global, tous réseaux confondus)
        if (user.claims_today >= constants.MAX_CLAIMS_PER_DAY) {
            return res.status(429).json({ error: 'Limite quotidienne de claims atteinte (52/52)' });
        }

        // 3. Vérifie le cooldown de 15 min propre à ce réseau
        const lastClaim = await getLastClaimForNetwork(user.id, adNetwork);
        if (lastClaim) {
            const secondsRemaining = computeSecondsRemaining(lastClaim.created_at);

            if (secondsRemaining > 0) {
                return res.status(429).json({
                    error: `Réessayez dans ${Math.ceil(secondsRemaining / 60)} min pour ce réseau`,
                    secondsRemaining
                });
            }
        }

        // 4. Crédite l'utilisateur
        const newBalance = Number(user.balance) + constants.CLAIM_REWARD;
        const newClaimsToday = user.claims_today + 1;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                balance: newBalance,
                claims_today: newClaimsToday,
                last_claim: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Erreur update claim:', updateError);
            return res.status(500).json({ error: 'Erreur lors du claim' });
        }

        // 5. Historique (sert aussi d'ancre pour le prochain cooldown de ce réseau)
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
            claimsRemaining: Math.max(0, constants.MAX_CLAIMS_PER_DAY - newClaimsToday)
        });
    } catch (err) {
        console.error('Erreur claimReward:', err);
        return res.status(500).json({ error: 'Erreur serveur lors du claim' });
    }
}

module.exports = { getClaimStatus, claimReward };
