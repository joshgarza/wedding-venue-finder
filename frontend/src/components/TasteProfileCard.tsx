import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TasteProfile } from '../types';
import { HowItWorksModal } from './HowItWorksModal';

interface TasteProfileCardProps {
  profile: TasteProfile | null;
  loading: boolean;
}

export const TasteProfileCard: React.FC<TasteProfileCardProps> = ({ profile, loading }) => {
  const navigate = useNavigate();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
        }}
      >
        {/* Skeleton heading */}
        <div
          style={{
            height: 22,
            width: 120,
            background: '#f3f4f6',
            borderRadius: 4,
            marginBottom: 16,
          }}
        />
        {/* Skeleton pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 34,
                width: 80 + i * 10,
                background: '#f3f4f6',
                borderRadius: 20,
              }}
            />
          ))}
        </div>
        {/* Skeleton bar */}
        <div
          style={{
            height: 8,
            background: '#f3f4f6',
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 14,
            width: 100,
            background: '#f3f4f6',
            borderRadius: 4,
          }}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: '#374151' }}>
          No taste profile yet
        </h3>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
          Swipe through venues to build your personalized taste profile.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Build Your Profile
        </button>
      </div>
    );
  }

  const confidencePercent = Math.round(profile.confidence * 100);

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
        Your Taste
      </h3>

      {/* Descriptive word pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {profile.descriptiveWords.slice(0, 5).map((word) => (
          <span
            key={word}
            style={{
              background: '#2563eb',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {word}
          </span>
        ))}
      </div>

      {/* Confidence bar */}
      <div
        style={{
          width: '100%',
          height: 8,
          background: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: `${confidencePercent}%`,
            height: '100%',
            background: profile.confidence < 0.5 ? '#f59e0b' : '#10b981',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          {confidencePercent}% confidence
        </span>
        <button
          onClick={() => setShowHowItWorks(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#2563eb',
            padding: 0,
          }}
        >
          How does this work?
        </button>
      </div>

      {/* Refine button */}
      <button
        onClick={() => navigate('/onboarding?refine=true')}
        style={{
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          background: 'transparent',
          color: '#2563eb',
          border: '1px solid #2563eb',
          borderRadius: 8,
          cursor: 'pointer',
          marginTop: 0,
        }}
      >
        Refine Profile
      </button>

      <HowItWorksModal open={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  );
};
