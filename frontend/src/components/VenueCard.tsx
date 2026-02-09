// src/components/VenueCard.tsx
import type { Venue } from "../types";
import { VenueMap } from "./VenueMap";
import { PhotoStrip } from "./PhotoStrip";

type Props = {
  venue: Venue;
  onNext?: () => void;
  onSave?: () => void;
  onSkip?: () => void;
};

export function VenueCard({ venue, onNext, onSave, onSkip }: Props) {
  const mapsLink = `https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=16/${venue.lat}/${venue.lng}`;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
          background: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              {venue.name}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {venue.city ? (
                <span style={{ fontSize: 14, color: "#374151" }}>{venue.city}</span>
              ) : null}
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 14, color: "#2563eb", textDecoration: "none" }}
              >
                Open map
              </a>
              {venue.website ? (
                <a
                  href={venue.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 14, color: "#2563eb", textDecoration: "none" }}
                >
                  Website
                </a>
              ) : null}
            </div>

            {venue.tags?.length ? (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {venue.tags.slice(0, 8).map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      color: "#374151",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
            {onSkip ? (
              <button
                onClick={onSkip}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
            ) : null}
            {onSave ? (
              <button
                onClick={onSave}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            ) : null}
            {onNext ? (
              <button
                onClick={onNext}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Next
              </button>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <PhotoStrip photos={venue.photos ?? []} />
        </div>

        <div style={{ marginTop: 14 }}>
          <VenueMap name={venue.name} lat={venue.lat} lng={venue.lng} />
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          {venue.id} · {venue.lat.toFixed(5)}, {venue.lng.toFixed(5)}
        </div>
      </div>
    </div>
  );
}

