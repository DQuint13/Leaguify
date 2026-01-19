import React from 'react';
import PlayerCard from './PlayerCard';
import StatCard from './StatCard';

function PlayerColumn({ player, statistics, onPlayerClick }) {
  const playerStats = statistics.find(stat => stat.id === player.id);
  const cycleWins = playerStats?.cycleWins || 0;
  const gameWins = playerStats?.gameWins || 0;
  const currentCyclePoints = playerStats?.currentCyclePoints || 0;

  // Create trophy display strings
  const cycleTrophies = cycleWins > 0 ? '🏆'.repeat(Math.min(cycleWins, 5)) : ''; // Max 5 trophies displayed
  const gameTrophies = gameWins > 0 ? '⭐'.repeat(Math.min(gameWins, 5)) : ''; // Max 5 trophies displayed

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <PlayerCard
        player={player}
        victories={cycleWins}
        currentCyclePoints={currentCyclePoints}
        onClick={onPlayerClick}
      />
      <div className="stat-cards-container">
        <StatCard
          icon={cycleTrophies || '🏆'}
          value={cycleWins}
          label="Cycle Wins"
          color="#FFD700"
        />
        <StatCard
          icon={gameTrophies || '⭐'}
          value={gameWins}
          label="Game Wins"
          color="#FF8C42"
        />
      </div>
    </div>
  );
}

export default PlayerColumn;
