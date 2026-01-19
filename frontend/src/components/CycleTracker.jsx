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
      justifyContent: 'center',
      gap: '10px',
      padding: '15px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#666', marginRight: '5px' }}>
        Cycle {currentCycle}:
      </span>
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
      <span style={{ fontSize: '14px', color: '#666', marginLeft: '5px' }}>
        ({completedCount}/{totalGames})
      </span>
    </div>
  );
}

export default CycleTracker;
