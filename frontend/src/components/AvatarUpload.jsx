import React, { useState } from 'react';

function AvatarUpload({ playerId, currentAvatar, onAvatarChange, leagueId, playerName }) {
  const [preview, setPreview] = useState(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      return;
    }

    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadAvatar(file);
  };

  const uploadAvatar = async (file) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/leagues/${leagueId}/players/${playerId}/avatar`,
        {
          method: 'PUT',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const updatedPlayer = await response.json();
      if (onAvatarChange) {
        onAvatarChange(updatedPlayer);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #ddd',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '20px', color: '#666' }}>
            {getInitials(playerName || 'Player')}
          </span>
        )}
      </div>
      <label
        style={{
          cursor: uploading ? 'not-allowed' : 'pointer',
          padding: '5px 10px',
          backgroundColor: uploading ? '#ccc' : '#3498db',
          color: 'white',
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        {uploading ? 'Uploading...' : 'Change Avatar'}
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && <div style={{ color: '#e74c3c', fontSize: '12px' }}>{error}</div>}
    </div>
  );
}

export default AvatarUpload;
