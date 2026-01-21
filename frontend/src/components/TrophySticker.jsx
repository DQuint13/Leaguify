import React from 'react';

function TrophySticker({ type, icon, count }) {
  const isCycle = type === 'cycle';
  const stickerClass = isCycle ? 'trophy-sticker' : 'star-sticker';
  
  return (
    <div className={stickerClass}>
      <div className="sticker-icon">{icon}</div>
      {count > 1 && (
        <div className="sticker-count">{count}</div>
      )}
    </div>
  );
}

export default TrophySticker;
