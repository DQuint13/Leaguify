const {
  getGameById,
  addGameOutcomes,
  getGameOutcomes,
  getPlayersByLeague,
  checkAndStartNewCycleIfComplete,
} = require('../models/database');

async function addGameOutcomeHandler(req, res) {
  try {
    const { gameId } = req.params;
    const { outcomes } = req.body;

    if (!outcomes || !Array.isArray(outcomes)) {
      return res.status(400).json({
        error: 'outcomes must be an array',
      });
    }

    // Validate game exists
    const game = await getGameById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get all players in the league to validate
    const players = await getPlayersByLeague(game.league_id);
    const playerIds = new Set(players.map(p => p.id));

    // Validate outcomes
    if (outcomes.length !== players.length) {
      return res.status(400).json({
        error: `Must provide outcomes for all ${players.length} players`,
      });
    }

    const outcomePlayerIds = new Set();
    for (const outcome of outcomes) {
      if (!outcome.playerId || outcome.score === undefined) {
        return res.status(400).json({
          error: 'Each outcome must have playerId and score',
        });
      }

      if (!playerIds.has(outcome.playerId)) {
        return res.status(400).json({
          error: `Player ${outcome.playerId} is not in this league`,
        });
      }

      if (outcomePlayerIds.has(outcome.playerId)) {
        return res.status(400).json({
          error: 'Duplicate player in outcomes',
        });
      }

      outcomePlayerIds.add(outcome.playerId);
    }

    // Determine win/loss for each player
    const scores = outcomes.map(o => ({ playerId: o.playerId, score: o.score }));
    const maxScore = Math.max(...scores.map(s => s.score));
    const minScore = Math.min(...scores.map(s => s.score));

    // If all scores are equal, no winners/losers
    // Otherwise, highest score wins, lowest loses
    const outcomesWithResults = outcomes.map(outcome => ({
      ...outcome,
      result: outcome.score === maxScore && maxScore !== minScore ? 'win' : 'loss',
    }));

    await addGameOutcomes(gameId, outcomesWithResults);

    // Check if cycle is complete and start new cycle if needed
    const cycleCheckResult = await checkAndStartNewCycleIfComplete(game.league_id);

    res.json({
      message: 'Game outcomes added successfully',
      gameId,
      cycleStarted: cycleCheckResult.cycleStarted || false,
      newCycleNumber: cycleCheckResult.newCycleNumber || null,
    });
  } catch (error) {
    console.error('Error adding game outcomes:', error);
    res.status(500).json({ error: 'Failed to add game outcomes' });
  }
}

async function getGameOutcomeHandler(req, res) {
  try {
    const { gameId } = req.params;
    const outcomes = await getGameOutcomes(gameId);
    res.json(outcomes);
  } catch (error) {
    console.error('Error fetching game outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch game outcomes' });
  }
}

module.exports = {
  addGameOutcomeHandler,
  getGameOutcomeHandler,
};
