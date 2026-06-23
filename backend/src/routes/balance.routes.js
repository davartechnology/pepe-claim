const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const { getBalance } = require('../controllers/balance.controller');

router.get('/', telegramAuth, getBalance);

module.exports = router;