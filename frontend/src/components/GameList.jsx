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
            <th>Game #</th>
            <th>Status</th>
            <th>Date Played</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
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
            <h4>Game {game.game_number} Results</h4>
            {loadingOutcomes[game.id] ? (
              <div className="loading">Loading results...</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {gameOutcomes[game.id]?.map((outcome) => {
                    const player = players.find((p) => p.id === outcome.player_id);
                    return (
                      <tr key={outcome.id}>
                        <td>{player?.name || 'Unknown'}</td>
                        <td>{outcome.score}</td>
                        <td>
                          <span
                            className={`badge ${
                              outcome.result === 'win' ? 'badge-completed' : 'badge-pending'
                            }`}
                          >
                            {outcome.result}
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
