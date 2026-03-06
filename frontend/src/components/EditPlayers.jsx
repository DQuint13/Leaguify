import React, { useState, useEffect } from 'react';
import { updatePlayers } from '../services/api';

const AVAILABLE_AVATARS = [
  '/StephAvatar.png',
  '/DannyAvatar.png',
  '/DianaAvatar.png',
  '/MarioAvatar.png',
];

const AVAILABLE_CYCLE_TROPHIES = [
  { id: 'default', label: 'Default', url: null },
  { id: 'dragon', label: 'Dragon', url: '/dragonWomp.png' },
  { id: 'glukgluk', label: 'Gluk Gluk', url: '/glukgluk.png' },
  { id: 'blickycat', label: 'Blicky Cat', url: '/BlickyCat.png' },
  { id: 'dianaworm', label: 'Diana Worm', url: '/dianaWorm.png' },
];

function EditPlayers({ players, leagueId, onUpdate, onCancel }) {
  const [editedPlayers, setEditedPlayers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize with current player names, avatars, and cycle trophy
    setEditedPlayers(
      players.map((player) => ({
        id: player.id,
        name: player.name,
        avatar_url: player.avatar_url || '/StephAvatar.png',
        cycle_trophy_url: player.cycle_trophy_url ?? null,
      }))
    );
  }, [players]);

  const handleNameChange = (playerId, newName) => {
    setEditedPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, name: newName } : player
      )
    );
  };

  const handleAvatarChange = (playerId, avatarUrl) => {
    setEditedPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, avatar_url: avatarUrl } : player
      )
    );
  };

  const handleCycleTrophyChange = (playerId, cycleTrophyUrl) => {
    setEditedPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, cycle_trophy_url: cycleTrophyUrl } : player
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all names are filled
    const emptyNames = editedPlayers.filter(
      (player) => !player.name || player.name.trim().length === 0
    );
    if (emptyNames.length > 0) {
      setError('All player names must be filled in');
      return;
    }

    setLoading(true);

    try {
      await updatePlayers(
        leagueId,
        editedPlayers.map((player) => ({
          id: player.id,
          name: player.name.trim(),
          avatar_url: player.avatar_url,
          cycle_trophy_url: player.cycle_trophy_url,
        }))
      );
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update player names');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return editedPlayers.every(
      (player) => player.name && player.name.trim().length > 0
    );
  };

  return (
    <div className="card">
      <h3>Edit Players</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        {editedPlayers.map((player, index) => (
          <div key={player.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 auto' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                  Avatar
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {AVAILABLE_AVATARS.map((avatar) => (
                    <div
                      key={avatar}
                      onClick={() => handleAvatarChange(player.id, avatar)}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: player.avatar_url === avatar ? '3px solid #3498db' : '2px solid #ddd',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: '#A8C5D9',
                      }}
                      onMouseEnter={(e) => {
                        if (player.avatar_url !== avatar) {
                          e.currentTarget.style.borderColor = '#3498db';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (player.avatar_url !== avatar) {
                          e.currentTarget.style.borderColor = '#ddd';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      <img
                        src={avatar}
                        alt={`Avatar ${avatar}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                  Cycle Trophy
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {AVAILABLE_CYCLE_TROPHIES.map((trophy) => {
                    const isSelected = (player.cycle_trophy_url ?? null) === trophy.url;
                    return (
                      <div
                        key={trophy.id}
                        onClick={() => handleCycleTrophyChange(player.id, trophy.url)}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: isSelected ? '3px solid #3498db' : '2px solid #ddd',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: isSelected ? '#e8f4fc' : '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#3498db';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#ddd';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        {trophy.url ? (
                          <img
                            src={trophy.url}
                            alt={trophy.label}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '28px' }}>🏆</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="form-group">
                  <label htmlFor={`player-${player.id}`}>
                    Player {index + 1} Name
                  </label>
                  <input
                    type="text"
                    id={`player-${player.id}`}
                    value={player.name}
                    onChange={(e) => handleNameChange(player.id, e.target.value)}
                    placeholder="Enter player name"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            type="submit"
            className="btn btn-success"
            disabled={loading || !isFormValid()}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default EditPlayers;
