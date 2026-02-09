import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Onboarding: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to Wedding Venue Finder</h1>
      <p>Let's set up your taste profile!</p>
      <p>User: {user?.email}</p>
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        Onboarding flow coming soon...
      </p>
    </div>
  );
};

export default Onboarding;
