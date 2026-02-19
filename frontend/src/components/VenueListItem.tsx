import { localPathToImageUrl } from '../utils/image-url';
import type { VenueWithSwipe } from '../types';

interface VenueListItemProps {
  venue: VenueWithSwipe;
  onUnsave: () => void;
  onClick: () => void;
}

const PRICING_LABELS: Record<string, string> = {
  low: '$',
  medium: '$$',
  high: '$$$',
  luxury: '$$$$',
};

export function VenueListItem({ venue, onUnsave, onClick }: VenueListItemProps) {
  const thumbnail = venue.image_data?.local_paths?.[0]
    ? localPathToImageUrl(venue.image_data.local_paths[0])
    : null;

  const tasteScore =
    venue.taste_score != null ? Math.round(venue.taste_score * 100) : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 6px rgb(0 0 0 / 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 8,
          flexShrink: 0,
          background: thumbnail
            ? `url(${thumbnail}) center / cover no-repeat`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
          {venue.name}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {venue.pricing_tier && (
            <span
              style={{
                fontSize: 12,
                padding: '3px 7px',
                borderRadius: 6,
                background: '#f3f4f6',
                color: '#374151',
                fontWeight: 600,
              }}
            >
              {PRICING_LABELS[venue.pricing_tier] || venue.pricing_tier}
            </span>
          )}
          {venue.is_estate && (
            <span
              style={{
                fontSize: 12,
                padding: '3px 7px',
                borderRadius: 6,
                background: '#d1fae5',
                color: '#065f46',
              }}
            >
              Estate
            </span>
          )}
          {venue.is_historic && (
            <span
              style={{
                fontSize: 12,
                padding: '3px 7px',
                borderRadius: 6,
                background: '#fef3c7',
                color: '#92400e',
              }}
            >
              Historic
            </span>
          )}
          {venue.has_lodging && (
            <span
              style={{
                fontSize: 12,
                padding: '3px 7px',
                borderRadius: 6,
                background: '#dbeafe',
                color: '#1e40af',
              }}
            >
              Lodging
            </span>
          )}
          {tasteScore !== null && (
            <span
              style={{
                fontSize: 12,
                padding: '3px 7px',
                borderRadius: 6,
                background: tasteScore >= 80 ? '#d1fae5' : tasteScore >= 60 ? '#fef3c7' : '#f3f4f6',
                color: tasteScore >= 80 ? '#065f46' : tasteScore >= 60 ? '#92400e' : '#6b7280',
                fontWeight: 600,
              }}
            >
              {tasteScore}% Match
            </span>
          )}
        </div>
      </div>

      {/* Unsave button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnsave();
        }}
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          fontSize: 13,
          color: '#ef4444',
          background: 'none',
          border: '1px solid #fecaca',
          borderRadius: 6,
          cursor: 'pointer',
        }}
        title="Remove from shortlist"
      >
        Remove
      </button>
    </div>
  );
}
