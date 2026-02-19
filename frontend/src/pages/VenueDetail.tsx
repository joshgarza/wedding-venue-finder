import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVenueDetail } from '../hooks/useVenueDetail';
import { ImageGallery } from '../components/ImageGallery';
import { VenueMap } from '../components/VenueMap';
import apiClient from '../utils/api-client';
import { toFullImageUrl } from '../utils/image-url';
import type { ApiVenue } from '../types';
import axios from 'axios';

const VenueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { venue, loading, error, isSaved, setIsSaved } = useVenueDetail(id || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [markdownExpanded, setMarkdownExpanded] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [relatedVenues, setRelatedVenues] = useState<ApiVenue[]>([]);

  // Fetch related venues
  useEffect(() => {
    if (!venue) return;
    let cancelled = false;

    apiClient
      .get('/venues', { params: { sort: 'taste_score', limit: 5 } })
      .then((res) => {
        if (cancelled) return;
        const venues: ApiVenue[] = res.data?.venues || res.data?.data?.venues || [];
        const filtered = venues
          .filter((v) => String(v.venue_id) !== String(venue.venue_id))
          .slice(0, 4);
        setRelatedVenues(filtered);
      })
      .catch(() => {
        // Silently fail — related venues are not critical
      });

    return () => {
      cancelled = true;
    };
  }, [venue]);

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 2000);
  };

  const handleSave = async () => {
    if (!venue || saveLoading) return;
    setSaveLoading(true);

    try {
      if (isSaved) {
        await apiClient.post('/swipes', { venueId: venue.venue_id, action: 'unsave' });
        setIsSaved(false);
        showFeedback('Removed from shortlist', 'success');
      } else {
        await apiClient.post('/swipes', { venueId: venue.venue_id, action: 'right' });
        setIsSaved(true);
        showFeedback('Added to shortlist', 'success');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        // Already swiped - treat as saved
        setIsSaved(true);
        showFeedback('Already in shortlist', 'success');
      } else {
        showFeedback('Failed to update shortlist', 'error');
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const getPricingTierLabel = (tier: string | null | undefined) => {
    if (!tier) return null;
    const labels: Record<string, string> = {
      low: '$',
      medium: '$$',
      high: '$$$',
      luxury: '$$$$',
    };
    return labels[tier] || tier;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', padding: 20 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: '#2563eb',
              padding: 0,
              marginBottom: 16,
            }}
          >
            &larr; Back
          </button>
          <div
            style={{
              padding: 16,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              color: '#991b1b',
            }}
          >
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!venue) return null;

  const pricingLabel = getPricingTierLabel(venue.pricing_tier);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            color: '#2563eb',
            padding: 0,
            marginBottom: 16,
            display: 'block',
          }}
        >
          &larr; Back
        </button>

        {/* Image gallery */}
        <ImageGallery images={venue.images} />

        {/* Venue name */}
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '20px 0 8px 0', color: '#111827' }}>
          {venue.name}
        </h1>

        {/* Website link */}
        {venue.website_url && (
          <a
            href={venue.website_url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 14,
              color: '#2563eb',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: 16,
            }}
          >
            Visit website &rarr;
          </a>
        )}

        {/* Badge row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {pricingLabel && (
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
              {pricingLabel}
            </span>
          )}
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
              Lodging ({venue.lodging_capacity})
            </span>
          )}
          {venue.taste_score !== undefined && venue.taste_score !== null && (
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 6,
                background: venue.taste_score >= 0.8 ? '#d1fae5' : venue.taste_score >= 0.6 ? '#fef3c7' : '#f3f4f6',
                color: venue.taste_score >= 0.8 ? '#065f46' : venue.taste_score >= 0.6 ? '#92400e' : '#374151',
                fontWeight: 600,
              }}
            >
              {Math.round(venue.taste_score * 100)}% Match
            </span>
          )}
        </div>

        {/* Save/Unsave button */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: isSaved ? '1px solid #dc2626' : '1px solid #111827',
              background: isSaved ? '#fef2f2' : '#111827',
              color: isSaved ? '#991b1b' : 'white',
              cursor: saveLoading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              opacity: saveLoading ? 0.7 : 1,
            }}
          >
            {saveLoading
              ? 'Saving...'
              : isSaved
                ? 'Remove from Shortlist'
                : 'Add to Shortlist'}
          </button>

          {/* Feedback message */}
          {feedbackMessage && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 8,
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'center',
                background: feedbackMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: feedbackMessage.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${feedbackMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {feedbackMessage.text}
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ marginBottom: 24 }}>
          <VenueMap
            name={venue.name}
            lat={venue.lat}
            lng={venue.lng}
            width="100%"
            height={400}
            zoom={14}
          />
        </div>

        {/* Similar Venues */}
        {relatedVenues.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: '#111827' }}>
              Similar Venues
            </h2>
            <div
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                paddingBottom: 8,
              }}
            >
              {relatedVenues.map((rv) => (
                <Link
                  key={rv.venue_id}
                  to={`/venues/${rv.venue_id}`}
                  style={{ textDecoration: 'none', flexShrink: 0, width: 160 }}
                >
                  <div
                    style={{
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    {rv.thumbnail ? (
                      <img
                        src={toFullImageUrl(rv.thumbnail)}
                        alt={rv.name}
                        style={{
                          width: '100%',
                          height: 100,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: 100,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                      />
                    )}
                    <div style={{ padding: 10 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {rv.name}
                      </div>
                      {rv.taste_score != null && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                          {Math.round(rv.taste_score * 100)}% match
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Raw markdown (collapsible) */}
        {venue.raw_markdown && (
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'white',
              marginBottom: 24,
            }}
          >
            <button
              onClick={() => setMarkdownExpanded(!markdownExpanded)}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 16,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              <span>Website Content</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                {markdownExpanded ? 'Collapse' : 'Expand'}
              </span>
            </button>
            {markdownExpanded && (
              <div style={{ padding: '0 20px 20px 20px' }}>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 13,
                    color: '#374151',
                    lineHeight: 1.6,
                    margin: 0,
                    maxHeight: 500,
                    overflow: 'auto',
                  }}
                >
                  {venue.raw_markdown}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueDetail;
