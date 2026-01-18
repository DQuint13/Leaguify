const express = require('express');
const router = express.Router();
const { getLeagueStatisticsHandler } = require('../controllers/statsController');

// Get league statistics
router.get('/leagues/:id', getLeagueStatisticsHandler);

module.exports = router;
