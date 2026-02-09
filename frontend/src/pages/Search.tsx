import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from '../components/SearchFilters';
import { SortDropdown } from '../components/SortDropdown';
import { VenueGrid } from '../components/VenueGrid';
import { useVenueSearch } from '../hooks/useVenueSearch';
import type { SearchFilters as SearchFiltersType, ApiVenue, SortOption } from '../types';

const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [savedVenueIds, setSavedVenueIds] = useState<Set<number>>(new Set());
  const [selectedVenue, setSelectedVenue] = useState<ApiVenue | null>(null);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFiltersType>(() => {
    const initialFilters: SearchFiltersType = {
      sort: (searchParams.get('sort') as SortOption) || 'taste_score',
      limit: 20,
      offset: 0,
    };

    // Parse pricing_tier (can be multiple)
    const pricingTiers = searchParams.getAll('pricing_tier');
    if (pricingTiers.length > 0) {
      initialFilters.pricing_tier = pricingTiers as any;
    }

    // Parse boolean filters
    const hasLodging = searchParams.get('has_lodging');
    if (hasLodging !== null) {
      initialFilters.has_lodging = hasLodging === 'true';
    }

    const isEstate = searchParams.get('is_estate');
    if (isEstate !== null) {
      initialFilters.is_estate = isEstate === 'true';
    }

    const isHistoric = searchParams.get('is_historic');
    if (isHistoric !== null) {
      initialFilters.is_historic = isHistoric === 'true';
    }

    // Parse numeric filters
    const lodgingCapacityMin = searchParams.get('lodging_capacity_min');
    if (lodgingCapacityMin !== null) {
      initialFilters.lodging_capacity_min = parseInt(lodgingCapacityMin, 10);
    }

    // Parse location filters
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radiusMeters = searchParams.get('radius_meters');
    if (lat && lng && radiusMeters) {
      initialFilters.lat = parseFloat(lat);
      initialFilters.lng = parseFloat(lng);
      initialFilters.radius_meters = parseInt(radiusMeters, 10);
    }

    // Parse pagination
    const offset = searchParams.get('offset');
    if (offset !== null) {
      initialFilters.offset = parseInt(offset, 10);
    }

    return initialFilters;
  });

  // Load saved venues from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedVenueIds');
      if (saved) {
        setSavedVenueIds(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading saved venues:', error);
    }
  }, []);

  // Save to localStorage when savedVenueIds changes
  useEffect(() => {
    localStorage.setItem('savedVenueIds', JSON.stringify(Array.from(savedVenueIds)));
  }, [savedVenueIds]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.pricing_tier && filters.pricing_tier.length > 0) {
      filters.pricing_tier.forEach((tier) => params.append('pricing_tier', tier));
    }

    if (filters.has_lodging !== undefined) {
      params.set('has_lodging', String(filters.has_lodging));
    }

    if (filters.is_estate !== undefined) {
      params.set('is_estate', String(filters.is_estate));
    }

    if (filters.is_historic !== undefined) {
      params.set('is_historic', String(filters.is_historic));
    }

    if (filters.lodging_capacity_min !== undefined) {
      params.set('lodging_capacity_min', String(filters.lodging_capacity_min));
    }

    if (filters.lat !== undefined && filters.lng !== undefined && filters.radius_meters !== undefined) {
      params.set('lat', String(filters.lat));
      params.set('lng', String(filters.lng));
      params.set('radius_meters', String(filters.radius_meters));
    }

    if (filters.sort) {
      params.set('sort', filters.sort);
    }

    if (filters.offset !== undefined && filters.offset > 0) {
      params.set('offset', String(filters.offset));
    }

    setSearchParams(params);
  }, [filters, setSearchParams]);

  const { venues, totalCount, page, loading, error } = useVenueSearch(filters);

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters({ ...newFilters, offset: 0 }); // Reset to first page
  };

  const handleSortChange = (sort: SortOption) => {
    setFilters({ ...filters, sort, offset: 0 });
  };

  const handleSaveToggle = (venueId: number) => {
    setSavedVenueIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(venueId)) {
        newSet.delete(venueId);
      } else {
        newSet.add(venueId);
      }
      return newSet;
    });
  };

  const handleNextPage = () => {
    const newOffset = (filters.offset || 0) + (filters.limit || 20);
    setFilters({ ...filters, offset: newOffset });
  };

  const handlePrevPage = () => {
    const newOffset = Math.max(0, (filters.offset || 0) - (filters.limit || 20));
    setFilters({ ...filters, offset: newOffset });
  };

  const totalPages = Math.ceil(totalCount / (filters.limit || 20));
  const hasLocation = filters.lat !== undefined && filters.lng !== undefined;

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
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Wedding Venues</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setShowMobileFilters(true)}
              style={{
                display: 'none',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
              }}
              className="mobile-filter-button"
            >
              Filters
            </button>
            <a
              href="/shortlist"
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: 'white',
                textDecoration: 'none',
                color: '#111827',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Shortlist ({savedVenueIds.size})
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: 20,
          }}
          className="search-layout"
        >
          {/* Filters Sidebar */}
          <div className="filters-sidebar">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Results */}
          <div>
            {/* Sort and Count */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                {loading ? 'Loading...' : `${totalCount} venues found`}
              </div>
              <SortDropdown
                value={filters.sort || 'taste_score'}
                onChange={handleSortChange}
                hasLocation={hasLocation}
              />
            </div>

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

            {/* Venue Grid */}
            <VenueGrid
              venues={venues}
              loading={loading}
              onVenueClick={(venue) => setSelectedVenue(venue)}
              onSaveToggle={handleSaveToggle}
              savedVenueIds={savedVenueIds}
            />

            {/* Pagination */}
            {!loading && venues.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <button
                  onClick={handlePrevPage}
                  disabled={(filters.offset || 0) === 0}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: (filters.offset || 0) === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: (filters.offset || 0) === 0 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  Page {page} of {totalPages}
                </div>
                <button
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: page >= totalPages ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <SearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClose={() => setShowMobileFilters(false)}
          isMobile
        />
      )}

      {/* Simple Venue Detail Modal */}
      {selectedVenue && (
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
          onClick={() => setSelectedVenue(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{selectedVenue.name}</h2>
              <button
                onClick={() => setSelectedVenue(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ×
              </button>
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
              {selectedVenue.lat.toFixed(4)}, {selectedVenue.lng.toFixed(4)}
            </div>
            {selectedVenue.website_url && (
              <a
                href={selectedVenue.website_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 14, color: '#2563eb', display: 'inline-block', marginBottom: 16 }}
              >
                Visit website →
              </a>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ padding: '6px 12px', background: '#f3f4f6', borderRadius: 8, fontSize: 13 }}>
                {selectedVenue.pricing_tier}
              </span>
              {selectedVenue.has_lodging && (
                <span style={{ padding: '6px 12px', background: '#dbeafe', borderRadius: 8, fontSize: 13 }}>
                  Lodging: {selectedVenue.lodging_capacity}
                </span>
              )}
              {selectedVenue.is_estate && (
                <span style={{ padding: '6px 12px', background: '#d1fae5', borderRadius: 8, fontSize: 13 }}>
                  Estate
                </span>
              )}
              {selectedVenue.is_historic && (
                <span style={{ padding: '6px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
                  Historic
                </span>
              )}
            </div>
            <button
              onClick={() => {
                handleSaveToggle(selectedVenue.venue_id);
                setSelectedVenue(null);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #111827',
                background: savedVenueIds.has(selectedVenue.venue_id) ? '#fef2f2' : '#111827',
                color: savedVenueIds.has(selectedVenue.venue_id) ? '#991b1b' : 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {savedVenueIds.has(selectedVenue.venue_id) ? 'Remove from Shortlist' : 'Add to Shortlist'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .search-layout {
            grid-template-columns: 1fr !important;
          }
          .filters-sidebar {
            display: none;
          }
          .mobile-filter-button {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Search;
