import React from 'react';
import PlayerCard from './PlayerCard';
import TrophySticker from './TrophySticker';

function PlayerColumn({ player, statistics, onPlayerClick }) {
  const playerStats = statistics.find(stat => stat.id === player.id);
  const cycleWins = playerStats?.cycleWins || 0;
  const gameWins = playerStats?.gameWins || 0;
  const currentCyclePoints = playerStats?.currentCyclePoints || 0;

  // Group wins by 5: fullFives tokens with count=5, then one token for remainder
  const cycleFullFives = Math.floor(cycleWins / 5);
  const cycleRemainder = cycleWins % 5;
  const cycleStickers = [
    ...Array.from({ length: cycleFullFives }, (_, i) => (
      <TrophySticker key={`cycle-5-${i}`} type="cycle" icon="🏆" count={5} trophyImageUrl={player.cycle_trophy_url || undefined} />
    )),
    ...(cycleRemainder > 0 ? [<TrophySticker key="cycle-rem" type="cycle" icon="🏆" count={cycleRemainder} trophyImageUrl={player.cycle_trophy_url || undefined} />] : []),
  ];

  const gameFullFives = Math.floor(gameWins / 5);
  const gameRemainder = gameWins % 5;
  const gameStickers = [
    ...Array.from({ length: gameFullFives }, (_, i) => (
      <TrophySticker key={`game-5-${i}`} type="game" icon="⭐" count={5} />
    )),
    ...(gameRemainder > 0 ? [<TrophySticker key="game-rem" type="game" icon="⭐" count={gameRemainder} />] : []),
  ];

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
              </div>
            </div>
          )}
          {gameWins > 0 && (
            <div className="sticker-group">
              <div className="sticker-group-label">Game Wins</div>
              <div className="sticker-grid">
                {gameStickers}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerColumn;
