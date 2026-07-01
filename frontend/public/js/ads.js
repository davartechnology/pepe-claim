/**
 * Intégration des régies publicitaires (rewarded ads)
 * Actifs : TADS, Gigapub, Adsgram, Monetag
 * Hors flux Claim (revenu passif) : bannière TADS TGB
 * Retirés : Adsxuit (remplacé par Gigapub), Adexium (MAU insuffisant)
 */

const TADS_WIDGET_ID = '10246';
const TADS_BANNER_WIDGET_ID = '10248';
const ADSGRAM_BLOCK_ID = '36354';

let adsgramController = null;

function getAdsgramController() {
    if (!adsgramController && window.Adsgram) {
        adsgramController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
    }
    return adsgramController;
}

/**
 * TADS — callback fiable onShowReward
 */
function showTadsAd() {
    return new Promise((resolve, reject) => {
        if (!window.tads || typeof window.tads.init !== 'function') {
            reject(new Error('TADS SDK non chargé'));
            return;
        }

        const onShowRewardCallback = () => resolve(true);
        const onAdsNotFound = () => reject(new Error('Aucune publicité TADS disponible'));

        const adController = window.tads.init({
            widgetId: TADS_WIDGET_ID,
            type: 'fullscreen',
            debug: false,
            onShowReward: onShowRewardCallback,
            onAdsNotFound: onAdsNotFound
        });

        if (adController && typeof adController.then === 'function') {
            adController
                .then((ctrl) => (ctrl || adController).showAd())
                .catch((err) => {
                    console.error('Erreur TADS:', err);
                    reject(new Error('Erreur lors du chargement de la publicité TADS'));
                });
        } else if (adController && typeof adController.showAd === 'function') {
            adController.showAd().catch((err) => {
                console.error('Erreur TADS:', err);
                reject(new Error('Erreur lors du chargement de la publicité TADS'));
            });
        } else {
            reject(new Error('Réponse TADS SDK inattendue'));
        }
    });
}

/**
 * Gigapub — remplace Adsxuit, callback Promise natif
 */
function showGigapubAd() {
    return new Promise((resolve, reject) => {
        if (typeof window.showGiga !== 'function') {
            reject(new Error('Gigapub SDK non chargé'));
            return;
        }

        window.showGiga()
            .then(() => resolve(true))
            .catch((e) => {
                console.error('Erreur Gigapub:', e);
                reject(new Error('Aucune publicité Gigapub disponible'));
            });
    });
}

/**
 * Adsgram — callback fiable via Promise .then()/.catch()
 */
function showAdsgramAd() {
    return new Promise((resolve, reject) => {
        const controller = getAdsgramController();

        if (!controller) {
            reject(new Error('Adsgram SDK non chargé'));
            return;
        }

        controller.show()
            .then((result) => {
                if (result.done) {
                    resolve(true);
                } else {
                    reject(new Error('Publicité Adsgram non terminée'));
                }
            })
            .catch((result) => {
                console.error('Erreur Adsgram:', result);
                reject(new Error('Aucune publicité Adsgram disponible'));
            });
    });
}

/**
 * Monetag — SDK rewarded interstitial
 */
function showMonetagAd() {
    return new Promise((resolve, reject) => {
        if (typeof window.show_11217138 !== 'function') {
            reject(new Error('Monetag SDK non chargé'));
            return;
        }

        window.show_11217138()
            .then(() => resolve(true))
            .catch(() => reject(new Error('Aucune publicité Monetag disponible')));
    });
}

/**
 * Réinitialise la bannière TGB TADS après un widget fullscreen
 */
function reinitTadsBanner() {
    if (!window.tads || typeof window.tads.init !== 'function') return;

    const tgbController = window.tads.init({
        widgetId: TADS_BANNER_WIDGET_ID,
        type: 'static',
        debug: false,
        onClickReward: () => {},
        onAdsNotFound: () => {}
    });

    if (tgbController && typeof tgbController.loadAd === 'function') {
        tgbController.loadAd().then(() => tgbController.showAd()).catch(() => {});
    }
}

const AD_NETWORK_HANDLERS = {
    tads: showTadsAd,
    gigapub: showGigapubAd,
    adsgram: showAdsgramAd,
    monetag: showMonetagAd
};

/**
 * Point d'entrée appelé par app.js pour afficher une pub
 * pour une régie précise (l'utilisateur choisit le bouton).
 */
async function watchAd(networkKey) {
    const handler = AD_NETWORK_HANDLERS[networkKey];

    if (!handler) {
        throw new Error(`La régie "${networkKey}" n'est pas encore intégrée`);
    }

    showToast(`Chargement de la publicité...`);
    return handler();
}