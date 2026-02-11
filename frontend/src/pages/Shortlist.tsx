import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortlist } from '../hooks/useShortlist';
import { VenueGrid } from '../components/VenueGrid';
import { localPathToImageUrl } from '../utils/image-url';
import type { ApiVenue, VenueWithSwipe } from '../types';

type SortKey = 'date_saved' | 'pricing_tier' | 'name';

const PRICING_ORDER: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  luxury: 4,
};

function sortVenues(venues: VenueWithSwipe[], sortKey: SortKey): VenueWithSwipe[] {
  const sorted = [...venues];
  switch (sortKey) {
    case 'date_saved':
      return sorted.sort((a, b) => {
        const dateA = a.swipe_timestamp ? new Date(a.swipe_timestamp).getTime() : 0;
        const dateB = b.swipe_timestamp ? new Date(b.swipe_timestamp).getTime() : 0;
        return dateB - dateA; // newest first
      });
    case 'pricing_tier':
      return sorted.sort((a, b) => {
        const tierA = PRICING_ORDER[a.pricing_tier || ''] || 99;
        const tierB = PRICING_ORDER[b.pricing_tier || ''] || 99;
        return tierA - tierB;
      });
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

const Shortlist: React.FC = () => {
  const navigate = useNavigate();
  const { venues, loading, error, unsave } = useShortlist();
  const [sortKey, setSortKey] = useState<SortKey>('date_saved');

  const sortedVenues = useMemo(() => sortVenues(venues, sortKey), [venues, sortKey]);

  const gridVenues: ApiVenue[] = sortedVenues.map((v) => ({
    venue_id: Number(v.venue_id) || 0,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    website_url: v.website_url,
    pricing_tier: v.pricing_tier,
    has_lodging: v.has_lodging,
    lodging_capacity: v.lodging_capacity,
    is_estate: v.is_estate,
    is_historic: v.is_historic,
    taste_score: v.taste_score,
    thumbnail: v.image_data?.local_paths?.[0]
      ? localPathToImageUrl(v.image_data.local_paths[0])
      : null,
  }));

  const savedVenueIds = useMemo(
    () => new Set(gridVenues.map((v) => v.venue_id)),
    [gridVenues]
  );

  const handleVenueClick = (venue: ApiVenue) => {
    navigate(`/venues/${venue.venue_id}`);
  };

  const handleSaveToggle = (venueId: number) => {
    unsave(String(venueId));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Saved Venues</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label
              htmlFor="sort-select"
              style={{ fontSize: 14, color: '#6b7280' }}
            >
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: 'white',
                fontSize: 14,
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              <option value="date_saved">Date saved</option>
              <option value="pricing_tier">Pricing tier</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
        {/* Error */}
        {error && (
          <div
            style={{
              padding: 16,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              marginBottom: 16,
              color: '#991b1b',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <VenueGrid
            venues={[]}
            loading={true}
            onVenueClick={handleVenueClick}
            onSaveToggle={handleSaveToggle}
            savedVenueIds={savedVenueIds}
          />
        )}

        {/* Empty state */}
        {!loading && venues.length === 0 && !error && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
              No saved venues yet
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
              Start exploring venues to build your shortlist.
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/swipe')}
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
                Start Swiping
              </button>
              <button
                onClick={() => navigate('/search')}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'white',
                  color: '#2563eb',
                  border: '1px solid #2563eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Search Venues
              </button>
            </div>
          </div>
        )}

        {/* Venue grid */}
        {!loading && venues.length > 0 && (
          <VenueGrid
            venues={gridVenues}
            loading={false}
            onVenueClick={handleVenueClick}
            onSaveToggle={handleSaveToggle}
            savedVenueIds={savedVenueIds}
          />
        )}
      </div>
    </div>
  );
};

export default Shortlist;
