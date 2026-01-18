const {
  createLeague,
  getLeagueById,
  getPlayersByLeague,
  getGamesByLeague,
} = require('../models/database');

async function createLeagueHandler(req, res) {
  try {
    const { name, numPlayers, numGames } = req.body;

    if (!name || !numPlayers || !numGames) {
      return res.status(400).json({
        error: 'Missing required fields: name, numPlayers, numGames',
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

    const { leagueId, playerIds, gameIds } = await createLeague(
      name,
      numPlayers,
      numGames
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
    res.status(500).json({ error: 'Failed to create league' });
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

module.exports = {
  createLeagueHandler,
  getLeagueHandler,
  getPlayersHandler,
  getGamesHandler,
};
