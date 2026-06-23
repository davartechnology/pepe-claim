const adNetworkService = require('../services/adNetwork.service');

function isValidAdNetwork(networkKey) {
    return adNetworkService.isValidNetwork(networkKey);
}

function isPositiveNumber(value) {
    return typeof value === 'number' && value > 0 && !isNaN(value);
}

function isValidWalletAddress(wallet) {
    // Validation basique : non vide, longueur raisonnable
    return typeof wallet === 'string' && wallet.trim().length >= 5 && wallet.trim().length <= 200;
}

module.exports = { isValidAdNetwork, isPositiveNumber, isValidWalletAddress };