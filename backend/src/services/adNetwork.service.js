const constants = require('../utils/constants');

const AD_NETWORK_CONFIG = {
    tads: {
        name: 'TADS',
        domain: 'tads.me',
        enabled: true
    },
    adexium: {
        name: 'Adexium',
        domain: 'adexium.io',
        enabled: false // en attente : pas de callback de complétion documenté
    },
    adsxuit: {
        name: 'Adsxuit',
        domain: 'adsxuit.com',
        enabled: true
    },
    adsmone: {
        name: 'Adsmone',
        domain: 'adsmone.com',
        enabled: false // écarté définitivement par décision projet
    }
};

/**
 * Retourne la liste des régies dans l'ordre de priorité,
 * en ne gardant que celles activées.
 */
function getAvailableNetworks() {
    return constants.AD_NETWORKS_PRIORITY
        .filter((key) => AD_NETWORK_CONFIG[key]?.enabled)
        .map((key) => ({ key, ...AD_NETWORK_CONFIG[key] }));
}

/**
 * Valide qu'une régie reçue dans une requête de claim est bien
 * une régie connue et activée du système (sécurité anti-triche).
 */
function isValidNetwork(networkKey) {
    return Boolean(AD_NETWORK_CONFIG[networkKey]?.enabled);
}

module.exports = {
    AD_NETWORK_CONFIG,
    getAvailableNetworks,
    isValidNetwork
};