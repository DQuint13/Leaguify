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
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add avatar_url column if it doesn't exist (migration)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='players' AND column_name='avatar_url'
        ) THEN
          ALTER TABLE players ADD COLUMN avatar_url VARCHAR(500);
        END IF;
      END $$;
    `);

    // Set default avatar for existing players without avatars
    await client.query(`
      UPDATE players 
      SET avatar_url = '/StephAvatar.png' 
      WHERE avatar_url IS NULL OR avatar_url = '';
    `);

    // Create games table
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY,
        league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
        game_number INTEGER NOT NULL,
        cycle_number INTEGER DEFAULT 1,
        date_played TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        UNIQUE(league_id, cycle_number, game_number)
      )
    `);

    // Add cycle_number column if it doesn't exist (migration)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='games' AND column_name='cycle_number'
        ) THEN
          ALTER TABLE games ADD COLUMN cycle_number INTEGER DEFAULT 1;
        END IF;
      END $$;
    `);

    // Fix unique constraint to include cycle_number if old constraint exists
    await client.query(`
      DO $$ 
      BEGIN
        -- Drop old constraint if it exists (without cycle_number)
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'games_league_id_game_number_key'
        ) THEN
          ALTER TABLE games DROP CONSTRAINT games_league_id_game_number_key;
        END IF;
        
        -- Add new constraint with cycle_number if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'games_league_id_cycle_number_game_number_key'
        ) THEN
          ALTER TABLE games ADD CONSTRAINT games_league_id_cycle_number_game_number_key 
          UNIQUE(league_id, cycle_number, game_number);
        END IF;
      END $$;
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
async function createLeague(name, numPlayers, numGames, playerNames) {
  // Validate playerNames array
  if (!playerNames || !Array.isArray(playerNames)) {
    throw new Error('playerNames must be an array');
  }
  if (playerNames.length !== numPlayers) {
    throw new Error(`playerNames array length (${playerNames.length}) must match numPlayers (${numPlayers})`);
  }
  // Validate all names are non-empty strings
  for (let i = 0; i < playerNames.length; i++) {
    if (!playerNames[i] || typeof playerNames[i] !== 'string' || playerNames[i].trim().length === 0) {
      throw new Error(`Player name at index ${i} must be a non-empty string`);
    }
  }

  const leagueId = uuidv4();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert league
    await client.query(
      'INSERT INTO leagues (id, name, num_players, num_games) VALUES ($1, $2, $3, $4)',
      [leagueId, name, numPlayers, numGames]
    );

    // Create players with provided names and default avatar
    const DEFAULT_AVATAR_URL = '/StephAvatar.png';
    const playerIds = [];
    for (let i = 0; i < numPlayers; i++) {
      const playerId = uuidv4();
      await client.query(
        'INSERT INTO players (id, league_id, name, avatar_url) VALUES ($1, $2, $3, $4)',
        [playerId, leagueId, playerNames[i].trim(), DEFAULT_AVATAR_URL]
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

async function getAllLeagues() {
  const result = await pool.query(
    'SELECT * FROM leagues ORDER BY created_at DESC'
  );
  return result.rows;
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
    'SELECT * FROM games WHERE league_id = $1 ORDER BY cycle_number DESC, game_number',
    [leagueId]
  );
  return result.rows;
}

async function getCurrentCycleGames(leagueId) {
  const result = await pool.query(
    `SELECT * FROM games 
     WHERE league_id = $1 
     AND cycle_number = (SELECT MAX(cycle_number) FROM games WHERE league_id = $1)
     ORDER BY game_number`,
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
    // Get current cycle number
    const currentCycleQuery = await client.query(
      'SELECT COALESCE(MAX(cycle_number), 1) as max_cycle FROM games WHERE league_id = $1',
      [leagueId]
    );
    const currentCycle = parseInt(currentCycleQuery.rows[0]?.max_cycle || 1);

    // Get all players
    const playersQuery = await client.query(
      'SELECT id, name, avatar_url FROM players WHERE league_id = $1',
      [leagueId]
    );

    // Get all completed cycles (excluding current cycle)
    const completedCyclesQuery = await client.query(
      `SELECT DISTINCT cycle_number 
       FROM games 
       WHERE league_id = $1 
       AND cycle_number < $2 
       AND status = 'completed'
       GROUP BY cycle_number
       HAVING COUNT(*) = (SELECT num_games FROM leagues WHERE id = $1)`,
      [leagueId, currentCycle]
    );
    const completedCycles = completedCyclesQuery.rows.map(r => parseInt(r.cycle_number));

    // Get all game wins (total wins across all games)
    const gameWinsQuery = await client.query(
      `SELECT 
        p.id,
        COUNT(CASE WHEN go.result = 'win' THEN 1 END) as game_wins
      FROM players p
      LEFT JOIN game_outcomes go ON p.id = go.player_id
      LEFT JOIN games g ON go.game_id = g.id
      WHERE p.league_id = $1
      GROUP BY p.id`,
      [leagueId]
    );
    const gameWinsMap = {};
    gameWinsQuery.rows.forEach(row => {
      gameWinsMap[row.id] = parseInt(row.game_wins) || 0;
    });

    // Calculate cycle wins (cycles where player had most wins)
    const cycleWinsMap = {};
    for (const cycleNum of completedCycles) {
      // Get wins per player for this cycle
      const cycleWinsQuery = await client.query(
        `SELECT 
          p.id,
          COUNT(CASE WHEN go.result = 'win' THEN 1 END) as wins
        FROM players p
        LEFT JOIN game_outcomes go ON p.id = go.player_id
        LEFT JOIN games g ON go.game_id = g.id
        WHERE p.league_id = $1 AND g.cycle_number = $2
        GROUP BY p.id
        ORDER BY wins DESC`,
        [leagueId, cycleNum]
      );

      if (cycleWinsQuery.rows.length > 0) {
        const maxWins = parseInt(cycleWinsQuery.rows[0].wins) || 0;
        // All players with max wins get a cycle win
        cycleWinsQuery.rows.forEach(row => {
          if (parseInt(row.wins) === maxWins && maxWins > 0) {
            cycleWinsMap[row.id] = (cycleWinsMap[row.id] || 0) + 1;
          }
        });
      }
    }

    // Get current cycle points
    const currentCyclePointsQuery = await client.query(
      `SELECT 
        p.id,
        COALESCE(SUM(go.score), 0) as current_cycle_points
      FROM players p
      LEFT JOIN game_outcomes go ON p.id = go.player_id
      LEFT JOIN games g ON go.game_id = g.id
      WHERE p.league_id = $1 AND g.cycle_number = $2
      GROUP BY p.id`,
      [leagueId, currentCycle]
    );
    const currentCyclePointsMap = {};
    currentCyclePointsQuery.rows.forEach(row => {
      currentCyclePointsMap[row.id] = parseInt(row.current_cycle_points) || 0;
    });

    // Format statistics
    const statistics = playersQuery.rows.map(player => ({
      id: player.id,
      name: player.name,
      avatar_url: player.avatar_url,
      cycleWins: cycleWinsMap[player.id] || 0,
      gameWins: gameWinsMap[player.id] || 0,
      currentCyclePoints: currentCyclePointsMap[player.id] || 0
    }));

    return statistics;
  } finally {
    client.release();
  }
}

async function updatePlayerName(playerId, newName) {
  if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
    throw new Error('Player name must be a non-empty string');
  }

  const result = await pool.query(
    'UPDATE players SET name = $1 WHERE id = $2 RETURNING *',
    [newName.trim(), playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('Player not found');
  }

  return result.rows[0];
}

async function updatePlayerAvatar(playerId, avatarUrl) {
  const result = await pool.query(
    'UPDATE players SET avatar_url = $1 WHERE id = $2 RETURNING *',
    [avatarUrl, playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('Player not found');
  }

  return result.rows[0];
}

async function getPlayerVictories(playerId, leagueId) {
  const result = await pool.query(
    `SELECT COUNT(*) as victory_count
     FROM game_outcomes go
     JOIN games g ON go.game_id = g.id
     WHERE go.player_id = $1 
     AND g.league_id = $2 
     AND go.result = 'win'`,
    [playerId, leagueId]
  );
  return parseInt(result.rows[0].victory_count) || 0;
}

async function startNewCycle(leagueId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get league info
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    // Get current max cycle number
    const maxCycleResult = await client.query(
      'SELECT COALESCE(MAX(cycle_number), 0) as max_cycle FROM games WHERE league_id = $1',
      [leagueId]
    );
    const nextCycle = (maxCycleResult.rows[0].max_cycle || 0) + 1;

    // Create new games for the new cycle
    const gameIds = [];
    for (let i = 1; i <= league.num_games; i++) {
      const gameId = uuidv4();
      await client.query(
        'INSERT INTO games (id, league_id, game_number, cycle_number, status) VALUES ($1, $2, $3, $4, $5)',
        [gameId, leagueId, i, nextCycle, 'pending']
      );
      gameIds.push(gameId);
    }

    await client.query('COMMIT');
    return { cycleNumber: nextCycle, gameIds };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function addGameToLeague(leagueId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get league info
    const league = await getLeagueById(leagueId);
    if (!league) {
      throw new Error('League not found');
    }

    // Get current max cycle number
    const maxCycleResult = await client.query(
      'SELECT COALESCE(MAX(cycle_number), 0) as max_cycle FROM games WHERE league_id = $1',
      [leagueId]
    );
    const currentCycle = (maxCycleResult.rows[0].max_cycle || 0) || 1;

    // Get the next game number for the current cycle
    const maxGameResult = await client.query(
      'SELECT COALESCE(MAX(game_number), 0) as max_game FROM games WHERE league_id = $1 AND cycle_number = $2',
      [leagueId, currentCycle]
    );
    const nextGameNumber = (maxGameResult.rows[0].max_game || 0) + 1;

    // Create the new game
    const gameId = uuidv4();
    await client.query(
      'INSERT INTO games (id, league_id, game_number, cycle_number, status) VALUES ($1, $2, $3, $4, $5)',
      [gameId, leagueId, nextGameNumber, currentCycle, 'pending']
    );

    await client.query('COMMIT');
    return { gameId, gameNumber: nextGameNumber, cycleNumber: currentCycle };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function checkAndStartNewCycleIfComplete(leagueId) {
  try {
    // Get league info to know num_games
    const league = await getLeagueById(leagueId);
    if (!league) {
      return { cycleStarted: false, error: 'League not found' };
    }

    // Get current max cycle number
    const maxCycleResult = await pool.query(
      'SELECT COALESCE(MAX(cycle_number), 0) as max_cycle FROM games WHERE league_id = $1',
      [leagueId]
    );
    const currentCycle = (maxCycleResult.rows[0].max_cycle || 0) || 1;

    // Count completed games in current cycle
    const completedGamesResult = await pool.query(
      'SELECT COUNT(*) as completed_count FROM games WHERE league_id = $1 AND cycle_number = $2 AND status = $3',
      [leagueId, currentCycle, 'completed']
    );
    const completedCount = parseInt(completedGamesResult.rows[0].completed_count || 0);

    // Check if cycle is complete (completed games >= num_games)
    if (completedCount >= league.num_games) {
      // Start new cycle
      const result = await startNewCycle(leagueId);
      return { 
        cycleStarted: true, 
        newCycleNumber: result.cycleNumber,
        completedCount,
        numGames: league.num_games
      };
    }

    return { 
      cycleStarted: false, 
      completedCount,
      numGames: league.num_games,
      currentCycle
    };
  } catch (error) {
    console.error('Error checking cycle completion:', error);
    return { cycleStarted: false, error: error.message };
  }
}

async function updatePlayers(updates) {
  if (!Array.isArray(updates)) {
    throw new Error('updates must be an array');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedPlayers = [];
    for (const update of updates) {
      if (!update.id || !update.name) {
        throw new Error('Each update must have id and name');
      }
      if (typeof update.name !== 'string' || update.name.trim().length === 0) {
        throw new Error('Player name must be a non-empty string');
      }

      // Update name and optionally avatar_url
      const updateFields = ['name = $1'];
      const updateValues = [update.name.trim()];
      let paramIndex = 2;

      if (update.avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex}`);
        updateValues.push(update.avatar_url);
        paramIndex++;
      }

      const result = await client.query(
        `UPDATE players SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        [...updateValues, update.id]
      );

      if (result.rows.length === 0) {
        throw new Error(`Player with id ${update.id} not found`);
      }

      updatedPlayers.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return updatedPlayers;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function clearMockData(leagueId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete all game outcomes for this league
    await client.query(
      `DELETE FROM game_outcomes 
       WHERE game_id IN (
         SELECT id FROM games WHERE league_id = $1
       )`,
      [leagueId]
    );

    // Delete all games for this league
    await client.query(
      'DELETE FROM games WHERE league_id = $1',
      [leagueId]
    );

    await client.query('COMMIT');
    return { message: 'Mock data cleared successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createMockData(leagueId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get league info
    const leagueResult = await client.query(
      'SELECT num_players, num_games FROM leagues WHERE id = $1',
      [leagueId]
    );
    if (leagueResult.rows.length === 0) {
      throw new Error('League not found');
    }
    const { num_players, num_games } = leagueResult.rows[0];

    // Get players
    const playersResult = await client.query(
      'SELECT id FROM players WHERE league_id = $1 ORDER BY created_at',
      [leagueId]
    );
    const players = playersResult.rows;

    if (players.length === 0) {
      throw new Error('No players found in league');
    }

    // Find the highest existing cycle number
    const maxCycleResult = await client.query(
      'SELECT COALESCE(MAX(cycle_number), 0) as max_cycle FROM games WHERE league_id = $1',
      [leagueId]
    );
    const startCycle = parseInt(maxCycleResult.rows[0]?.max_cycle || 0) + 1;

    // Create 2 completed cycles with mock data
    for (let cycleOffset = 0; cycleOffset < 2; cycleOffset++) {
      const cycleNum = startCycle + cycleOffset;
      
      // Check if this cycle already exists
      const existingCycleCheck = await client.query(
        'SELECT COUNT(*) as count FROM games WHERE league_id = $1 AND cycle_number = $2',
        [leagueId, cycleNum]
      );
      
      if (parseInt(existingCycleCheck.rows[0].count) > 0) {
        console.log(`Cycle ${cycleNum} already exists, skipping...`);
        continue;
      }

      // Create games for this cycle
      const gameIds = [];
      for (let gameNum = 1; gameNum <= num_games; gameNum++) {
        const gameId = uuidv4();
        // Use ON CONFLICT to handle any duplicate key issues
        const insertResult = await client.query(
          `INSERT INTO games (id, league_id, game_number, cycle_number, status, date_played) 
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
           ON CONFLICT (league_id, cycle_number, game_number) DO UPDATE SET status = EXCLUDED.status
           RETURNING id`,
          [gameId, leagueId, gameNum, cycleNum, 'completed']
        );
        
        // Get the game ID (either from insert or fetch if conflict occurred)
        if (insertResult.rows.length > 0) {
          gameIds.push(insertResult.rows[0].id);
        } else {
          // If no return (shouldn't happen with DO UPDATE), fetch it
          const gameCheck = await client.query(
            'SELECT id FROM games WHERE league_id = $1 AND cycle_number = $2 AND game_number = $3',
            [leagueId, cycleNum, gameNum]
          );
          if (gameCheck.rows.length > 0) {
            gameIds.push(gameCheck.rows[0].id);
          }
        }
      }

      // Add mock outcomes for each game
      for (const gameId of gameIds) {
        // Distribute wins and scores randomly
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        const scores = [10, 8, 6, 4]; // Example scores
        
        for (let i = 0; i < players.length; i++) {
          const playerId = shuffledPlayers[i].id;
          const score = scores[i] || 2;
          const result = i === 0 ? 'win' : 'loss'; // First player wins
          
          await client.query(
            'INSERT INTO game_outcomes (id, game_id, player_id, score, result) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), gameId, playerId, score, result]
          );
        }
      }
    }

    await client.query('COMMIT');
    return { message: 'Mock data created successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  initDatabase,
  createTables,
  createLeague,
  getAllLeagues,
  getLeagueById,
  getPlayersByLeague,
  getGamesByLeague,
  getCurrentCycleGames,
  getGameById,
  addGameOutcomes,
  getGameOutcomes,
  getLeagueStatistics,
  updatePlayerName,
  updatePlayerAvatar,
  updatePlayers,
  getPlayerVictories,
  startNewCycle,
  addGameToLeague,
  checkAndStartNewCycleIfComplete,
  createMockData,
  clearMockData,
};
