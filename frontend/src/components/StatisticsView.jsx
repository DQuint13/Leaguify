import React from 'react';

function StatisticsView({ statistics }) {
  if (!statistics || statistics.length === 0) {
    return <div className="loading">No statistics available yet. Play some games first!</div>;
  }

  // Sort by wins (descending), then by win rate
  const sortedStats = [...statistics].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winRate - a.winRate;
  });

  return (
    <div>
      <h3>League Statistics & Rankings</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate</th>
            <th>Points Scored</th>
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
              <td>{stat.name}</td>
              <td>{stat.wins}</td>
              <td>{stat.losses}</td>
              <td>{stat.winRate}%</td>
              <td>{stat.totalPointsScored}</td>
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
