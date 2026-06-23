const supabase = require('../config/supabase');
const constants = require('../utils/constants');
const faucetpayService = require('../services/faucetpay.service');
const { isPositiveNumber, isValidWalletAddress } = require('../utils/validators');

/**
 * POST /api/withdraw
 * Body: { wallet: "email@faucetpay.io" ou adresse, amount: 3500 }
 */
async function requestWithdraw(req, res) {
    try {
        const user = req.user;
        const { wallet, amount } = req.body;

        // 1. Validations de base
        if (!isValidWalletAddress(wallet)) {
            return res.status(400).json({ error: 'Adresse/Email FaucetPay invalide' });
        }

        if (!isPositiveNumber(amount)) {
            return res.status(400).json({ error: 'Montant invalide' });
        }

        if (amount < constants.MIN_WITHDRAW_AMOUNT) {
            return res.status(400).json({
                error: `Montant minimum de retrait : ${constants.MIN_WITHDRAW_AMOUNT} PEPE`
            });
        }

        if (Number(user.balance) < amount) {
            return res.status(400).json({ error: 'Solde insuffisant' });
        }

        // 2. Crée la demande en statut "pending"
        const { data: withdrawal, error: insertError } = await supabase
            .from('withdrawals')
            .insert({
                user_id: user.id,
                wallet,
                amount,
                status: 'pending'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Erreur création withdrawal:', insertError);
            return res.status(500).json({ error: 'Erreur création demande de retrait' });
        }

        // 3. Débite immédiatement le solde (évite double-retrait pendant l'appel API)
        const balanceBeforeWithdraw = Number(user.balance);
        const newBalance = balanceBeforeWithdraw - amount;

        await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', user.id);

        // 4. Appelle FaucetPay pour envoyer le paiement automatiquement
        const paymentResult = await faucetpayService.sendPayment(wallet, amount);

        if (paymentResult.success) {
            await supabase
                .from('withdrawals')
                .update({
                    status: 'approved',
                    faucetpay_response: paymentResult.data
                })
                .eq('id', withdrawal.id);

            return res.json({
                success: true,
                status: 'approved',
                newBalance,
                message: 'Paiement envoyé avec succès via FaucetPay'
            });
        } else {
            // Échec du paiement -> on rembourse l'utilisateur et on marque "rejected"
            await supabase
                .from('users')
                .update({ balance: balanceBeforeWithdraw })
                .eq('id', user.id);

            await supabase
                .from('withdrawals')
                .update({
                    status: 'rejected',
                    faucetpay_response: paymentResult.data
                })
                .eq('id', withdrawal.id);

            return res.status(502).json({
                success: false,
                status: 'rejected',
                error: 'Échec du paiement FaucetPay, montant remboursé',
                details: paymentResult.data
            });
        }
    } catch (err) {
        console.error('Erreur requestWithdraw:', err);
        return res.status(500).json({ error: 'Erreur serveur lors du retrait' });
    }
}

/**
 * GET /api/withdraw/history
 */
async function getWithdrawHistory(req, res) {
    try {
        const user = req.user;

        const { data, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur fetch withdrawals:', error);
            return res.status(500).json({ error: 'Erreur récupération historique retraits' });
        }

        return res.json({ withdrawals: data });
    } catch (err) {
        console.error('Erreur getWithdrawHistory:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}

module.exports = { requestWithdraw, getWithdrawHistory };