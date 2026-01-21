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

  // Default avatar for all players
  const DEFAULT_AVATAR = '/StephAvatar.png';
  const avatarUrl = player.avatar_url || DEFAULT_AVATAR;

  return (
    <div className="player-card" onClick={onClick}>
      <div className="player-avatar-container">
        <div className="player-avatar-glow"></div>
        <img
          src={avatarUrl}
          alt={player.name}
          className="player-avatar"
        />
      </div>
      <div className="player-name-banner-container">
        <div className="player-name-banner">{player.name}</div>
        {currentCyclePoints !== undefined && currentCyclePoints > 0 && (
          <div className="cycle-points-badge">{currentCyclePoints}</div>
        )}
      </div>
    </div>
  );
}

export default PlayerCard;
