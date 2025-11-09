import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Navbar.css';

function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <img src="/logo.svg" alt="StreamSense Logo" className="logo-image" />
            <span className="logo-text">IShowStream</span>
          </Link>
        </div>

        <div className="navbar-center">
          {user && (
            <div className="navbar-links">
              <Link 
                to="/dashboard" 
                className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                to="/history" 
                className={`navbar-link ${isActive('/history') ? 'active' : ''}`}
              >
                History
              </Link>
            </div>
          )}
        </div>

        <div className="navbar-right">
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <div className="navbar-user">
              <button
                className="navbar-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="profile-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} />
                  ) : (
                    <span>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <span className="profile-name">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showProfileMenu && (
                <div className="profile-menu">
                  <Link 
                    to="/profile" 
                    className="profile-menu-item"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="menu-icon">👤</span>
                    Profile
                  </Link>
                  <Link 
                    to="/history" 
                    className="profile-menu-item"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <span className="menu-icon">📜</span>
                    History
                  </Link>
                  <div className="profile-menu-divider"></div>
                  <button 
                    className="profile-menu-item"
                    onClick={handleSignOut}
                  >
                    <span className="menu-icon">🚪</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="navbar-link">
                Sign In
              </Link>
              <Link to="/login" className="btn-nav-primary">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

