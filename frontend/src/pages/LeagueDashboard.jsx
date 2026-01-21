import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLeague, getPlayers, getGames, getLeagueStatistics } from '../services/api';
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
      {/* Main Game Panel */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2px' }}>
          <div className="league-name-handwritten" style={{ margin: 0 }}>{league.name}</div>
          <div className="cycle-tracker-top-right" style={{ position: 'static' }}>
            <CycleTracker games={games} numGames={league.num_games} />
          </div>
        </div>
        <div className="game-panel">
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
