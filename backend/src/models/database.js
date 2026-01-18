const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection pool
let pool;

function initDatabase(config) {
  if (!pool) {
    pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl || false,
    });
  }
  return pool;
}

async function createTables() {
  const client = await pool.connect();
  try {
    // Create leagues table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leagues (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        num_players INTEGER NOT NULL,
        num_games INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY,
        league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create games table
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY,
        league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
        game_number INTEGER NOT NULL,
        date_played TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        UNIQUE(league_id, game_number)
      )
    `);

    // Create game_outcomes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_outcomes (
        id UUID PRIMARY KEY,
        game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        result VARCHAR(10) NOT NULL,
        UNIQUE(game_id, player_id)
      )
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_league_id ON players(league_id);
      CREATE INDEX IF NOT EXISTS idx_games_league_id ON games(league_id);
      CREATE INDEX IF NOT EXISTS idx_game_outcomes_game_id ON game_outcomes(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_outcomes_player_id ON game_outcomes(player_id);
    `);
  } finally {
    client.release();
  }
}

// League queries
async function createLeague(name, numPlayers, numGames) {
  const leagueId = uuidv4();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert league
    await client.query(
      'INSERT INTO leagues (id, name, num_players, num_games) VALUES ($1, $2, $3, $4)',
      [leagueId, name, numPlayers, numGames]
    );

    // Create players
    const playerIds = [];
    for (let i = 1; i <= numPlayers; i++) {
      const playerId = uuidv4();
      await client.query(
        'INSERT INTO players (id, league_id, name) VALUES ($1, $2, $3)',
        [playerId, leagueId, `Player ${i}`]
      );
      playerIds.push(playerId);
    }

    // Create games
    const gameIds = [];
    for (let i = 1; i <= numGames; i++) {
      const gameId = uuidv4();
      await client.query(
        'INSERT INTO games (id, league_id, game_number, status) VALUES ($1, $2, $3, $4)',
        [gameId, leagueId, i, 'pending']
      );
      gameIds.push(gameId);
    }

    await client.query('COMMIT');
    return { leagueId, playerIds, gameIds };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getLeagueById(leagueId) {
  const result = await pool.query(
    'SELECT * FROM leagues WHERE id = $1',
    [leagueId]
  );
  return result.rows[0];
}

async function getPlayersByLeague(leagueId) {
  const result = await pool.query(
    'SELECT * FROM players WHERE league_id = $1 ORDER BY name',
    [leagueId]
  );
  return result.rows;
}

async function getGamesByLeague(leagueId) {
  const result = await pool.query(
    'SELECT * FROM games WHERE league_id = $1 ORDER BY game_number',
    [leagueId]
  );
  return result.rows;
}

async function getGameById(gameId) {
  const result = await pool.query(
    'SELECT * FROM games WHERE id = $1',
    [gameId]
  );
  return result.rows[0];
}

async function addGameOutcomes(gameId, outcomes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing outcomes for this game
    await client.query('DELETE FROM game_outcomes WHERE game_id = $1', [gameId]);

    // Insert new outcomes
    for (const outcome of outcomes) {
      await client.query(
        'INSERT INTO game_outcomes (id, game_id, player_id, score, result) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), gameId, outcome.playerId, outcome.score, outcome.result]
      );
    }

    // Update game status to completed
    await client.query(
      'UPDATE games SET status = $1, date_played = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', gameId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getGameOutcomes(gameId) {
  const result = await pool.query(
    'SELECT * FROM game_outcomes WHERE game_id = $1',
    [gameId]
  );
  return result.rows;
}

async function getLeagueStatistics(leagueId) {
  const client = await pool.connect();
  try {
    // Get all players with their statistics
    const statsQuery = `
      SELECT 
        p.id,
        p.name,
        COUNT(CASE WHEN go.result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN go.result = 'loss' THEN 1 END) as losses,
        COALESCE(SUM(go.score), 0) as total_points_scored,
        (
          SELECT COALESCE(SUM(go2.score), 0)
          FROM game_outcomes go2
          JOIN games g2 ON go2.game_id = g2.id
          WHERE g2.league_id = $1
          AND g2.id IN (
            SELECT game_id FROM game_outcomes WHERE player_id = p.id
          )
          AND go2.player_id != p.id
          AND go2.game_id IN (
            SELECT game_id FROM game_outcomes WHERE player_id = p.id
          )
        ) as total_points_against
      FROM players p
      LEFT JOIN game_outcomes go ON p.id = go.player_id
      WHERE p.league_id = $1
      GROUP BY p.id, p.name
      ORDER BY wins DESC, total_points_scored DESC
    `;

    const statsResult = await client.query(statsQuery, [leagueId]);
    
    // Calculate win rate and format statistics
    const statistics = statsResult.rows.map(player => {
      const wins = parseInt(player.wins) || 0;
      const losses = parseInt(player.losses) || 0;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(2) : 0;
      
      return {
        id: player.id,
        name: player.name,
        wins,
        losses,
        totalPointsScored: parseInt(player.total_points_scored) || 0,
        totalPointsAgainst: parseInt(player.total_points_against) || 0,
        winRate: parseFloat(winRate),
        totalGames
      };
    });

    return statistics;
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
  createTables,
  createLeague,
  getLeagueById,
  getPlayersByLeague,
  getGamesByLeague,
  getGameById,
  addGameOutcomes,
  getGameOutcomes,
  getLeagueStatistics,
};
