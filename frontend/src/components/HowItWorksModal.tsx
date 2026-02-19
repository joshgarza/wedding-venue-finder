import React from 'react';

interface HowItWorksModalProps {
  open: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          maxWidth: 480,
          width: '100%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>
            How Your Taste Profile Works
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            &times;
          </button>
        </div>

        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 16px 0' }}>
          Your taste profile is built from the venues you swipe on during onboarding. Here's how it works:
        </p>

        <ul style={{ margin: '0 0 20px 0', paddingLeft: 20, listStyle: 'none' }}>
          {[
            { icon: '👀', text: 'Your swipes tell us which visual styles and venue aesthetics you prefer' },
            { icon: '🔍', text: 'We identify patterns across your liked venues — architecture, setting, vibe' },
            { icon: '📊', text: 'Each venue gets a match score based on similarity to your preferences' },
            { icon: '🔄', text: 'The more you swipe, the higher your confidence score and the better your recommendations' },
          ].map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: 12,
                display: 'flex',
                gap: 10,
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          style={{
            width: '100%',
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
          Got it
        </button>
      </div>
    </div>
  );
};
