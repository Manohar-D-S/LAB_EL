import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import VideoAnalysis from './components/VideoAnalysis';
import TrafficSimulation from './components/TrafficSimulation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analysis" element={<VideoAnalysis />} />
          <Route path="/simulation" element={<TrafficSimulation />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;