import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasteProfile } from '../hooks/useTasteProfile';
import { TasteProfileCard } from '../components/TasteProfileCard';
import { HowItWorksModal } from '../components/HowItWorksModal';

const TasteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { profile, loading } = useTasteProfile();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>
          Your Taste Profile
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px 0' }}>
          Based on your venue swipes, here's what we know about your style.
        </p>

        <TasteProfileCard profile={profile} loading={loading} />

        {!loading && profile && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px 0', color: '#111827' }}>
                Profile Stats
              </h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                    {profile.descriptiveWords.length}
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Style Tags</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                    {Math.round(profile.confidence * 100)}%
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Confidence</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button
                onClick={() => navigate('/onboarding?refine=true')}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Refine Profile
              </button>
              <button
                onClick={() => setShowHowItWorks(true)}
                style={{
                  padding: '12px 20px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                How it works
              </button>
            </div>
          </div>
        )}

        {!loading && !profile && (
          <div
            style={{
              marginTop: 24,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              You haven't built a taste profile yet. Swipe through some venues to get started!
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Start Onboarding
            </button>
          </div>
        )}

        <HowItWorksModal open={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
      </div>
    </div>
  );
};

export default TasteProfile;
