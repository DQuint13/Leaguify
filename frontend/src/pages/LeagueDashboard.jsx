import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLeague, getPlayers, getGames, getLeagueStatistics } from '../services/api';
import GameList from '../components/GameList';
import StatisticsView from '../components/StatisticsView';

function LeagueDashboard() {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('games');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leagueData, playersData, gamesData, statsData] = await Promise.all([
        getLeague(id),
        getPlayers(id),
        getGames(id),
        getLeagueStatistics(id),
      ]);
      setLeague(leagueData);
      setPlayers(playersData);
      setGames(gamesData);
      setStatistics(statsData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load league data');
    } finally {
      setLoading(false);
    }
  };

  const handleOutcomeAdded = () => {
    loadData();
  };

  if (loading) {
    return <div className="loading">Loading league data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!league) {
    return <div className="error">League not found</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>{league.name}</h2>
        <p>
          <strong>Players:</strong> {league.num_players} | <strong>Games:</strong>{' '}
          {league.num_games}
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            className={`btn ${activeTab === 'games' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('games')}
          >
            Games
          </button>
          <button
            className={`btn ${activeTab === 'statistics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('statistics')}
          >
            Statistics
          </button>
        </div>

        {activeTab === 'games' && (
          <GameList
            games={games}
            players={players}
            leagueId={id}
            onOutcomeAdded={handleOutcomeAdded}
          />
        )}

        {activeTab === 'statistics' && <StatisticsView statistics={statistics} />}
      </div>
    </div>
  );
}

export default LeagueDashboard;
