const express = require('express');
const router = express.Router();

router.use('/claim', require('./claim.routes'));
router.use('/bonus', require('./bonus.routes'));
router.use('/referral', require('./referral.routes'));
router.use('/balance', require('./balance.routes'));
router.use('/withdraw', require('./withdraw.routes'));
router.use('/games', require('./games.routes'));
router.use('/history', require('./history.routes'));
router.use('/user', require('./user.routes'));

module.exports = router;