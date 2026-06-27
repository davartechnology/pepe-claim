const constants = require('../utils/constants');

const AD_NETWORK_CONFIG = {
    tads: {
        name: 'TADS',
        domain: 'tads.me',
        enabled: true
    },
    adsxuit: {
        name: 'Adsxuit',
        domain: 'adsxuit.com',
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
        enabled: false // en attente de compte/Zone ID
    },
    adexium: {
        name: 'Adexium',
        domain: 'adexium.io',
        enabled: false // utilisé en revenu passif séparé, pas dans le flux Claim
    },
    adsmone: {
        name: 'Adsmone',
        domain: 'adsmone.com',
        enabled: false // écarté définitivement par décision projet
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