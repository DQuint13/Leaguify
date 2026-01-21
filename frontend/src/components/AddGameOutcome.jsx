import React, { useState } from 'react';
import { addGameOutcomes } from '../services/api';

function AddGameOutcome({ game, players, onOutcomeAdded, onCancel }) {
  const [scores, setScores] = useState(
    players.reduce((acc, player) => {
      acc[player.id] = 0;
      return acc;
    }, {})
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScoreChange = (playerId, value) => {
    setScores((prev) => ({
      ...prev,
      [playerId]: parseInt(value) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const outcomes = players.map((player) => ({
        playerId: player.id,
        score: scores[player.id] || 0,
      }));

      const response = await addGameOutcomes(game.id, outcomes);
      
      // Show notification if a new cycle was started
      if (response.cycleStarted && response.newCycleNumber) {
        // You can add a toast notification here if desired
        console.log(`Cycle ${response.newCycleNumber} started automatically!`);
      }
      
      onOutcomeAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add game outcomes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Add Results for Game {game.game_number}</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        {players.map((player) => (
          <div key={player.id} className="form-group">
            <label htmlFor={`score-${player.id}`}>{player.name}</label>
            <input
              type="number"
              id={`score-${player.id}`}
              value={scores[player.id] || 0}
              onChange={(e) => handleScoreChange(player.id, e.target.value)}
              min="0"
              required
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Game'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddGameOutcome;
