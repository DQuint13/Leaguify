const express = require('express');
const router = express.Router();
const {
  createLeagueHandler,
  getLeagueHandler,
  getPlayersHandler,
  getGamesHandler,
} = require('../controllers/leagueController');

// Create a new league
router.post('/', createLeagueHandler);

// Get league by ID
router.get('/:id', getLeagueHandler);

// Get all players in a league
router.get('/:id/players', getPlayersHandler);

// Get all games in a league
router.get('/:id/games', getGamesHandler);

module.exports = router;
