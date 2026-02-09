import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Swipe: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Swipe Page</h1>
      <p>User: {user?.email}</p>
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        Swipe interface coming soon...
      </p>
    </div>
  );
};

export default Swipe;
