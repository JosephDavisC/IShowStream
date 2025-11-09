import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StreamerSetup.css';

function StreamerSetup() {
  const [channel, setChannel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateTwitchChannel, userConfig } = useAuth();
  const navigate = useNavigate();

  // Pre-fill if already configured
  React.useEffect(() => {
    if (userConfig?.twitchChannel) {
      setChannel(userConfig.twitchChannel);
    }
  }, [userConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!channel.trim()) {
      setError('Please enter a Twitch channel name');
      return;
    }

    // Validate channel name (no spaces, lowercase)
    const cleanChannel = channel.trim().toLowerCase().replace(/\s+/g, '');
    
    if (!cleanChannel) {
      setError('Invalid channel name');
      return;
    }

    setLoading(true);
    const result = await updateTwitchChannel(cleanChannel);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to update channel');
    } else {
      // Redirect to dashboard after successful update
      navigate('/dashboard');
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <h1>Welcome to IShowStream</h1>
          <p>Enter the Twitch channel you want to analyze</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="channel">Twitch Channel</label>
            <div className="input-wrapper">
              <span className="input-prefix">twitch.tv/</span>
              <input
                id="channel"
                type="text"
                placeholder="channelname"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                required
                disabled={loading}
                pattern="[a-zA-Z0-9_]+"
                title="Channel name can only contain letters, numbers, and underscores"
              />
            </div>
            <small className="form-hint">Enter the channel name without spaces or special characters</small>
          </div>

          <div className="setup-form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Continue'}
            </button>
            <a 
              href="https://www.twitch.tv" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-twitch"
            >
              <span className="twitch-icon">🎮</span>
              Open Twitch
            </a>
          </div>
        </form>

        {userConfig?.twitchChannel && (
          <div className="current-channel">
            <span>Current channel: <strong>@{userConfig.twitchChannel}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StreamerSetup;

