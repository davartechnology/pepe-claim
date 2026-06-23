const axios = require('axios');
const env = require('../config/env');

const FAUCETPAY_API_URL = 'https://faucetpay.io/api/v1/send';

/**
 * Envoie un paiement automatique via FaucetPay.
 * @param {string} faucetpayEmailOrAddress - Email FaucetPay ou adresse du destinataire
 * @param {number} amount - Montant en PEPE
 * @returns {Promise<{success: boolean, data: object}>}
 */
async function sendPayment(faucetpayEmailOrAddress, amount) {
    try {
        const response = await axios.post(FAUCETPAY_API_URL, {
            api_key: env.FAUCETPAY_API_KEY,
            amount: amount,
            to: faucetpayEmailOrAddress,
            currency: env.FAUCETPAY_CURRENCY
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        });

        const result = response.data;

        // FaucetPay renvoie status 200 avec un champ "status" dans le body
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