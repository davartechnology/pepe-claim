/**
 * Intégration des régies publicitaires (rewarded ads)
 * Actifs : TADS, Adsxuit, Adsgram
 * En attente : Monetag (compte à créer)
 * Hors flux Claim (revenu passif séparé) : Adexium
 */

const TADS_WIDGET_ID = '10246';
const ADSGRAM_BLOCK_ID = '36354';
const ADSXUIT_AD_DURATION_MS = 16000; // 15s de countdown officiel + 1s de marge

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

        // Le SDK peut renvoyer soit une Promise, soit directement le contrôleur
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
 * Adsxuit — pas de callback de complétion exposé, on attend la durée
 * documentée du countdown avant de considérer la pub comme vue.
 */
function showAdsxuitAd() {
    return new Promise((resolve) => {
        if (typeof window.__axReset === 'function') {
            window.__axReset();
        }
        document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        setTimeout(() => resolve(true), ADSXUIT_AD_DURATION_MS);
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
 * Monetag — en attente de compte/Zone ID, non fonctionnel pour l'instant
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
};

const AD_NETWORK_HANDLERS = {
    tads: showTadsAd,
    adsxuit: showAdsxuitAd,
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

/**
 * Réinitialise la bannière TGB TADS (peut être écrasée après
 * l'affichage d'un widget fullscreen du même SDK).
 */
function reinitTadsBanner() {
    if (!window.tads || typeof window.tads.init !== 'function') return;

    const tgbController = window.tads.init({
        widgetId: '10248',
        type: 'static',
        debug: false,
        onClickReward: () => {},
        onAdsNotFound: () => {}
    });

    tgbController.loadAd().then(() => tgbController.showAd()).catch(() => {});
}