import React from 'react';

function StatisticsView({ statistics, players }) {
  if (!statistics || statistics.length === 0) {
    return <div className="loading">No statistics available yet. Play some games first!</div>;
  }

  // Sort by wins (descending), then by win rate
  const sortedStats = [...statistics].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winRate - a.winRate;
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderVictoryStickers = (wins) => {
    if (wins === 0) return null;
    const stickers = [];
    // Use different stickers based on number of wins
    for (let i = 0; i < Math.min(wins, 10); i++) {
      stickers.push('⭐');
    }
    if (wins > 10) {
      return <span>{'⭐'.repeat(10)} +{wins - 10}</span>;
    }
    return <span>{stickers.join('')}</span>;
  };

  return (
    <div>
      <h3>League Statistics & Rankings</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Victories</th>
            <th>Losses</th>
            <th>Win Rate</th>
            <th>Victory Points</th>
            <th>Points Against</th>
            <th>Point Differential</th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.map((stat, index) => (
            <tr key={stat.id}>
              <td>
                <strong>#{index + 1}</strong>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {stat.avatar_url ? (
                      <img
                        src={stat.avatar_url}
                        alt={stat.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        {getInitials(stat.name)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600' }}>{stat.name}</div>
                    {renderVictoryStickers(stat.wins)}
                  </div>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>{stat.wins}</span>
                  {stat.wins > 0 && <span>🏆</span>}
                </div>
              </td>
              <td>{stat.losses}</td>
              <td>{stat.winRate}%</td>
              <td><strong>{stat.totalPointsScored}</strong></td>
              <td>{stat.totalPointsAgainst}</td>
              <td>
                {stat.totalPointsScored - stat.totalPointsAgainst > 0 ? '+' : ''}
                {stat.totalPointsScored - stat.totalPointsAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="stats-grid" style={{ marginTop: '30px' }}>
        <div className="stat-card">
          <h3>Total Games Played</h3>
          <div className="value">
            {statistics.reduce((sum, stat) => sum + stat.totalGames, 0) / statistics.length}
          </div>
        </div>
        <div className="stat-card">
          <h3>Average Win Rate</h3>
          <div className="value">
            {(
              statistics.reduce((sum, stat) => sum + stat.winRate, 0) / statistics.length
            ).toFixed(1)}%
          </div>
        </div>
        <div className="stat-card">
          <h3>Total Points Scored</h3>
          <div className="value">
            {statistics.reduce((sum, stat) => sum + stat.totalPointsScored, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatisticsView;
