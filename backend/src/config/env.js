require('dotenv').config();

const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'TELEGRAM_BOT_TOKEN',
    'FAUCETPAY_API_KEY'
];

function validateEnv() {
    const missing = requiredVars.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ Variables d'environnement manquantes: ${missing.join(', ')}`);
        console.error('➡️  Vérifiez votre fichier .env (basé sur .env.example)');
        process.exit(1);
    }
}

validateEnv();

module.exports = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,

    FAUCETPAY_API_KEY: process.env.FAUCETPAY_API_KEY,
    FAUCETPAY_CURRENCY: process.env.FAUCETPAY_CURRENCY || 'PEPE',

    FRONTEND_URL: process.env.FRONTEND_URL || '*'
};