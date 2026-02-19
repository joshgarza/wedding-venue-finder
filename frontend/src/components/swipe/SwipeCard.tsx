import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';
import { useSwipeable } from 'react-swipeable';

interface SwipeCardProps {
  imageUrl: string;
  images?: string[];
  name: string;
  subtitle?: string;
  badges?: { label: string; color: string; bg: string }[];
  onSwipe: (dir: 'left' | 'right') => void;
  preventSwipe?: string[];
}

const ImageCarousel: React.FC<{ images: string[] }> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlers = useSwipeable({
    onSwipedLeft: () => setActiveIndex((i) => Math.min(i + 1, images.length - 1)),
    onSwipedRight: () => setActiveIndex((i) => Math.max(i - 1, 0)),
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${images[activeIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-image 0.2s ease',
        }}
      />
      {/* Dot indicators */}
      <div
        style={{
          position: 'absolute',
          bottom: 72,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          zIndex: 3,
        }}
      >
        {images.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: i === activeIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
              transition: 'background-color 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const SwipeCard: React.FC<SwipeCardProps> = ({
  imageUrl,
  images,
  name,
  subtitle,
  badges,
  onSwipe,
  preventSwipe = [],
}) => {
  const handleSwipe = (direction: string) => {
    if (direction === 'left' || direction === 'right') {
      onSwipe(direction);
    }
  };

  const hasCarousel = images && images.length > 1;

  return (
    <TinderCard
      onSwipe={handleSwipe}
      preventSwipe={preventSwipe}
      flickOnSwipe
    >
      <div
        style={{
          width: 300,
          height: 420,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
          ...(!hasCarousel
            ? {
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}),
          backgroundColor: '#e5e7eb',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          userSelect: 'none',
        }}
      >
        {hasCarousel && <ImageCarousel images={images} />}

        {/* LIKE label */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 16,
            transform: 'rotate(-12deg)',
            border: '3px solid #22c55e',
            borderRadius: 8,
            padding: '4px 12px',
            color: '#22c55e',
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 2,
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          LIKE
        </div>

        {/* SKIP label */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 16,
            transform: 'rotate(12deg)',
            border: '3px solid #ef4444',
            borderRadius: 8,
            padding: '4px 12px',
            color: '#ef4444',
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 2,
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          SKIP
        </div>

        {/* Bottom overlay with gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background:
              'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 60%, transparent 100%)',
            padding: '48px 16px 16px',
            zIndex: 1,
          }}
        >
          {/* Badges */}
          {badges && badges.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              {badges.map((badge, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: badge.color,
                    backgroundColor: badge.bg,
                    padding: '2px 8px',
                    borderRadius: 12,
                  }}
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Venue name */}
          <div
            style={{
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {name}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </TinderCard>
  );
};

export { SwipeCard };
