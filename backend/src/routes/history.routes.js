const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const { getHistory } = require('../controllers/history.controller');

router.get('/', telegramAuth, getHistory);

module.exports = router;