const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const antiSpam = require('../middleware/antiSpam.middleware');
const { getBonusStatus, claimBonus } = require('../controllers/bonus.controller');

router.get('/status', telegramAuth, getBonusStatus);
router.post('/claim', telegramAuth, antiSpam('bonus'), claimBonus);

module.exports = router;