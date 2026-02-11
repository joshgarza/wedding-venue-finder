import React from 'react';
import { Link } from 'react-router-dom';
import { useSwipeDeck } from '../hooks/useSwipeDeck';
import { SwipeCardStack } from '../components/swipe/SwipeCardStack';

const Swipe: React.FC = () => {
  const { currentVenue, nextVenue, swipe, loading, isEmpty } = useSwipeDeck();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 72px)',
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 32,
      }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 20,
          marginTop: 0,
          color: '#111827',
        }}
      >
        Discover Venues
      </h1>

      {loading && (
        <p style={{ color: '#6b7280', fontSize: 16 }}>Loading venues...</p>
      )}

      {!loading && isEmpty && (
        <div
          style={{
            textAlign: 'center',
            marginTop: 60,
            color: '#6b7280',
          }}
        >
          <p style={{ fontSize: 18, marginBottom: 16 }}>
            You've seen all the venues!
          </p>
          <Link
            to="/search"
            style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Browse all venues &rarr;
          </Link>
        </div>
      )}

      {!loading && !isEmpty && currentVenue && (
        <>
          <SwipeCardStack
            currentVenue={currentVenue}
            nextVenue={nextVenue}
            onSwipe={swipe}
          />

          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 24,
              justifyContent: 'center',
            }}
          >
            {/* Skip button */}
            <button
              onClick={() => swipe('left')}
              style={{
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 24,
                border: '2px solid #d1d5db',
                background: 'white',
                color: '#374151',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>&larr;</span> Skip
            </button>

            {/* Like button */}
            <button
              onClick={() => swipe('right')}
              style={{
                height: 48,
                paddingLeft: 24,
                paddingRight: 24,
                borderRadius: 24,
                border: 'none',
                background: '#2563eb',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>&hearts;</span> Like
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Swipe;
