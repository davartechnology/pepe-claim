const express = require('express');
const router = express.Router();

const telegramAuth = require('../middleware/telegramAuth.middleware');
const { getDashboard } = require('../controllers/user.controller');

router.get('/dashboard', telegramAuth, getDashboard);

module.exports = router;