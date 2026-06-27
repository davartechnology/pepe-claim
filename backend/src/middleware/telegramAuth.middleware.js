const crypto = require('crypto');
const env = require('../config/env');
const supabase = require('../config/supabase');

/**
 * Vérifie la signature des initData envoyées par Telegram Web App
 * Doc: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramInitData(initData) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckArr = [];
    for (const [key, value] of [...urlParams.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        dataCheckArr.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(env.TELEGRAM_BOT_TOKEN)
        .digest();

    const computedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    return computedHash === hash;
}

async function telegramAuthMiddleware(req, res, next) {
    try {
        const initData = req.headers['x-telegram-init-data'];

        if (!initData) {
            return res.status(401).json({ error: 'Authentification Telegram manquante' });
        }

        const isValid = verifyTelegramInitData(initData);
        if (!isValid) {
            return res.status(401).json({ error: 'Signature Telegram invalide' });
        }

        const urlParams = new URLSearchParams(initData);
        const userJson = urlParams.get('user');
        if (!userJson) {
            return res.status(401).json({ error: 'Données utilisateur Telegram manquantes' });
        }

        const tgUser = JSON.parse(userJson);

        let { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', tgUser.id)
            .single();

        if (!user) {
            const referrerStartParam = urlParams.get('start_param');
            let referrerId = null;

            if (referrerStartParam) {
                const { data: referrer } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', referrerStartParam)
                    .single();
                if (referrer) referrerId = referrer.id;
            }

            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert({
                    telegram_id: tgUser.id,
                    username: tgUser.username || tgUser.first_name || 'Utilisateur',
                    referrer_id: referrerId
                })
                .select()
                .single();

            if (insertError) {
                console.error('Erreur création utilisateur:', insertError);
                return res.status(500).json({ error: 'Erreur création utilisateur' });
            }

            if (referrerId) {
                await updateReferrerCounts(referrerId);
            }

            user = newUser;
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Erreur telegramAuthMiddleware:', err);
        return res.status(500).json({ error: 'Erreur authentification' });
    }
}

async function updateReferrerCounts(referrerId) {
    const { data: referrer } = await supabase
        .from('users')
        .select('id, referrer_id, level1_count')
        .eq('id', referrerId)
        .single();

    if (!referrer) return;

    await supabase
        .from('users')
        .update({ level1_count: referrer.level1_count + 1 })
        .eq('id', referrer.id);

    if (referrer.referrer_id) {
        const { data: level2Referrer } = await supabase
            .from('users')
            .select('id, level2_count')
            .eq('id', referrer.referrer_id)
            .single();

        if (level2Referrer) {
            await supabase
                .from('users')
                .update({ level2_count: level2Referrer.level2_count + 1 })
                .eq('id', level2Referrer.id);

            const { data: level3ReferrerRow } = await supabase
                .from('users')
                .select('referrer_id')
                .eq('id', level2Referrer.id)
                .single();

            if (level3ReferrerRow && level3ReferrerRow.referrer_id) {
                const { data: level3Referrer } = await supabase
                    .from('users')
                    .select('id, level3_count')
                    .eq('id', level3ReferrerRow.referrer_id)
                    .single();

                if (level3Referrer) {
                    await supabase
                        .from('users')
                        .update({ level3_count: level3Referrer.level3_count + 1 })
                        .eq('id', level3Referrer.id);
                }
            }
        }
    }
}

module.exports = telegramAuthMiddleware;