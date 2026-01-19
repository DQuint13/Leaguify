const {
  createLeague,
  getAllLeagues,
  getLeagueById,
  getPlayersByLeague,
  getGamesByLeague,
  getCurrentCycleGames,
  startNewCycle,
  createMockData,
} = require('../models/database');

async function createLeagueHandler(req, res) {
  try {
    const { name, numPlayers, numGames, playerNames } = req.body;

    if (!name || !numPlayers || !numGames) {
      return res.status(400).json({
        error: 'Missing required fields: name, numPlayers, numGames',
      });
    }

    if (!playerNames || !Array.isArray(playerNames)) {
      return res.status(400).json({
        error: 'playerNames must be provided as an array',
      });
    }

    if (numPlayers < 2) {
      return res.status(400).json({
        error: 'League must have at least 2 players',
      });
    }

    if (numGames < 1) {
      return res.status(400).json({
        error: 'League must have at least 1 game',
      });
    }

    if (playerNames.length !== numPlayers) {
      return res.status(400).json({
        error: `playerNames array length (${playerNames.length}) must match numPlayers (${numPlayers})`,
      });
    }

    // Validate all names are non-empty strings
    for (let i = 0; i < playerNames.length; i++) {
      if (!playerNames[i] || typeof playerNames[i] !== 'string' || playerNames[i].trim().length === 0) {
        return res.status(400).json({
          error: `Player name at index ${i} must be a non-empty string`,
        });
      }
    }

    const { leagueId, playerIds, gameIds } = await createLeague(
      name,
      numPlayers,
      numGames,
      playerNames
    );

    res.status(201).json({
      id: leagueId,
      name,
      numPlayers,
      numGames,
      playerIds,
      gameIds,
    });
  } catch (error) {
    console.error('Error creating league:', error);
    const statusCode = error.message.includes('must') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to create league' });
  }
}

async function getAllLeaguesHandler(req, res) {
  try {
    const leagues = await getAllLeagues();
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching all leagues:', error);
    res.status(500).json({ error: 'Failed to fetch leagues' });
  }
}

async function getLeagueHandler(req, res) {
  try {
    const { id } = req.params;
    const league = await getLeagueById(id);

    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }

    res.json(league);
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({ error: 'Failed to fetch league' });
  }
}

async function getPlayersHandler(req, res) {
  try {
    const { id } = req.params;
    const players = await getPlayersByLeague(id);
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
}

async function getGamesHandler(req, res) {
  try {
    const { id } = req.params;
    const games = await getGamesByLeague(id);
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
}

async function startNewCycleHandler(req, res) {
  try {
    const { id: leagueId } = req.params;

    // Check if all games in current cycle are completed
    const currentGames = await getCurrentCycleGames(leagueId);
    const allCompleted = currentGames.every(game => game.status === 'completed');

    if (!allCompleted) {
      return res.status(400).json({
        error: 'All games in the current cycle must be completed before starting a new cycle',
      });
    }

    const result = await startNewCycle(leagueId);
    res.json({
      message: 'New cycle started successfully',
      cycleNumber: result.cycleNumber,
      gameIds: result.gameIds,
    });
  } catch (error) {
    console.error('Error starting new cycle:', error);
    const statusCode = error.message.includes('must') || error.message.includes('not found') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to start new cycle' });
  }
}

async function createMockDataHandler(req, res) {
  try {
    const { id: leagueId } = req.params;
    const result = await createMockData(leagueId);
    res.json(result);
  } catch (error) {
    console.error('Error creating mock data:', error);
    res.status(500).json({ error: error.message || 'Failed to create mock data' });
  }
}

module.exports = {
  createLeagueHandler,
  getAllLeaguesHandler,
  getLeagueHandler,
  getPlayersHandler,
  getGamesHandler,
  startNewCycleHandler,
  createMockDataHandler,
};
