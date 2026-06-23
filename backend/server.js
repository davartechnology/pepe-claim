const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./src/config/env');

const apiRoutes = require('./src/routes/index');
const errorHandler = require('./src/middleware/errorHandler.middleware');
const { initCronJobs } = require('./src/services/cron.service');

const app = express();

// ===== Middlewares globaux =====
app.use(helmet());
app.use(cors({
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-telegram-init-data']
}));
app.use(express.json());

// ===== Route de santé (vérifier que le serveur tourne) =====
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'PEPE CLAIM API is running 🐸' });
});

// ===== Routes API =====
app.use('/api', apiRoutes);

// ===== Route 404 =====
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// ===== Gestion globale des erreurs (toujours en dernier) =====
app.use(errorHandler);

// ===== Démarrage du serveur =====
app.listen(env.PORT, () => {
    console.log(`🚀 PEPE CLAIM Backend démarré sur le port ${env.PORT}`);
    console.log(`🌍 Environnement: ${env.NODE_ENV}`);
    initCronJobs();
});