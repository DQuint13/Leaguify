import React, { useState } from 'react';
import AddGameOutcome from './AddGameOutcome';
import { getGameOutcomes } from '../services/api';

function GameList({ games, players, leagueId, onOutcomeAdded }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameOutcomes, setGameOutcomes] = useState({});
  const [loadingOutcomes, setLoadingOutcomes] = useState({});

  const loadGameOutcomes = async (gameId) => {
    if (gameOutcomes[gameId]) return;

    setLoadingOutcomes((prev) => ({ ...prev, [gameId]: true }));
    try {
      const outcomes = await getGameOutcomes(gameId);
      setGameOutcomes((prev) => ({ ...prev, [gameId]: outcomes }));
    } catch (err) {
      console.error('Error loading game outcomes:', err);
    } finally {
      setLoadingOutcomes((prev) => ({ ...prev, [gameId]: false }));
    }
  };

  const handleGameClick = (game) => {
    if (game.status === 'pending') {
      setSelectedGame(game);
    } else {
      loadGameOutcomes(game.id);
      setSelectedGame(null);
    }
  };

  const handleOutcomeAdded = () => {
    setSelectedGame(null);
    setGameOutcomes({});
    onOutcomeAdded();
  };

  return (
    <div>
      <h3>Games</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Cycle</th>
            <th>Game #</th>
            <th>Status</th>
            <th>Date Played</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td>Cycle {game.cycle_number || 1}</td>
              <td>Game {game.game_number}</td>
              <td>
                <span className={`badge badge-${game.status}`}>
                  {game.status}
                </span>
              </td>
              <td>
                {game.date_played
                  ? new Date(game.date_played).toLocaleDateString()
                  : '-'}
              </td>
              <td>
                <button
                  className="btn btn-primary"
                  onClick={() => handleGameClick(game)}
                  style={{ fontSize: '14px', padding: '5px 10px' }}
                >
                  {game.status === 'pending' ? 'Add Results' : 'View Results'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedGame && (
        <div style={{ marginTop: '20px' }}>
          <AddGameOutcome
            game={selectedGame}
            players={players}
            onOutcomeAdded={handleOutcomeAdded}
            onCancel={() => setSelectedGame(null)}
          />
        </div>
      )}

      {games
        .filter((g) => g.status === 'completed' && gameOutcomes[g.id])
        .map((game) => (
          <div key={game.id} style={{ marginTop: '20px' }}>
            <h4>Cycle {game.cycle_number || 1} - Game {game.game_number} Results</h4>
            {loadingOutcomes[game.id] ? (
              <div className="loading">Loading results...</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Victory Points</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {gameOutcomes[game.id]?.map((outcome) => {
                    const player = players.find((p) => p.id === outcome.player_id);
                    const getInitials = (name) => {
                      if (!name) return '?';
                      const parts = name.trim().split(' ');
                      if (parts.length >= 2) {
                        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                      }
                      return name.substring(0, 2).toUpperCase();
                    };
                    return (
                      <tr key={outcome.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '35px',
                                height: '35px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                backgroundColor: '#e0e0e0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={player?.avatar_url || '/StephAvatar.png'}
                                alt={player?.name || 'Unknown'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <span>{player?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td>
                          <strong style={{ fontSize: '18px', color: outcome.result === 'win' ? '#27ae60' : '#333' }}>
                            {outcome.score}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              outcome.result === 'win' ? 'badge-completed' : 'badge-pending'
                            }`}
                          >
                            {outcome.result === 'win' ? '🏆 Win' : 'Loss'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))}
    </div>
  );
}

export default GameList;
