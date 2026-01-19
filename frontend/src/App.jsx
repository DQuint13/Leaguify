import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateLeague from './pages/CreateLeague';
import LeagueDashboard from './pages/LeagueDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="header" style={{ background: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)', marginBottom: '0' }}>
          <h1 style={{ fontFamily: "'Caveat', cursive", fontSize: '2.5rem' }}>Leaguify</h1>
        </div>
        <div className="container" style={{ maxWidth: '100%', padding: '20px' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreateLeague />} />
            <Route path="/league/:id" element={<LeagueDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
