import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

function Profile() {
  const { user, userConfig, updateTwitchChannel } = useAuth();
  const [channel, setChannel] = useState(userConfig?.twitchChannel || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (userConfig?.twitchChannel) {
      setChannel(userConfig.twitchChannel);
    }
  }, [userConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanChannel = channel.trim().toLowerCase();
    if (!cleanChannel) {
      setError('Channel name is required');
      setLoading(false);
      return;
    }

    const result = await updateTwitchChannel(cleanChannel);
    setLoading(false);

    if (result.success) {
      setSuccess('Channel updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to update channel');
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">Profile Settings</h1>

        <div className="profile-section">
          <h2 className="section-header">Account Information</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>Email</label>
              <div className="info-value">{user?.email || 'N/A'}</div>
            </div>
            <div className="info-item">
              <label>Display Name</label>
              <div className="info-value">{user?.displayName || user?.email?.split('@')[0] || 'N/A'}</div>
            </div>
            {user?.photoURL && (
              <div className="info-item">
                <label>Profile Picture</label>
                <div className="info-value">
                  <img src={user.photoURL} alt="Profile" className="profile-picture" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h2 className="section-header">Stream Settings</h2>
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="channel">Twitch Channel</label>
              <div className="input-group">
                <span className="input-prefix">twitch.tv/</span>
                <input
                  type="text"
                  id="channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="your-channel-name"
                  className="form-input"
                  disabled={loading}
                />
              </div>
              <p className="form-help">
                Enter the Twitch channel name you want to analyze (without the URL)
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button 
              type="submit" 
              className="btn-save"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;

