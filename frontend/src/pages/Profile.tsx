import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Profile</h1>
      <div style={{ marginBottom: '1rem' }}>
        <p><strong>Email:</strong> {user?.email}</p>
        {user?.wedding_date && (
          <p><strong>Wedding Date:</strong> {user.wedding_date}</p>
        )}
      </div>
      <button
        onClick={handleLogout}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Profile;
