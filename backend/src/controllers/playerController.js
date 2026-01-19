const { updatePlayerName, updatePlayerAvatar, updatePlayers, getPlayersByLeague } = require('../models/database');
const { uploadAvatar } = require('../services/s3Service');

async function updatePlayerNameHandler(req, res) {
  try {
    const { playerId } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Player name must be a non-empty string',
      });
    }

    const updatedPlayer = await updatePlayerName(playerId, name);
    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player name:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to update player name' });
  }
}

async function updatePlayersHandler(req, res) {
  try {
    const { id: leagueId } = req.params;
    const { players } = req.body;

    if (!players || !Array.isArray(players)) {
      return res.status(400).json({
        error: 'players must be provided as an array',
      });
    }

    if (players.length === 0) {
      return res.status(400).json({
        error: 'players array cannot be empty',
      });
    }

    // Validate all updates have required fields
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.id || !player.name) {
        return res.status(400).json({
          error: `Player at index ${i} must have both id and name`,
        });
      }
      if (typeof player.name !== 'string' || player.name.trim().length === 0) {
        return res.status(400).json({
          error: `Player name at index ${i} must be a non-empty string`,
        });
      }
    }

    // Verify all players belong to the league
    const leaguePlayers = await getPlayersByLeague(leagueId);
    const leaguePlayerIds = new Set(leaguePlayers.map(p => p.id));

    for (const player of players) {
      if (!leaguePlayerIds.has(player.id)) {
        return res.status(400).json({
          error: `Player with id ${player.id} does not belong to this league`,
        });
      }
    }

    const updatedPlayers = await updatePlayers(players);
    res.json(updatedPlayers);
  } catch (error) {
    console.error('Error updating players:', error);
    const statusCode = error.message.includes('must') || error.message.includes('not found') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to update players' });
  }
}

async function updatePlayerAvatarHandler(req, res) {
  try {
    const { playerId } = req.params;
    const { leagueId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
      });
    }

    // Verify player belongs to league
    const leaguePlayers = await getPlayersByLeague(leagueId);
    const playerExists = leaguePlayers.some(p => p.id === playerId);
    
    if (!playerExists) {
      return res.status(400).json({
        error: 'Player does not belong to this league',
      });
    }

    // Upload to S3
    const avatarUrl = await uploadAvatar(req.file.buffer, req.file.mimetype);

    // Update player avatar in database
    const updatedPlayer = await updatePlayerAvatar(playerId, avatarUrl);
    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player avatar:', error);
    const statusCode = error.message.includes('Invalid') || error.message.includes('exceeds') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to update player avatar' });
  }
}

module.exports = {
  updatePlayerNameHandler,
  updatePlayersHandler,
  updatePlayerAvatarHandler,
};
