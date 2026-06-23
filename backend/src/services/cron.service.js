const cron = require('node-cron');
const supabase = require('../config/supabase');
const constants = require('../utils/constants');

/**
 * Recharge les claims disponibles toutes les 15 minutes.
 * Chaque utilisateur récupère +4 claims (cap à un max raisonnable pour éviter l'accumulation infinie).
 */
function startClaimRechargeCron() {
    cron.schedule('*/15 * * * *', async () => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, claims_available, claims_today');

            if (error) {
                console.error('Erreur cron recharge (fetch):', error);
                return;
            }

            for (const user of users) {
                // On ne recharge pas au-delà de ce qu'il reste de claims dans la journée
                const remainingToday = constants.MAX_CLAIMS_PER_DAY - user.claims_today;
                if (remainingToday <= 0) continue;

                const newAvailable = Math.min(
                    user.claims_available + constants.CLAIM_RECHARGE_AMOUNT,
                    constants.CLAIM_RECHARGE_AMOUNT, // cap : pas d'accumulation au-delà d'un cycle
                    remainingToday
                );

                await supabase
                    .from('users')
                    .update({
                        claims_available: newAvailable,
                        last_recharge: new Date().toISOString()
                    })
                    .eq('id', user.id);
            }

            console.log(`✅ Cron recharge claims exécuté (${users.length} utilisateurs)`);
        } catch (err) {
            console.error('Erreur cron recharge:', err);
        }
    });
}

/**
 * Reset quotidien à minuit (00:00) : claims_today = 0
 */
function startDailyResetCron() {
    cron.schedule('0 0 * * *', async () => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    claims_today: 0,
                    claims_available: constants.CLAIM_RECHARGE_AMOUNT
                })
                .gte('claims_today', 0); // condition pour matcher tous les users

            if (error) {
                console.error('Erreur cron reset quotidien:', error);
                return;
            }

            console.log('✅ Reset quotidien des claims effectué');
        } catch (err) {
            console.error('Erreur cron reset quotidien:', err);
        }
    });
}

function initCronJobs() {
    startClaimRechargeCron();
    startDailyResetCron();
    console.log('⏰ Cron jobs initialisés (recharge claims + reset quotidien)');
}

module.exports = { initCronJobs };