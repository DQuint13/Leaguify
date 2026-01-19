import React, { useState, useEffect } from 'react';
import { updatePlayers } from '../services/api';
import AvatarUpload from './AvatarUpload';

function EditPlayers({ players, leagueId, onUpdate, onCancel }) {
  const [editedPlayers, setEditedPlayers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize with current player names and avatars
    setEditedPlayers(
      players.map((player) => ({
        id: player.id,
        name: player.name,
        avatar_url: player.avatar_url,
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
      <h3>Edit Player Names</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        {editedPlayers.map((player, index) => (
          <div key={player.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
              <AvatarUpload
                playerId={player.id}
                currentAvatar={player.avatar_url}
                leagueId={leagueId}
                playerName={player.name}
                onAvatarChange={(updatedPlayer) => {
                  setEditedPlayers((prev) =>
                    prev.map((p) =>
                      p.id === updatedPlayer.id
                        ? { ...p, avatar_url: updatedPlayer.avatar_url }
                        : p
                    )
                  );
                  onUpdate();
                }}
              />
              <div className="form-group" style={{ flex: 1 }}>
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
