const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const { getReferralInfo } = require('../controllers/referral.controller');

router.get('/', telegramAuth, getReferralInfo);

module.exports = router;