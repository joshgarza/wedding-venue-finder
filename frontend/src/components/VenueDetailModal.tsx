import { useEffect, useState } from 'react';
import apiClient from '../utils/api-client';
import { ImageCarousel } from './ImageCarousel';
import type { ApiVenue } from '../types';

interface VenueDetailModalProps {
  venueId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface VenueDetail extends ApiVenue {
  images?: string[];
  raw_markdown?: string | null;
}

/**
 * Modal component for displaying full venue details
 */
export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({ venueId, isOpen, onClose }) => {
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && venueId) {
      fetchVenueDetails();
    }
  }, [isOpen, venueId]);

  const fetchVenueDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<VenueDetail>(`/venues/${venueId}`);
      setVenue(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load venue details');
      console.error('Error fetching venue details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            zIndex: 10,
          }}
          aria-label="Close modal"
        >
          ×
        </button>

        {loading && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
            Loading venue details...
          </div>
        )}

        {error && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ color: '#dc2626', marginBottom: '12px' }}>Error</div>
            <div style={{ color: '#6b7280' }}>{error}</div>
          </div>
        )}

        {venue && !loading && !error && (
          <div>
            {/* Image Gallery */}
            {venue.images && venue.images.length > 0 && (
              <div style={{ marginBottom: '0' }}>
                <ImageCarousel images={venue.images} alt={venue.name} />
              </div>
            )}

            {/* Venue Info */}
            <div style={{ padding: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', lineHeight: 1.2 }}>
                {venue.name}
              </h1>

              {/* Metadata Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {venue.pricing_tier && (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    {venue.pricing_tier.charAt(0).toUpperCase() + venue.pricing_tier.slice(1)}
                  </span>
                )}
                {venue.is_estate && (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Estate
                  </span>
                )}
                {venue.is_historic && (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Historic
                  </span>
                )}
                {venue.has_lodging && (
                  <span
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#e0e7ff',
                      color: '#3730a3',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Lodging: {venue.lodging_capacity} guests
                  </span>
                )}
              </div>

              {/* Location */}
              <div style={{ marginBottom: '16px', color: '#6b7280' }}>
                <div style={{ fontSize: '14px' }}>
                  📍 {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
                </div>
                {venue.website_url && (
                  <a
                    href={venue.website_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '14px',
                      color: '#2563eb',
                      textDecoration: 'none',
                      display: 'inline-block',
                      marginTop: '4px',
                    }}
                  >
                    🌐 Visit Website
                  </a>
                )}
              </div>

              {/* Map Link */}
              <div style={{ marginBottom: '16px' }}>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=16/${venue.lat}/${venue.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '10px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#111827',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  View on Map
                </a>
              </div>

              {/* Raw Markdown Content */}
              {venue.raw_markdown && (
                <div>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      marginBottom: '12px',
                      marginTop: '24px',
                    }}
                  >
                    About
                  </h2>
                  <div
                    style={{
                      color: '#374151',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      maxHeight: '300px',
                      overflow: 'auto',
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                    }}
                  >
                    {venue.raw_markdown.substring(0, 1000)}
                    {venue.raw_markdown.length > 1000 && '...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
