import React from 'react';

function PlayerCard({ player, victories, currentCyclePoints, onClick }) {
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="player-card" onClick={onClick}>
      <div className="player-avatar-container">
        <div className="player-avatar-glow"></div>
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.name}
            className="player-avatar"
          />
        ) : (
          <div className="player-avatar-initials">
            {getInitials(player.name)}
          </div>
        )}
        {victories > 0 && (
          <div className="victory-badge">{victories}</div>
        )}
        {currentCyclePoints !== undefined && currentCyclePoints > 0 && (
          <div className="cycle-points-overlay">{currentCyclePoints}</div>
        )}
      </div>
      <div className="player-name-banner">{player.name}</div>
    </div>
  );
}

export default PlayerCard;
