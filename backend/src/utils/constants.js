module.exports = {
    // ===== CLAIM =====
    CLAIM_REWARD: 70,              // PEPE par claim
    CLAIM_RECHARGE_AMOUNT: 4,       // Claims rechargés à chaque cycle
    CLAIM_RECHARGE_INTERVAL_MIN: 15,// Toutes les 15 minutes
    MAX_CLAIMS_PER_DAY: 52,

    // ===== DAILY BONUS =====
    DAILY_BONUS_MIN: 1,
    DAILY_BONUS_MAX: 20,
    DAILY_BONUS_COOLDOWN_HOURS: 24,

    // ===== PARRAINAGE =====
    REFERRAL_PERCENT_LEVEL1: 0.15,
    REFERRAL_PERCENT_LEVEL2: 0.10,
    REFERRAL_PERCENT_LEVEL3: 0.05,

    // ===== WITHDRAW =====
    MIN_WITHDRAW_AMOUNT: 3000,

    // ===== GAMES =====
    GAMES: {
        coinflip: { minBet: 100, multiplier: 2 },
        dice: { minBet: 100, multiplier: 2, winningRolls: [4, 5, 6] },
        lucky_number: { minBet: 100, multiplier: 5 },
        slots: {
            minBet: 100,
            payouts: {
                '3_pepe': 10,   // 🐸🐸🐸
                '2_pepe_1_star': 3, // 🐸🐸⭐
                '1_pepe_2_star': 2  // 🐸⭐⭐
            }
        }
    },

    // ===== RÉGIES PUB (ordre de priorité) =====
    AD_NETWORKS_PRIORITY: ['tads', 'gigapub', 'adsgram', 'monetag']
};