import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// League APIs
export const createLeague = async (name, numPlayers, numGames) => {
  const response = await api.post('/api/leagues', {
    name,
    numPlayers,
    numGames,
  });
  return response.data;
};

export const getLeague = async (id) => {
  const response = await api.get(`/api/leagues/${id}`);
  return response.data;
};

export const getPlayers = async (leagueId) => {
  const response = await api.get(`/api/leagues/${leagueId}/players`);
  return response.data;
};

export const getGames = async (leagueId) => {
  const response = await api.get(`/api/leagues/${leagueId}/games`);
  return response.data;
};

// Game APIs
export const addGameOutcomes = async (gameId, outcomes) => {
  const response = await api.post(`/api/games/${gameId}/outcomes`, {
    outcomes,
  });
  return response.data;
};

export const getGameOutcomes = async (gameId) => {
  const response = await api.get(`/api/games/${gameId}/outcomes`);
  return response.data;
};

// Statistics APIs
export const getLeagueStatistics = async (leagueId) => {
  const response = await api.get(`/api/statistics/leagues/${leagueId}`);
  return response.data;
};

export default api;
