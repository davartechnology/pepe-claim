const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const antiSpam = require('../middleware/antiSpam.middleware');
const { playGame } = require('../controllers/games.controller');

router.post('/play', telegramAuth, antiSpam('games'), playGame);

module.exports = router;