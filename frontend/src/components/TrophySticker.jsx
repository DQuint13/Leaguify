import React from 'react';

function TrophySticker({ type, icon, count, trophyImageUrl }) {
  const isCycle = type === 'cycle';
  const stickerClass = [
    isCycle ? 'trophy-sticker' : 'star-sticker',
    count === 5 ? 'sticker-5x' : '',
  ].filter(Boolean).join(' ');
  const showTrophyImage = isCycle && trophyImageUrl;

  return (
    <div className={stickerClass}>
      {showTrophyImage ? (
        <img src={trophyImageUrl} alt="Trophy" className="sticker-trophy-img" />
      ) : (
        <div className="sticker-icon">{icon}</div>
      )}
      {count === 5 ? (
        <div className="sticker-5x-label">5×</div>
      ) : count > 1 ? (
        <div className="sticker-count">{count}</div>
      ) : null}
    </div>
  );
}

export default TrophySticker;
