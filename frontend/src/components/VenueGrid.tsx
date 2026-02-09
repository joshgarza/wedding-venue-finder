import type { ApiVenue } from '../types';

interface VenueGridProps {
  venues: ApiVenue[];
  loading: boolean;
  onVenueClick: (venue: ApiVenue) => void;
  onSaveToggle: (venueId: number) => void;
  savedVenueIds: Set<number>;
}

export function VenueGrid({ venues, loading, onVenueClick, onSaveToggle, savedVenueIds }: VenueGridProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <VenueCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 40,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
          No venues found
        </div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          Try adjusting your filters or search criteria
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}
    >
      {venues.map((venue) => (
        <VenueCard
          key={venue.venue_id}
          venue={venue}
          onClick={() => onVenueClick(venue)}
          onSaveToggle={() => onSaveToggle(venue.venue_id)}
          isSaved={savedVenueIds.has(venue.venue_id)}
        />
      ))}
    </div>
  );
}

interface VenueCardProps {
  venue: ApiVenue;
  onClick: () => void;
  onSaveToggle: () => void;
  isSaved: boolean;
}

function VenueCard({ venue, onClick, onSaveToggle, isSaved }: VenueCardProps) {
  const tasteScore = venue.taste_score !== undefined && venue.taste_score !== null ? Math.round(venue.taste_score * 100) : null;

  const getTasteScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#6b7280';
  };

  const getPricingTierLabel = (tier: string | null | undefined) => {
    if (!tier) return '?';
    const labels: Record<string, string> = {
      low: '$',
      medium: '$$',
      high: '$$$',
      luxury: '$$$$',
      unknown: '?',
    };
    return labels[tier] || tier;
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'white',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div
        onClick={onClick}
        style={{
          width: '100%',
          height: 200,
          background: venue.thumbnail
            ? `url(${venue.thumbnail})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Taste Score Badge */}
        {tasteScore !== null && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: getTasteScoreColor(tasteScore),
              color: 'white',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
            title="Based on your taste profile"
          >
            {tasteScore}% Match
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSaveToggle();
          }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            fontSize: 18,
          }}
          title={isSaved ? 'Remove from shortlist' : 'Add to shortlist'}
        >
          {isSaved ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Content */}
      <div onClick={onClick} style={{ padding: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
          {venue.name}
        </div>

        {/* Location */}
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>
          {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
          {venue.distance_meters !== undefined && venue.distance_meters !== null && (
            <span> · {(venue.distance_meters / 1609.34).toFixed(1)} mi</span>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {/* Pricing Tier */}
          <span
            style={{
              fontSize: 12,
              padding: '4px 8px',
              borderRadius: 6,
              background: '#f3f4f6',
              color: '#374151',
              fontWeight: 600,
            }}
          >
            {getPricingTierLabel(venue.pricing_tier)}
          </span>

          {/* Lodging */}
          {venue.has_lodging && (
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 6,
                background: '#dbeafe',
                color: '#1e40af',
              }}
            >
              🛏️ Lodging ({venue.lodging_capacity})
            </span>
          )}

          {/* Estate */}
          {venue.is_estate && (
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 6,
                background: '#d1fae5',
                color: '#065f46',
              }}
            >
              Estate
            </span>
          )}

          {/* Historic */}
          {venue.is_historic && (
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 6,
                background: '#fef3c7',
                color: '#92400e',
              }}
            >
              Historic
            </span>
          )}
        </div>

        {/* Website Link */}
        {venue.website_url && (
          <a
            href={venue.website_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 13,
              color: '#2563eb',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Visit website →
          </a>
        )}
      </div>
    </div>
  );
}

function VenueCardSkeleton() {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'white',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 200,
          background: 'linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <div style={{ padding: 14 }}>
        <div
          style={{
            height: 20,
            background: '#f3f4f6',
            borderRadius: 4,
            marginBottom: 8,
            width: '80%',
          }}
        />
        <div
          style={{
            height: 14,
            background: '#f3f4f6',
            borderRadius: 4,
            marginBottom: 10,
            width: '60%',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ height: 24, width: 40, background: '#f3f4f6', borderRadius: 6 }} />
          <div style={{ height: 24, width: 60, background: '#f3f4f6', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}
