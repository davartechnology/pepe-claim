const constants = require('../utils/constants');

/**
 * Simule/vérifie la disponibilité d'une régie publicitaire.
 * NOTE: Chaque régie (TADS, Adexium, Adsxuit, Adsmone) a sa propre logique
 * d'intégration SDK côté FRONTEND. Ce service côté backend sert surtout à :
 * 1. Déterminer quelle régie proposer en priorité au frontend
 * 2. Valider qu'un callback de complétion de pub provient bien d'une régie valide
 *
 * Le SDK de chaque régie sera intégré côté frontend (js/ads.js) car c'est
 * généralement là que se fait l'affichage des pubs vidéo/interstitielles.
 */

const AD_NETWORK_CONFIG = {
    tads: {
        name: 'TADS',
        domain: 'tads.me',
        enabled: true
    },
    adexium: {
        name: 'Adexium',
        domain: 'adexium.io',
        enabled: true
    },
    adsxuit: {
        name: 'Adsxuit',
        domain: 'adsxuit.com',
        enabled: true
    },
    adsmone: {
        name: 'Adsmone',
        domain: 'adsmone.com',
        enabled: true
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