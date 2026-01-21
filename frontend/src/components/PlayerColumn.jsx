import React from 'react';
import PlayerCard from './PlayerCard';
import TrophySticker from './TrophySticker';

function PlayerColumn({ player, statistics, onPlayerClick }) {
  const playerStats = statistics.find(stat => stat.id === player.id);
  const cycleWins = playerStats?.cycleWins || 0;
  const gameWins = playerStats?.gameWins || 0;
  const currentCyclePoints = playerStats?.currentCyclePoints || 0;

  // Create arrays of stickers (one per win, up to a reasonable display limit)
  const maxDisplayStickers = 10; // Display up to 10 individual stickers
  const cycleStickers = Array.from({ length: Math.min(cycleWins, maxDisplayStickers) }, (_, i) => (
    <TrophySticker key={`cycle-${i}`} type="cycle" icon="🏆" count={cycleWins > maxDisplayStickers && i === maxDisplayStickers - 1 ? cycleWins : 1} />
  ));
  
  const gameStickers = Array.from({ length: Math.min(gameWins, maxDisplayStickers) }, (_, i) => (
    <TrophySticker key={`game-${i}`} type="game" icon="⭐" count={gameWins > maxDisplayStickers && i === maxDisplayStickers - 1 ? gameWins : 1} />
  ));

  return (
    <div className="player-column">
      <PlayerCard
        player={player}
        victories={cycleWins}
        currentCyclePoints={currentCyclePoints}
        onClick={onPlayerClick}
      />
      {(cycleWins > 0 || gameWins > 0) && (
        <div className="sticker-container">
          {cycleWins > 0 && (
            <div className="sticker-group">
              <div className="sticker-group-label">Cycle Wins</div>
              <div className="sticker-grid">
                {cycleStickers}
                {cycleWins > maxDisplayStickers && (
                  <div className="sticker-more">+{cycleWins - maxDisplayStickers}</div>
                )}
              </div>
            </div>
          )}
          {gameWins > 0 && (
            <div className="sticker-group">
              <div className="sticker-group-label">Game Wins</div>
              <div className="sticker-grid">
                {gameStickers}
                {gameWins > maxDisplayStickers && (
                  <div className="sticker-more">+{gameWins - maxDisplayStickers}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerColumn;
