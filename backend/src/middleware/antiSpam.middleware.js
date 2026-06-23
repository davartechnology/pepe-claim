// Stockage en mémoire des dernières actions (simple et efficace pour V1)
// Pour scaler davantage plus tard, on pourra migrer vers Redis
const lastActionMap = new Map();

const MIN_DELAY_MS = 1500; // délai minimum entre 2 actions identiques

function antiSpamMiddleware(actionType) {
    return (req, res, next) => {
        const userId = req.user?.id;
        if (!userId) return next();

        const key = `${userId}_${actionType}`;
        const now = Date.now();
        const lastAction = lastActionMap.get(key);

        if (lastAction && now - lastAction < MIN_DELAY_MS) {
            return res.status(429).json({
                error: 'Action trop rapide, veuillez patienter quelques secondes'
            });
        }

        lastActionMap.set(key, now);
        next();
    };
}

// Nettoyage périodique de la map pour éviter une fuite mémoire
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of lastActionMap.entries()) {
        if (now - timestamp > 60000) {
            lastActionMap.delete(key);
        }
    }
}, 60000);

module.exports = antiSpamMiddleware;