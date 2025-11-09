import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Profile.css';

function Profile() {
  const { user, userConfig, updateTwitchChannel, signOut } = useAuth();
  const [channel, setChannel] = useState(userConfig?.twitchChannel || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreview, setImagePreview] = useState(user?.photoURL || '');

  useEffect(() => {
    if (userConfig?.twitchChannel) {
      setChannel(userConfig.twitchChannel);
    }
  }, [userConfig]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setImagePreview(user.photoURL || '');
    }
  }, [user]);

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataURL = reader.result;
      setPhotoURL(dataURL);
      setImagePreview(dataURL);
      setError('');
    };
    reader.onerror = () => {
      setError('Error reading image file');
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

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

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null
      });

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
        updatedAt: new Date().toISOString()
      });

      setSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.displayName || '');
    setPhotoURL(user?.photoURL || '');
    setImagePreview(user?.photoURL || '');
    setIsEditingProfile(false);
    setError('');
  };

  // Get provider info (Google, Email, etc.)
  const getAuthProvider = () => {
    if (!user?.providerData || user.providerData.length === 0) return 'Email';
    const provider = user.providerData[0].providerId;
    if (provider === 'google.com') return 'Google';
    if (provider === 'password') return 'Email/Password';
    return provider;
  };

  // Format account creation date
  const getAccountCreated = () => {
    if (!user?.metadata?.creationTime) return 'N/A';
    const date = new Date(user.metadata.creationTime);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format last sign-in
  const getLastSignIn = () => {
    if (!user?.metadata?.lastSignInTime) return 'N/A';
    const date = new Date(user.metadata.lastSignInTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1 className="profile-title">Profile Settings</h1>

        {/* Account Information Section */}
        <div className="profile-section">
          <div className="section-header-row">
            <h2 className="section-header">👤 Account Information</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="btn-edit"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {isEditingProfile ? (
            /* Edit Mode */
            <form onSubmit={handleUpdateProfile} className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="form-input-full"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profilePicture">Profile Picture</label>
                
                {/* Drag and Drop Area */}
                <div
                  className={`image-upload-area ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fileInput').click()}
                >
                  <input
                    type="file"
                    id="fileInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                    disabled={loading}
                  />
                  {imagePreview ? (
                    <div className="image-preview-container">
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="image-preview"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="image-overlay">
                        <span className="upload-icon">📷</span>
                        <span className="upload-text">Click or drag to change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📷</span>
                      <span className="upload-text">Drag & drop an image here or click to browse</span>
                      <span className="upload-hint">Supports JPG, PNG, GIF (max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {error && <div className="alert alert-error">❌ {error}</div>}
              {success && <div className="alert alert-success">✅ {success}</div>}

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-save"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-cancel"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* View Mode */
            <div className="profile-card">
              <div className="profile-header">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="profile-avatar"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="profile-avatar-fallback"
                  style={{ display: user?.photoURL ? 'none' : 'flex' }}
                >
                  {(user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </div>
                <div className="profile-header-info">
                  <h3>{user?.displayName || user?.email?.split('@')[0] || 'User'}</h3>
                  <p className="provider-badge">{getAuthProvider()} Account</p>
                </div>
              </div>

              <div className="profile-info">
              <div className="info-row">
                <div className="info-label">📧 Email</div>
                <div className="info-value">{user?.email || 'N/A'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">👤 Display Name</div>
                <div className="info-value">{user?.displayName || user?.email?.split('@')[0] || 'N/A'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">🔑 User ID</div>
                <div className="info-value code">{user?.uid?.substring(0, 20)}...</div>
              </div>
              <div className="info-row">
                <div className="info-label">📅 Account Created</div>
                <div className="info-value">{getAccountCreated()}</div>
              </div>
              <div className="info-row">
                <div className="info-label">🕒 Last Sign-In</div>
                <div className="info-value">{getLastSignIn()}</div>
              </div>
              <div className="info-row">
                <div className="info-label">✅ Email Verified</div>
                <div className="info-value">
                  {user?.emailVerified ? (
                    <span className="badge badge-success">Verified</span>
                  ) : (
                    <span className="badge badge-warning">Not Verified</span>
                  )}
                </div>
              </div>
            </div>
            </div>
          )}
        </div>

        {/* Stream Settings Section */}
        <div className="profile-section">
          <h2 className="section-header">📺 Stream Settings</h2>
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
                  placeholder="marlon"
                  className="form-input"
                  disabled={loading}
                />
              </div>
              <p className="form-help">
                Enter the Twitch channel name you want to analyze (without the URL)
              </p>
            </div>

            {error && <div className="alert alert-error">❌ {error}</div>}
            {success && <div className="alert alert-success">✅ {success}</div>}

            <div className="form-actions form-actions-horizontal">
              <button
                type="submit"
                className="btn-save"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
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
        </div>

        {/* Danger Zone */}
        <div className="profile-section danger-zone">
          <h2 className="section-header">⚠️ Account Actions</h2>
          <div className="danger-zone-content">
            <div className="danger-item">
              <div className="danger-info">
                <h3>Sign Out</h3>
                <p>Sign out of your IShowStream account</p>
              </div>
              <button onClick={handleSignOut} className="btn-danger">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

