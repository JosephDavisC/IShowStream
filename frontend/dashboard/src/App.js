import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';
import Login from './components/Login';
import StreamerSetup from './components/StreamerSetup';
import Dashboard from './components/Dashboard';

// Protected Route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0e0e10',
        color: '#efeff1'
      }}>
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

// Streamer Setup Route - only accessible if logged in but channel not set
function StreamerSetupRoute({ children }) {
  const { user, userConfig, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0e0e10',
        color: '#efeff1'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If channel is set, redirect to dashboard
  if (userConfig?.twitchChannel) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

// Dashboard Route - only accessible if logged in and channel is set
function DashboardRoute({ children }) {
  const { user, userConfig, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0e0e10',
        color: '#efeff1'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If channel not set, redirect to setup
  if (!userConfig?.twitchChannel) {
    return <Navigate to="/setup" />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/setup"
          element={
            <StreamerSetupRoute>
              <StreamerSetup />
            </StreamerSetupRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <DashboardRoute>
              <Dashboard />
            </DashboardRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;