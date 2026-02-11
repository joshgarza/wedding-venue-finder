import React from 'react';
import { SwipeCard } from './SwipeCard';
import { toFullImageUrl } from '../../utils/image-url';
import type { ApiVenue, PricingTier } from '../../types';

interface SwipeCardStackProps {
  currentVenue: ApiVenue | null;
  nextVenue: ApiVenue | null;
  onSwipe: (dir: 'left' | 'right') => void;
}

function pricingLabel(tier: PricingTier): string {
  switch (tier) {
    case 'low':
      return '$';
    case 'medium':
      return '$$';
    case 'high':
      return '$$$';
    case 'luxury':
      return '$$$$';
    default:
      return '';
  }
}

function buildBadges(
  venue: ApiVenue
): { label: string; color: string; bg: string }[] {
  const badges: { label: string; color: string; bg: string }[] = [];

  if (venue.pricing_tier) {
    badges.push({
      label: pricingLabel(venue.pricing_tier),
      color: '#374151',
      bg: '#f3f4f6',
    });
  }

  if (venue.is_estate) {
    badges.push({ label: 'Estate', color: '#065f46', bg: '#d1fae5' });
  }

  if (venue.is_historic) {
    badges.push({ label: 'Historic', color: '#92400e', bg: '#fef3c7' });
  }

  if (venue.has_lodging) {
    badges.push({ label: 'Lodging', color: '#1e40af', bg: '#dbeafe' });
  }

  return badges;
}

const SwipeCardStack: React.FC<SwipeCardStackProps> = ({
  currentVenue,
  nextVenue,
  onSwipe,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: 300,
        height: 420,
        margin: '0 auto',
      }}
    >
      {/* Back card (next venue preview) */}
      {nextVenue && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scale(0.95) translateY(10px)',
            zIndex: 0,
          }}
        >
          <SwipeCard
            imageUrl={toFullImageUrl(nextVenue.thumbnail || '')}
            name={nextVenue.name}
            badges={buildBadges(nextVenue)}
            onSwipe={() => {}}
            preventSwipe={['left', 'right', 'up', 'down']}
          />
        </div>
      )}

      {/* Front card (current venue) */}
      {currentVenue && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        >
          <SwipeCard
            imageUrl={toFullImageUrl(currentVenue.thumbnail || '')}
            name={currentVenue.name}
            badges={buildBadges(currentVenue)}
            onSwipe={onSwipe}
          />
        </div>
      )}
    </div>
  );
};

export { SwipeCardStack };
