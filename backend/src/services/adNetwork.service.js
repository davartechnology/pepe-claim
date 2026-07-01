const constants = require('../utils/constants');

const AD_NETWORK_CONFIG = {
    tads: {
        name: 'TADS',
        domain: 'tads.me',
        enabled: true
    },
    gigapub: {
        name: 'Gigapub',
        domain: 'gigapub.tech',
        enabled: true
    },
    adsgram: {
        name: 'Adsgram',
        domain: 'adsgram.ai',
        enabled: true
    },
    monetag: {
        name: 'Monetag',
        domain: 'monetag.com',
        enabled: true
    },
    adsxuit: {
        name: 'Adsxuit',
        domain: 'adsxuit.com',
        enabled: false // remplacé par Gigapub
    },
    adexium: {
        name: 'Adexium',
        domain: 'adexium.io',
        enabled: false // MAU insuffisant
    },
    adsmone: {
        name: 'Adsmone',
        domain: 'adsmone.com',
        enabled: false // écarté définitivement
    }
};

function getAvailableNetworks() {
    return constants.AD_NETWORKS_PRIORITY
        .filter((key) => AD_NETWORK_CONFIG[key]?.enabled)
        .map((key) => ({ key, ...AD_NETWORK_CONFIG[key] }));
}

function isValidNetwork(networkKey) {
    return Boolean(AD_NETWORK_CONFIG[networkKey]?.enabled);
}

module.exports = {
    AD_NETWORK_CONFIG,
    getAvailableNetworks,
    isValidNetwork
};