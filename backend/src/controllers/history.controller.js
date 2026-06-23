const supabase = require('../config/supabase');

/**
 * GET /api/history
 * Retourne l'historique complet combiné et trié par date.
 */
async function getHistory(req, res) {
    try {
        const user = req.user;

        const [claims, bonuses, referrals, games, withdrawals] = await Promise.all([
            supabase.from('claim_history').select('*').eq('user_id', user.id),
            supabase.from('bonus_history').select('*').eq('user_id', user.id),
            supabase.from('referral_earnings').select('*').eq('to_user', user.id),
            supabase.from('games').select('*').eq('user_id', user.id),
            supabase.from('withdrawals').select('*').eq('user_id', user.id)
        ]);

        const events = [];

        (claims.data || []).forEach((c) => events.push({
            type: 'claim',
            amount: Number(c.reward),
            details: { adNetwork: c.ad_network },
            createdAt: c.created_at
        }));

        (bonuses.data || []).forEach((b) => events.push({
            type: 'daily_bonus',
            amount: Number(b.reward),
            createdAt: b.created_at
        }));

        (referrals.data || []).forEach((r) => events.push({
            type: 'referral_earning',
            amount: Number(r.reward),
            details: { level: r.level },
            createdAt: r.created_at
        }));

        (games.data || []).forEach((g) => events.push({
            type: g.win_amount > 0 ? 'game_win' : 'game_loss',
            amount: g.win_amount > 0 ? Number(g.win_amount) : -Number(g.bet_amount),
            details: { gameType: g.game_type, result: g.result, betAmount: Number(g.bet_amount) },
            createdAt: g.created_at
        }));

        (withdrawals.data || []).forEach((w) => events.push({
            type: 'withdraw_request',
            amount: -Number(w.amount),
            details: { status: w.status, wallet: w.wallet },
            createdAt: w.created_at
        }));

        events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return res.json({ events });
    } catch (err) {
        console.error('Erreur getHistory:', err);
        return res.status(500).json({ error: 'Erreur récupération historique' });
    }
}

module.exports = { getHistory };