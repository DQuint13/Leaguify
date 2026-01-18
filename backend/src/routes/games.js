const express = require('express');
const router = express.Router();
const {
  addGameOutcomeHandler,
  getGameOutcomeHandler,
} = require('../controllers/gameController');

// Add outcomes for a game
router.post('/:gameId/outcomes', addGameOutcomeHandler);

// Get outcomes for a game
router.get('/:gameId/outcomes', getGameOutcomeHandler);

module.exports = router;
