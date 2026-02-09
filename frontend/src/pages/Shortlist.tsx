import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Shortlist: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Shortlist</h1>
      <p>User: {user?.email}</p>
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        Saved venues will appear here...
      </p>
    </div>
  );
};

export default Shortlist;
