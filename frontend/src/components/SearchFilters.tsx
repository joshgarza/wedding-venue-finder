import React, { useState } from 'react';
import type { SearchFilters, PricingTier } from '../types';
import { getCurrentLocation, geocodeZipCode, milesToMeters } from '../utils/geocode';

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function SearchFilters({ filters, onFiltersChange, onClose, isMobile }: SearchFiltersProps) {
  const [locationInput, setLocationInput] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handlePricingTierChange = (tier: PricingTier) => {
    const currentTiers = filters.pricing_tier || [];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];

    onFiltersChange({
      ...filters,
      pricing_tier: newTiers.length > 0 ? newTiers : undefined,
    });
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingLocation(true);

    try {
      // Try geocoding the input (zip code or city)
      const coords = await geocodeZipCode(locationInput);
      if (coords) {
        onFiltersChange({
          ...filters,
          lat: coords.lat,
          lng: coords.lng,
          radius_meters: milesToMeters(radiusMiles),
        });
      } else {
        alert('Location not found. Please try a different zip code or city.');
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      alert('Failed to geocode location. Please try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        onFiltersChange({
          ...filters,
          lat: coords.lat,
          lng: coords.lng,
          radius_meters: milesToMeters(radiusMiles),
        });
        setLocationInput('Current location');
      } else {
        alert('Could not get your location. Please enable location access.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleClearLocation = () => {
    onFiltersChange({
      ...filters,
      lat: undefined,
      lng: undefined,
      radius_meters: undefined,
    });
    setLocationInput('');
  };

  const handleClearFilters = () => {
    onFiltersChange({
      sort: filters.sort,
      limit: filters.limit,
      offset: 0,
    });
    setLocationInput('');
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 20,
        height: isMobile ? '100%' : 'fit-content',
        position: isMobile ? 'fixed' : 'sticky',
        top: isMobile ? 0 : 20,
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 50 : 'auto',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Filters</h3>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: 'white',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Close
          </button>
        )}
      </div>

      {/* Pricing Tier */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Pricing Tier
        </label>
        {(['low', 'medium', 'high', 'luxury'] as PricingTier[]).map((tier) => (
          <label
            key={tier}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={filters.pricing_tier?.includes(tier) || false}
              onChange={() => handlePricingTierChange(tier)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{tier}</span>
          </label>
        ))}
      </div>

      {/* Location */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Location
        </label>
        <form onSubmit={handleLocationSubmit} style={{ marginBottom: 8 }}>
          <input
            type="text"
            placeholder="Zip code or city"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            disabled={isLoadingLocation}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 8,
            }}
          />
          <button
            type="submit"
            disabled={isLoadingLocation || !locationInput}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#111827',
              color: 'white',
              cursor: isLoadingLocation || !locationInput ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: isLoadingLocation || !locationInput ? 0.5 : 1,
            }}
          >
            {isLoadingLocation ? 'Loading...' : 'Search Location'}
          </button>
        </form>
        <button
          onClick={handleUseCurrentLocation}
          disabled={isLoadingLocation}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: 'white',
            cursor: isLoadingLocation ? 'not-allowed' : 'pointer',
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Use Current Location
        </button>
        {filters.lat && filters.lng && (
          <button
            onClick={handleClearLocation}
            style={{
              width: '100%',
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fef2f2',
              color: '#991b1b',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Clear Location
          </button>
        )}
      </div>

      {/* Radius Slider */}
      {filters.lat && filters.lng && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Radius: {radiusMiles} miles
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={radiusMiles}
            onChange={(e) => {
              const miles = parseInt(e.target.value, 10);
              setRadiusMiles(miles);
              onFiltersChange({
                ...filters,
                radius_meters: milesToMeters(miles),
              });
            }}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            <span>5 mi</span>
            <span>100 mi</span>
          </div>
        </div>
      )}

      {/* Lodging */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 8,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filters.has_lodging || false}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                has_lodging: e.target.checked || undefined,
              })
            }
            style={{ marginRight: 8 }}
          />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Has Lodging</span>
        </label>
        {filters.has_lodging && (
          <div>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>
              Min Capacity: {filters.lodging_capacity_min || 0}
            </label>
            <input
              type="range"
              min="0"
              max="200"
              step="10"
              value={filters.lodging_capacity_min || 0}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  lodging_capacity_min: parseInt(e.target.value, 10) || undefined,
                })
              }
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              <span>0</span>
              <span>200</span>
            </div>
          </div>
        )}
      </div>

      {/* Estate/Historic */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 6,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filters.is_estate || false}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                is_estate: e.target.checked || undefined,
              })
            }
            style={{ marginRight: 8 }}
          />
          <span style={{ fontSize: 14 }}>Estate Venue</span>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={filters.is_historic || false}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                is_historic: e.target.checked || undefined,
              })
            }
            style={{ marginRight: 8 }}
          />
          <span style={{ fontSize: 14 }}>Historic Venue</span>
        </label>
      </div>

      {/* Clear Filters */}
      <button
        onClick={handleClearFilters}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: 'white',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Clear All Filters
      </button>

      {isMobile && (
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #111827',
            background: '#111827',
            color: 'white',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            marginTop: 12,
          }}
        >
          Apply Filters
        </button>
      )}
    </div>
  );
}
