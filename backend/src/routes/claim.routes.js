const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const antiSpam = require('../middleware/antiSpam.middleware');
const { getClaimStatus, claimReward } = require('../controllers/claim.controller');

router.get('/status', telegramAuth, getClaimStatus);
router.post('/', telegramAuth, antiSpam('claim'), claimReward);

module.exports = router;