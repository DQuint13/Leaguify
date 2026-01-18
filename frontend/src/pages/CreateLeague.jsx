import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLeague } from '../services/api';

function CreateLeague() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    numPlayers: 2,
    numGames: 1,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const league = await createLeague(
        formData.name,
        parseInt(formData.numPlayers),
        parseInt(formData.numGames)
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

  return (
    <div className="card">
      <h2>Create New League</h2>
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
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create League'}
        </button>
      </form>
    </div>
  );
}

export default CreateLeague;
