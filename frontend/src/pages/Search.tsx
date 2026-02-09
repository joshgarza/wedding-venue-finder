import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Search: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Search Page</h1>
      <p>User: {user?.email}</p>
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        Search interface coming soon...
      </p>
    </div>
  );
};

export default Search;
