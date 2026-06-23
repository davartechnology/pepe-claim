const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Client backend avec la clé de service (accès complet, jamais exposée au frontend)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

module.exports = supabase;