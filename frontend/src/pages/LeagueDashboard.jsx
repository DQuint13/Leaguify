import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLeague, getPlayers, getGames, getLeagueStatistics, startNewCycle } from '../services/api';
import PlayerColumn from '../components/PlayerColumn';
import CycleTracker from '../components/CycleTracker';
import EditPlayers from '../components/EditPlayers';

function LeagueDashboard() {
  const { id } = useParams();
  const [league, setLeague] = useState(null);
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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

  const handleStartNewCycle = async () => {
    if (!window.confirm('Start a new cycle? All current games must be completed. Statistics will be preserved.')) {
      return;
    }

    try {
      await startNewCycle(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start new cycle');
    }
  };

  // Get current cycle number and check if all games are completed
  const getCurrentCycleInfo = () => {
    if (games.length === 0) return { cycleNumber: 1, allCompleted: false };
    
    const maxCycle = Math.max(...games.map(g => g.cycle_number || 1));
    const currentCycleGames = games.filter(g => (g.cycle_number || 1) === maxCycle);
    const allCompleted = currentCycleGames.length > 0 && currentCycleGames.every(g => g.status === 'completed');
    
    return { cycleNumber: maxCycle, allCompleted };
  };

  const cycleInfo = getCurrentCycleInfo();


  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedPlayer(null);
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
    <div style={{ padding: '20px', minHeight: '100vh', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header with cycle info and new cycle button */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        {cycleInfo.allCompleted && (
          <div style={{ marginBottom: '15px' }}>
            <button
              className="btn btn-success"
              onClick={handleStartNewCycle}
              style={{ fontSize: '18px', padding: '12px 24px' }}
            >
              🎮 Start New Cycle
            </button>
            <p style={{ marginTop: '10px', color: '#8B4513', fontSize: '14px' }}>
              Cycle {cycleInfo.cycleNumber} Complete! Start a new cycle to continue.
            </p>
          </div>
        )}
      </div>

      {/* Main Game Panel */}
      <div className="game-panel">
        <div className="league-name-handwritten">{league.name}</div>
        <div className="player-columns-container">
          {players.map((player) => (
            <PlayerColumn
              key={player.id}
              player={player}
              statistics={statistics}
              onPlayerClick={() => handlePlayerClick(player)}
            />
          ))}
        </div>
      </div>

      {/* Cycle Tracker */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <CycleTracker games={games} numGames={league.num_games} />
      </div>

      {/* Edit Player Modal */}
      {showEditModal && selectedPlayer && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <EditPlayers
              players={players}
              leagueId={id}
              onUpdate={() => {
                loadData();
                handleCloseModal();
              }}
              onCancel={handleCloseModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LeagueDashboard;
