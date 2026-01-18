import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateLeague from './pages/CreateLeague';
import LeagueDashboard from './pages/LeagueDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="header">
          <h1>Leaguify - League Statistics Tracker</h1>
        </div>
        <div className="container">
          <Routes>
            <Route path="/" element={<CreateLeague />} />
            <Route path="/league/:id" element={<LeagueDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
