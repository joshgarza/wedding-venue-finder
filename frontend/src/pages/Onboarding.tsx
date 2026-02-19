import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { SwipeCard } from '../components/swipe/SwipeCard';
import { ProgressDots } from '../components/swipe/ProgressDots';
import { localPathToImageUrl } from '../utils/image-url';

const spinnerKeyframes = `
@keyframes onboarding-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const {
    phase,
    venues,
    currentIndex,
    totalCount,
    swipe,
    profile,
    error,
    swipeError,
    dismissSwipeError,
    retry,
    isRefine,
  } = useOnboarding();

  const handleComplete = async () => {
    try {
      await refreshUser();
    } catch {
      // /auth/me may not exist — continue anyway
    }
    if (isRefine) {
      navigate('/profile');
    } else {
      navigate('/swipe');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: 24,
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 24,
        }}
      >
        {isRefine ? 'Refine Your Taste' : 'Find Your Style'}
      </h1>

      {/* Loading Phase */}
      {phase === 'loading' && (
        <p style={{ color: '#6b7280', fontSize: 16 }}>Loading venues...</p>
      )}

      {/* Swiping Phase */}
      {phase === 'swiping' && currentIndex < totalCount && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <ProgressDots current={currentIndex} total={totalCount} />

          {/* Swipe error banner */}
          {swipeError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                padding: '8px 12px',
                maxWidth: 300,
                width: '100%',
              }}
            >
              <span style={{ color: '#ef4444', fontSize: 14, flex: 1 }}>
                {swipeError}
              </span>
              <button
                onClick={dismissSwipeError}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>
          )}

          <div
            style={{
              position: 'relative',
              width: 300,
              height: 420,
            }}
          >
            <SwipeCard
              imageUrl={localPathToImageUrl(venues[currentIndex].imagePath)}
              name={venues[currentIndex].name}
              onSwipe={swipe}
            />
          </div>

          {/* Button controls for non-touch users */}
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => swipe('left')}
              style={{
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 24,
                border: '2px solid #ef4444',
                backgroundColor: '#ffffff',
                color: '#ef4444',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={() => swipe('right')}
              style={{
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 24,
                border: '2px solid #22c55e',
                backgroundColor: '#ffffff',
                color: '#22c55e',
                cursor: 'pointer',
              }}
            >
              Like
            </button>
          </div>

          {/* Skip Onboarding */}
          <button
            onClick={() => navigate('/swipe')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: 4,
            }}
          >
            Skip onboarding
          </button>
        </div>
      )}

      {/* Generating Phase */}
      {phase === 'generating' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <style>{spinnerKeyframes}</style>
          <div
            style={{
              width: 40,
              height: 40,
              border: '4px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'onboarding-spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: 16 }}>
            Analyzing your taste...
          </p>
        </div>
      )}

      {/* Complete Phase */}
      {phase === 'complete' && profile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#111827',
              margin: 0,
            }}
          >
            Your Taste Profile
          </h2>

          {/* Descriptive word pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'center',
              maxWidth: 360,
            }}
          >
            {profile.descriptiveWords.map((word) => (
              <span
                key={word}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Confidence */}
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            Confidence: {Math.round(profile.confidence * 100)}%
          </p>

          {/* Completion button */}
          <button
            onClick={handleComplete}
            style={{
              padding: '12px 32px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 24,
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            {isRefine ? 'Back to Profile' : 'Start Swiping'}
          </button>
        </div>
      )}

      {/* Error Phase */}
      {phase === 'error' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <p style={{ color: '#ef4444', fontSize: 16 }}>
            {error || 'Something went wrong'}
          </p>
          <button
            onClick={retry}
            style={{
              padding: '10px 24px',
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 24,
              border: '2px solid #2563eb',
              backgroundColor: '#ffffff',
              color: '#2563eb',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          <button
            onClick={handleComplete}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Continue without profile
          </button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
