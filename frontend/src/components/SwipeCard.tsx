import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { ApiVenue } from '../types';
import '../styles/swipe.css';

interface SwipeCardProps {
  venue: ApiVenue;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onCardClick: () => void;
  zIndex: number;
  isTop: boolean;
}

/**
 * Gesture-based swipeable venue card
 * Supports touch and mouse drag interactions
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({
  venue,
  onSwipeLeft,
  onSwipeRight,
  onCardClick,
  zIndex,
  isTop,
}) => {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const SWIPE_THRESHOLD = 100; // pixels
  const ROTATION_INTENSITY = 0.1; // rotation factor

  const handleDragStart = () => {
    if (!isTop) return;

    // Prevent click from triggering on drag
    setIsDragging(true);
  };

  const handleDragMove = (deltaX: number, deltaY: number) => {
    if (!isTop || !isDragging) return;

    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleDragEnd = () => {
    if (!isTop) return;

    setIsDragging(false);

    // Determine if swipe threshold was met
    if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD) {
      if (dragOffset.x > 0) {
        // Swipe right
        setExitDirection('right');
        setTimeout(() => {
          onSwipeRight();
          resetCard();
        }, 300);
      } else {
        // Swipe left
        setExitDirection('left');
        setTimeout(() => {
          onSwipeLeft();
          resetCard();
        }, 300);
      }
    } else {
      // Snap back to center
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const resetCard = () => {
    setDragOffset({ x: 0, y: 0 });
    setExitDirection(null);
    setIsDragging(false);
  };

  // Swipeable config for touch gestures
  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!isTop) return;
      handleDragMove(eventData.deltaX, eventData.deltaY);
    },
    onSwiped: () => {
      handleDragEnd();
    },
    trackMouse: true,
    trackTouch: true,
  });

  // Calculate rotation based on drag offset
  const rotation = dragOffset.x * ROTATION_INTENSITY;

  // Determine overlay opacity
  const overlayOpacity = Math.min(Math.abs(dragOffset.x) / SWIPE_THRESHOLD, 1);

  // Card transform
  const transform = exitDirection
    ? `translateX(${exitDirection === 'right' ? '150vw' : '-150vw'}) translateY(${dragOffset.y}px) rotate(${rotation}deg)`
    : `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`;

  const transition = exitDirection || !isDragging ? 'transform 0.3s ease-out' : 'none';

  // Thumbnail or first image
  const thumbnailUrl = venue.thumbnail || null;

  return (
    <div
      {...swipeHandlers}
      className={`swipe-card ${isTop ? 'swipe-card-top' : ''}`}
      style={{
        position: 'absolute',
        width: '100%',
        maxWidth: '500px',
        transform,
        transition,
        zIndex,
        cursor: isTop ? 'grab' : 'default',
        userSelect: 'none',
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Swipe Overlays */}
        {isTop && (
          <>
            {/* Left (Skip) Overlay */}
            <div
              className="swipe-overlay swipe-overlay-left"
              style={{
                opacity: dragOffset.x < 0 ? overlayOpacity : 0,
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: 'white',
                  transform: 'rotate(-20deg)',
                  border: '6px solid white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                }}
              >
                SKIP
              </div>
            </div>

            {/* Right (Save) Overlay */}
            <div
              className="swipe-overlay swipe-overlay-right"
              style={{
                opacity: dragOffset.x > 0 ? overlayOpacity : 0,
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 700,
                  color: 'white',
                  transform: 'rotate(20deg)',
                  border: '6px solid white',
                  padding: '12px 24px',
                  borderRadius: '12px',
                }}
              >
                SAVE
              </div>
            </div>
          </>
        )}

        {/* Venue Image */}
        {thumbnailUrl ? (
          <div
            style={{
              width: '100%',
              height: '400px',
              backgroundColor: '#f3f4f6',
              overflow: 'hidden',
            }}
          >
            <img
              src={thumbnailUrl}
              alt={venue.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              draggable={false}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '400px',
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            }}
          >
            No image available
          </div>
        )}

        {/* Venue Info */}
        <div style={{ padding: '20px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '8px',
              lineHeight: 1.2,
            }}
          >
            {venue.name}
          </h2>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {venue.pricing_tier && venue.pricing_tier !== 'unknown' && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {venue.pricing_tier.charAt(0).toUpperCase() + venue.pricing_tier.slice(1)}
              </span>
            )}
            {venue.is_estate && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Estate
              </span>
            )}
            {venue.is_historic && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Historic
              </span>
            )}
            {venue.has_lodging && (
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#e0e7ff',
                  color: '#3730a3',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Lodging
              </span>
            )}
          </div>

          {/* Click to view details */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging && isTop) {
                onCardClick();
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Tap for details
          </button>
        </div>
      </div>
    </div>
  );
};
