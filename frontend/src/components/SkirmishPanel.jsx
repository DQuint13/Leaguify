import React, { useState, useEffect } from 'react';
import { getGameOutcomes } from '../services/api';
import AddGameOutcome from './AddGameOutcome';

function SkirmishPanel({ currentGame, players, onGameUpdated }) {
  const [gameOutcomes, setGameOutcomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (currentGame && currentGame.status === 'completed') {
      loadGameOutcomes();
      setShowAddForm(false);
    } else if (currentGame && currentGame.status === 'pending') {
      setShowAddForm(false);
      setGameOutcomes([]);
    }
  }, [currentGame]);

  const loadGameOutcomes = async () => {
    if (!currentGame) return;
    setLoading(true);
    try {
      const outcomes = await getGameOutcomes(currentGame.id);
      setGameOutcomes(outcomes);
    } catch (err) {
      console.error('Error loading game outcomes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (!currentGame) {
    return (
      <div className="skirmish-panel">
        <div className="skirmish-title">SKIRMISH</div>
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No active game. All games completed!
        </div>
      </div>
    );
  }

  if (showAddForm && currentGame.status === 'pending') {
    return (
      <div className="skirmish-panel">
        <div className="skirmish-title">SKIRMISH - Game {currentGame.game_number}</div>
        <AddGameOutcome
          game={currentGame}
          players={players}
          onOutcomeAdded={() => {
            setShowAddForm(false);
            if (onGameUpdated) onGameUpdated();
          }}
          onCancel={() => setShowAddForm(false)}
        />
      </div>
    );
  }

  const sortedOutcomes = [...gameOutcomes].sort((a, b) => b.score - a.score);
  const winners = sortedOutcomes.filter(o => o.result === 'win');
  const losers = sortedOutcomes.filter(o => o.result === 'loss');
  
  // If no outcomes yet, show all players split evenly
  if (gameOutcomes.length === 0 && currentGame.status === 'pending') {
    const midPoint = Math.ceil(players.length / 2);
    return (
      <div className="skirmish-panel">
        <div className="skirmish-title">
          SKIRMISH - Cycle {currentGame.cycle_number || 1} Game {currentGame.game_number}
        </div>
        <div className="skirmish-sections">
          <div className="skirmish-divider"></div>
          <div className="skirmish-section skirmish-section-left">
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#4CAF50' }}>
              Players
            </div>
            {players.slice(0, midPoint).map((player) => (
              <div key={player.id} className="skirmish-player-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    src={player.avatar_url || '/StephAvatar.png'}
                    alt={player.name}
                    className="skirmish-avatar"
                  />
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ fontWeight: '600' }}>{player.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="skirmish-section skirmish-section-right">
            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#F44336' }}>
              Players
            </div>
            {players.slice(midPoint).map((player) => (
              <div key={player.id} className="skirmish-player-card">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    src={player.avatar_url || '/StephAvatar.png'}
                    alt={player.name}
                    className="skirmish-avatar"
                  />
                  <div style={{ flex: 1, marginLeft: '10px' }}>
                    <div style={{ fontWeight: '600' }}>{player.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            Add Game Results
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="skirmish-panel">
      <div className="skirmish-title">
        SKIRMISH - Cycle {currentGame.cycle_number || 1} Game {currentGame.game_number}
      </div>
      <div className="skirmish-sections">
        <div className="skirmish-divider"></div>
        <div className="skirmish-section skirmish-section-left">
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#4CAF50' }}>
            Winners
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
          ) : winners.length > 0 ? (
            winners.map((outcome) => {
              const player = players.find(p => p.id === outcome.player_id);
              return (
                <div key={outcome.id} className="skirmish-player-card">
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <img
                      src={player?.avatar_url || '/StephAvatar.png'}
                      alt={player?.name || 'Unknown'}
                      className="skirmish-avatar"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{player?.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span className="skirmish-badge badge-yellow">{outcome.score}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>Victory Points</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No winners yet
            </div>
          )}
        </div>
        <div className="skirmish-section skirmish-section-right">
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#F44336' }}>
            Others
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
          ) : losers.length > 0 ? (
            losers.map((outcome) => {
              const player = players.find(p => p.id === outcome.player_id);
              return (
                <div key={outcome.id} className="skirmish-player-card">
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <img
                      src={player?.avatar_url || '/StephAvatar.png'}
                      alt={player?.name || 'Unknown'}
                      className="skirmish-avatar"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600' }}>{player?.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <span className="skirmish-badge badge-yellow">{outcome.score}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>Victory Points</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Click to add results
            </div>
          )}
        </div>
      </div>
      {currentGame.status === 'pending' && !showAddForm && (
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            Add Game Results
          </button>
        </div>
      )}
    </div>
  );
}

export default SkirmishPanel;
