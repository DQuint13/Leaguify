import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateLeague from './pages/CreateLeague';
import LeagueDashboard from './pages/LeagueDashboard';
import GameOutcomes from './pages/GameOutcomes';
import LeaguesManagement from './pages/LeaguesManagement';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="container" style={{ maxWidth: '100%', padding: '20px' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateLeague />} />
            <Route path="/leagues" element={<LeaguesManagement />} />
            <Route path="/league/:id" element={<LeagueDashboard />} />
            <Route path="/league/:id/games" element={<GameOutcomes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
