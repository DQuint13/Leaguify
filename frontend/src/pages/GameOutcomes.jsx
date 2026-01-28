import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLeague, getPlayers, getGames, getGameOutcomes, addGameOutcomes, addGame } from '../services/api';
import AddGameOutcome from '../components/AddGameOutcome';

function GameOutcomes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [gameOutcomes, setGameOutcomes] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingGame, setAddingGame] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leagueData, playersData, gamesData] = await Promise.all([
        getLeague(id),
        getPlayers(id),
        getGames(id),
      ]);
      setLeague(leagueData);
      setPlayers(playersData);
      setGames(gamesData);
      
      // Load outcomes for completed games
      const completedGames = gamesData.filter(g => g.status === 'completed');
      const outcomesPromises = completedGames.map(game => 
        getGameOutcomes(game.id).then(outcomes => ({ gameId: game.id, outcomes }))
      );
      const outcomesResults = await Promise.all(outcomesPromises);
      const outcomesMap = {};
      outcomesResults.forEach(({ gameId, outcomes }) => {
        outcomesMap[gameId] = outcomes;
      });
      setGameOutcomes(outcomesMap);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = async (game) => {
    if (game.status === 'pending') {
      setSelectedGame(game);
    } else {
      // Load outcomes if not already loaded
      if (!gameOutcomes[game.id]) {
        try {
          const outcomes = await getGameOutcomes(game.id);
          setGameOutcomes(prev => ({ ...prev, [game.id]: outcomes }));
        } catch (err) {
          console.error('Error loading game outcomes:', err);
        }
      }
      setSelectedGame(null);
    }
  };

  const handleOutcomeAdded = () => {
    setSelectedGame(null);
    loadData();
  };

  const handleAddGame = async () => {
    try {
      setAddingGame(true);
      setError('');
      await addGame(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add game');
    } finally {
      setAddingGame(false);
    }
  };

  // Group games by cycle
  const gamesByCycle = games.reduce((acc, game) => {
    const cycle = game.cycle_number || 1;
    if (!acc[cycle]) {
      acc[cycle] = [];
    }
    acc[cycle].push(game);
    return acc;
  }, {});

  const sortedCycles = Object.keys(gamesByCycle).sort((a, b) => parseInt(b) - parseInt(a));

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <div className="loading">Loading game data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!league) {
    return <div className="error">League not found</div>;
  }

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="responsive-stack" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: '2.5rem', color: '#8B4513', marginBottom: '5px' }}>
            {league.name}
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Manage Game Outcomes
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {games.length > 0 && (
            <button
              className="btn btn-success"
              onClick={handleAddGame}
              disabled={addingGame}
              style={{ fontSize: '14px', padding: '10px 20px' }}
            >
              {addingGame ? 'Adding...' : '+ Add Game'}
            </button>
          )}
          <Link to={`/league/${id}`} style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary">
              ← Back to Dashboard
            </button>
          </Link>
        </div>
      </div>

      {sortedCycles.map((cycleNum) => {
        const cycleGames = gamesByCycle[cycleNum].sort((a, b) => a.game_number - b.game_number);
        return (
          <div key={cycleNum} className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
              Cycle {cycleNum}
            </h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              {cycleGames.map((game) => {
                const outcomes = gameOutcomes[game.id] || [];
                const isPending = game.status === 'pending';
                const isSelected = selectedGame?.id === game.id;

                return (
                  <div
                    key={game.id}
                    style={{
                      border: '2px solid',
                      borderColor: isPending ? '#f39c12' : '#27ae60',
                      borderRadius: '8px',
                      padding: '15px',
                      background: isPending ? '#fffbf0' : '#f0f9f4',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ margin: 0, color: '#2c3e50' }}>
                          Game {game.game_number}
                        </h3>
                        {game.date_played && (
                          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                            Played: {new Date(game.date_played).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className={`badge badge-${game.status}`} style={{ fontSize: '12px', padding: '5px 10px' }}>
                          {game.status}
                        </span>
                        {!isSelected && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleGameClick(game)}
                            style={{ marginLeft: '10px', fontSize: '14px', padding: '5px 15px' }}
                          >
                            {isPending ? 'Add Results' : 'View Results'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isSelected && isPending && (
                      <div style={{ marginTop: '15px', padding: '15px', background: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
                        <AddGameOutcome
                          game={selectedGame}
                          players={players}
                          onOutcomeAdded={handleOutcomeAdded}
                          onCancel={() => setSelectedGame(null)}
                        />
                      </div>
                    )}

                    {!isPending && outcomes.length > 0 && (
                      <div>
                        <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>Results:</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                          {outcomes
                            .sort((a, b) => b.score - a.score)
                            .map((outcome) => {
                              const player = players.find(p => p.id === outcome.player_id);
                              return (
                                <div
                                  key={outcome.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px',
                                    background: 'white',
                                    borderRadius: '6px',
                                    border: outcome.result === 'win' ? '2px solid #27ae60' : '1px solid #ddd',
                                  }}
                                >
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
                                    <img
                                      src={player?.avatar_url || '/StephAvatar.png'}
                                      alt={player?.name || 'Unknown'}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                      {player?.name || 'Unknown'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      {outcome.result === 'win' ? '🏆 Winner' : 'Loss'}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: outcome.result === 'win' ? '#27ae60' : '#333' }}>
                                    {outcome.score}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {games.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
            No games found. Create your first game to get started!
          </p>
          <button
            className="btn btn-primary"
            onClick={handleAddGame}
            disabled={addingGame}
            style={{ fontSize: '16px', padding: '12px 24px' }}
          >
            {addingGame ? 'Adding Game...' : '+ Add Game'}
          </button>
        </div>
      )}
    </div>
  );
}

export default GameOutcomes;
