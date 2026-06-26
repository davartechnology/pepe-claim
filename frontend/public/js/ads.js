/**
 * Intégration des régies publicitaires (rewarded ads)
 * Actif : TADS (callback fiable), Adsxuit (fallback, sans callback confirmé)
 * En attente de documentation complète : Adexium
 */

const TADS_WIDGET_ID = '10246';
const ADSXUIT_AD_DURATION_MS = 16000; // 15s de countdown officiel + 1s de marge

/**
 * TADS — utilise le vrai callback onShowReward pour confirmer
 * que l'utilisateur a bien reçu la récompense après la pub fullscreen.
 */
function showTadsAd() {
    return new Promise((resolve, reject) => {
        if (!window.tads || typeof window.tads.init !== 'function') {
            reject(new Error('TADS SDK non chargé'));
            return;
        }

        const onShowRewardCallback = () => {
            resolve(true);
        };

        const onAdsNotFound = () => {
            reject(new Error('Aucune publicité TADS disponible'));
        };

        const adController = window.tads.init({
            widgetId: TADS_WIDGET_ID,
            type: 'fullscreen',
            debug: false,
            onShowReward: onShowRewardCallback,
            onAdsNotFound: onAdsNotFound
        });

        adController
            .then(() => adController.showAd())
            .catch((err) => {
                console.error('Erreur TADS:', err);
                reject(new Error('Erreur lors du chargement de la publicité TADS'));
            });
    });
}

/**
 * Adsxuit — pas de callback de complétion exposé par leur SDK.
 * On déclenche l'overlay (countdown 15s géré par eux) et on attend
 * la durée documentée avant de considérer la pub comme vue.
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
 * Table de correspondance régie -> fonction d'affichage
 */
const AD_NETWORK_HANDLERS = {
    tads: showTadsAd,
    adsxuit: showAdsxuitAd
    // adexium: à ajouter dès que leur callback de complétion est documenté
};

/**
 * Point d'entrée unique appelé par app.js pour afficher une pub
 * selon la régie choisie par le backend (ordre de priorité).
 * Si la régie prioritaire échoue (ex: pas de pub dispo), on tente
 * automatiquement la suivante.
 */
async function watchAd(networkKey) {
    const handler = AD_NETWORK_HANDLERS[networkKey];

    if (!handler) {
        throw new Error(`La régie "${networkKey}" n'est pas encore intégrée`);
    }

    showToast(`Chargement de la publicité...`);
    return handler();
}