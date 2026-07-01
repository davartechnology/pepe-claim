const axios = require('axios');
const env = require('../config/env');
const FormData = require('form-data');

const FAUCETPAY_API_URL = 'https://faucetpay.io/api/v1/send';

/**
 * Envoie un paiement automatique via FaucetPay.
 * IMPORTANT: FaucetPay exige le format multipart/form-data (pas JSON)
 * @param {string} faucetpayEmailOrAddress - Email FaucetPay ou adresse du destinataire
 * @param {number} amount - Montant en PEPE (en satoshis : 1 PEPE = 100000000 satoshis)
 */
async function sendPayment(faucetpayEmailOrAddress, amount) {
    try {
        // FaucetPay attend le montant en satoshis (10^8)
        // 1 PEPE = 100000000 satoshis
        const amountInSatoshis = Math.round(amount * 100000000);

        const form = new FormData();
        form.append('api_key', env.FAUCETPAY_API_KEY);
        form.append('amount', amountInSatoshis.toString());
        form.append('to', faucetpayEmailOrAddress);
        form.append('currency', env.FAUCETPAY_CURRENCY);

        const response = await axios.post(FAUCETPAY_API_URL, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 15000
        });

        const result = response.data;

        if (result.status === 200) {
            return { success: true, data: result };
        }

        return { success: false, data: result };
    } catch (err) {
        console.error('Erreur FaucetPay:', err.response?.data || err.message);
        return {
            success: false,
            data: err.response?.data || { message: err.message }
        };
    }
}

module.exports = { sendPayment };