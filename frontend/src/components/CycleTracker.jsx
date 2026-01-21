import React from 'react';

function CycleTracker({ games, numGames }) {
  // Get current cycle games
  const currentCycle = games.length > 0 
    ? Math.max(...games.map(g => g.cycle_number || 1))
    : 1;
  
  const currentCycleGames = games.filter(g => (g.cycle_number || 1) === currentCycle);
  const completedCount = currentCycleGames.filter(g => g.status === 'completed').length;
  const totalGames = numGames || 4;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px'
    }}>
      {Array.from({ length: totalGames }, (_, i) => {
        const isCompleted = i < completedCount;
        return (
          <span
            key={i}
            style={{
              fontSize: '24px',
              opacity: isCompleted ? 1 : 0.3,
              filter: isCompleted ? 'none' : 'grayscale(100%)',
              transition: 'all 0.3s ease'
            }}
          >
            ♟️
          </span>
        );
      })}
    </div>
  );
}

export default CycleTracker;
