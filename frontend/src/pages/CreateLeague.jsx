import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createLeague } from '../services/api';

function CreateLeague() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    numPlayers: 2,
    numGames: 1,
  });
  const [playerNames, setPlayerNames] = useState(['', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Update playerNames array when numPlayers changes
  useEffect(() => {
    const numPlayers = parseInt(formData.numPlayers) || 2;
    if (numPlayers < 2) return;

    setPlayerNames((prev) => {
      const newNames = [...prev];
      // Add empty strings if numPlayers increased
      while (newNames.length < numPlayers) {
        newNames.push('');
      }
      // Remove excess if numPlayers decreased
      return newNames.slice(0, numPlayers);
    });
  }, [formData.numPlayers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all player names are filled
    const emptyNames = playerNames.filter((name) => !name || name.trim().length === 0);
    if (emptyNames.length > 0) {
      setError('All player names must be filled in');
      return;
    }

    setLoading(true);

    try {
      const league = await createLeague(
        formData.name,
        parseInt(formData.numPlayers),
        parseInt(formData.numGames),
        playerNames.map((name) => name.trim())
      );
      navigate(`/league/${league.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePlayerNameChange = (index, value) => {
    setPlayerNames((prev) => {
      const newNames = [...prev];
      newNames[index] = value;
      return newNames;
    });
  };

  const isFormValid = () => {
    return (
      formData.name.trim() &&
      formData.numPlayers >= 2 &&
      formData.numGames >= 1 &&
      playerNames.every((name) => name && name.trim().length > 0)
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Create New League</h2>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button className="btn btn-secondary">Back to Home</button>
        </Link>
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">League Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter league name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="numPlayers">Number of Players</label>
          <input
            type="number"
            id="numPlayers"
            name="numPlayers"
            value={formData.numPlayers}
            onChange={handleChange}
            min="2"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="numGames">Number of Games</label>
          <input
            type="number"
            id="numGames"
            name="numGames"
            value={formData.numGames}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label>Player Names</label>
          {playerNames.map((name, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                placeholder={`Enter Player ${index + 1} name`}
                required
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !isFormValid()}
        >
          {loading ? 'Creating...' : 'Create League'}
        </button>
      </form>
    </div>
  );
}

export default CreateLeague;
