function errorHandlerMiddleware(err, req, res, next) {
    console.error('❌ Erreur serveur:', err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        error: err.message || 'Erreur interne du serveur'
    });
}

module.exports = errorHandlerMiddleware;