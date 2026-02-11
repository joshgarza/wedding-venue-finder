import React from 'react';

interface ProgressDotsProps {
  current: number;
  total: number;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ current, total }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 300 }}>
      <div
        style={{
          fontSize: 14,
          color: '#6b7280',
          marginBottom: 6,
        }}
      >
        {current} / {total}
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: '#2563eb',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

export { ProgressDots };
