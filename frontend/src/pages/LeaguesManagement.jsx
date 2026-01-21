import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllLeagues } from '../services/api';

function LeaguesManagement() {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      setError('');
      const leaguesData = await getAllLeagues();
      setLeagues(leaguesData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueClick = (leagueId) => {
    navigate(`/league/${leagueId}/games`);
  };

  if (loading) {
    return <div className="loading">Loading leagues...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error">{error}</div>
        <button className="btn btn-primary" onClick={loadLeagues} style={{ marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: '20px', fontFamily: "'Caveat', cursive", fontSize: '2rem', color: '#8B4513' }}>
          Manage Games
        </h2>
        {leagues.length === 0 ? (
          <div>
            <p style={{ marginBottom: '20px', color: '#7f8c8d' }}>
              No leagues yet. Create your first league!
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/create')}
            >
              Create League
            </button>
          </div>
        ) : (
          <div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {leagues.map((league) => (
                <li key={league.id} style={{ marginBottom: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleLeagueClick(league.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '15px',
                      fontSize: '16px',
                    }}
                  >
                    {league.name}
                  </button>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/create')}
              >
                Create New League
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaguesManagement;
