/**
 * Script de test automatisé — cooldown de claim par régie pub.
 *
 * Simule un utilisateur Telegram valide (même signature HMAC que
 * telegramAuth.middleware.js) et appelle directement l'API backend,
 * SANS ouvrir Telegram, SANS regarder de vraie pub.
 *
 * L'API /api/claim ne vérifie jamais côté serveur qu'une pub a vraiment
 * été regardée (elle fait confiance au frontend) — donc appeler cette
 * route directement avec un adNetwork valide est un test légitime et
 * représentatif du comportement réel.
 *
 * USAGE :
 *   1) Remplis TELEGRAM_BOT_TOKEN et API_BASE_URL ci-dessous (ou passe-les
 *      en variables d'environnement).
 *   2) node test-claim-cooldown.js
 *
 * RECOMMANDÉ : lance d'abord ce script contre ton backend EN LOCAL
 * (node server.js sur ta machine, avec le même .env) avant de redéployer
 * sur Railway. Zéro risque, zéro consommation de ta fenêtre de redeploy.
 * Tu peux ensuite relancer le même script contre l'URL Railway après
 * déploiement pour confirmer que la prod se comporte pareil.
 *
 * NOTE : ce script crée un vrai utilisateur de test dans ta base Supabase
 * (telegram_id = TEST_TELEGRAM_ID ci-dessous). Facilement identifiable et
 * supprimable ensuite (username "test_script_pepeclaim").
 */

const crypto = require('crypto');

// ===== CONFIG — à adapter =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8639880251:AAGIuRHpch_MaOmCf0tHJEYDWYcw8upcCvk';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
// Utilise un ID bien distinct de tes vrais utilisateurs Telegram.
const TEST_TELEGRAM_ID = Number(process.env.TEST_TELEGRAM_ID || 999000111);

// ===== Génère un initData Telegram valide (même algo que le backend) =====
function buildInitData(botToken, telegramUser) {
    const authDate = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams();
    params.set('auth_date', String(authDate));
    params.set('user', JSON.stringify(telegramUser));
    params.set('query_id', 'test_query_id_' + Date.now());

    const dataCheckArr = [...params.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}=${v}`);
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    params.set('hash', hash);
    return params.toString();
}

const initData = buildInitData(TELEGRAM_BOT_TOKEN, {
    id: TEST_TELEGRAM_ID,
    first_name: 'TestScript',
    username: 'test_script_pepeclaim'
});

async function api(path, { method = 'GET', body = null } = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-telegram-init-data': initData
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

function log(label, result) {
    console.log(`\n--- ${label} ---`);
    console.log('status:', result.status);
    console.log(JSON.stringify(result.data, null, 2));
}

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
    } else {
        console.log(`❌ ÉCHEC : ${message}`);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
    console.log(`Test contre : ${API_BASE_URL}`);
    console.log(`Telegram ID de test : ${TEST_TELEGRAM_ID}`);

    // 1. Statut initial — tous les réseaux devraient être disponibles
    const status0 = await api('/claim/status');
    log('1. Statut initial', status0);
    if (Array.isArray(status0.data.networks)) {
        assert(
            status0.data.networks.every((n) => n.available),
            'Tous les réseaux sont disponibles au départ'
        );
    } else {
        console.log('⚠️  Le champ "networks" est absent de la réponse — vérifie que getClaimStatus a bien été mis à jour.');
    }

    // 2. Claim sur TADS — doit réussir
    const claimTads = await api('/claim', { method: 'POST', body: { adNetwork: 'tads' } });
    log('2. Claim TADS', claimTads);
    assert(claimTads.status === 200 && claimTads.data.success, 'Le claim TADS réussit');
    assert(claimTads.data.reward === 70, 'La récompense est bien 70 PEPE');

    // 3. Claim IMMÉDIAT sur GIGAPUB — doit réussir (réseau indépendant)
    const claimGigapub = await api('/claim', { method: 'POST', body: { adNetwork: 'gigapub' } });
    log('3. Claim Gigapub juste après (sans attendre)', claimGigapub);
    assert(claimGigapub.status === 200 && claimGigapub.data.success, 'Gigapub n\'est PAS bloqué par le cooldown de TADS');

    // 4. Re-claim IMMÉDIAT sur TADS — bloqué, mais probablement par l'ANTI-SPAM (1,5s)
    // et non par le vrai cooldown de 15 min, puisque les requêtes s'enchaînent en millisecondes.
    const reclaimTads = await api('/claim', { method: 'POST', body: { adNetwork: 'tads' } });
    log('4. Re-claim TADS immédiat (doit échouer)', reclaimTads);
    assert(reclaimTads.status === 429, 'TADS est bien bloqué juste après un claim (429 attendu)');
    const blockedByAntiSpam = (reclaimTads.data.error || '').includes('trop rapide');
    console.log(
        blockedByAntiSpam
            ? 'ℹ️  Ce blocage vient du middleware ANTI-SPAM (1,5s), pas encore du vrai cooldown de 15 min — voir étape 4b.'
            : 'ℹ️  Ce blocage semble venir directement du cooldown 15 min (message différent de l\'anti-spam).'
    );

    // 4b. On attend 2s (le temps que l'anti-spam de 1,5s expire) puis on retente TADS.
    // Si ça bloque ENCORE, c'est cette fois le vrai cooldown de 15 min qui est testé isolément.
    console.log('\n⏳ Attente de 2s (pour dépasser la fenêtre anti-spam de 1,5s)...');
    await sleep(2000);

    const reclaimTads2 = await api('/claim', { method: 'POST', body: { adNetwork: 'tads' } });
    log('4b. Re-claim TADS après 2s (doit échouer via le VRAI cooldown 15 min)', reclaimTads2);
    assert(reclaimTads2.status === 429, 'TADS toujours bloqué après 2s (donc c\'est bien le cooldown 15 min, pas juste l\'anti-spam)');
    assert(
        !(reclaimTads2.data.error || '').includes('trop rapide'),
        'Le message d\'erreur vient du cooldown 15 min et non plus de l\'anti-spam (message différent attendu)'
    );

    // 5. Statut après claims — TADS et Gigapub doivent être "available: false", les autres "true"
    const status1 = await api('/claim/status');
    log('5. Statut après claims', status1);
    if (Array.isArray(status1.data.networks)) {
        const byKey = Object.fromEntries(status1.data.networks.map((n) => [n.key, n]));
        assert(byKey.tads && byKey.tads.available === false, 'TADS marqué indisponible avec cooldown');
        assert(byKey.gigapub && byKey.gigapub.available === false, 'Gigapub marqué indisponible avec cooldown');
        assert(byKey.adsgram && byKey.adsgram.available === true, 'Adsgram toujours disponible (non touché)');
        assert(byKey.monetag && byKey.monetag.available === true, 'Monetag toujours disponible (non touché)');
        if (byKey.tads) {
            assert(
                byKey.tads.secondsRemaining > 0 && byKey.tads.secondsRemaining <= 900,
                `secondsRemaining cohérent pour TADS (${byKey.tads.secondsRemaining}s, attendu entre 1 et 900)`
            );
        }
    }

    console.log('\n=== Test terminé ===');
    console.log('Pense à nettoyer la ligne "users" avec telegram_id =', TEST_TELEGRAM_ID, 'dans Supabase si tu ne veux pas la garder.');
})().catch((err) => {
    console.error('Erreur pendant le test :', err);
    process.exit(1);
});