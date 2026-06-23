const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const antiSpam = require('../middleware/antiSpam.middleware');
const { requestWithdraw, getWithdrawHistory } = require('../controllers/withdraw.controller');

router.post('/', telegramAuth, antiSpam('withdraw'), requestWithdraw);
router.get('/history', telegramAuth, getWithdrawHistory);

module.exports = router;