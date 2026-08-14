const cron = require('node-cron');
const supabase = require('../config/supabase');
const constants = require('../utils/constants');

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
    startDailyResetCron();
    console.log('⏰ Cron jobs initialisés (reset quotidien)');
}

module.exports = { initCronJobs };