// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { VenueCard } from "./components/VenueCard";
import type { Venue } from "./types";

/**
 * Put your NDJSON at: /public/venues.ndjson
 * Then it will be available at: http://localhost:5173/venues.ndjson (Vite)
 */
const VENUES_URL = "/venues.ndjson";

function parseNdjson(text: string): Venue[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const venues: Venue[] = [];

  for (const line of lines) {
    try {
      const r = JSON.parse(line);

      const id =
        r?.id ??
        (r?.osm?.type && r?.osm?.id ? `${r.osm.type}/${r.osm.id}` : crypto.randomUUID());

      const name = r?.name ?? "Unknown venue";
      const lat = Number(r?.lat);
      const lng = Number(r?.lon ?? r?.lng); // your crawler uses `lon`

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const website = r?.website ?? null;

      const city =
        r?.address?.city ??
        r?.tags?.["addr:city"] ??
        null;

      venues.push({
        id,
        name,
        lat,
        lng,
        website,
        city,
        tags: null, // later: derive from tags if you want
        photos: null, // later: enrich
      });
    } catch {
      // ignore bad lines
    }
  }

  return venues;
}

type Decision = "saved" | "skipped";

function loadDecisions(): Record<string, Decision> {
  try {
    const raw = localStorage.getItem("venueDecisions");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveDecisions(d: Record<string, Decision>) {
  localStorage.setItem("venueDecisions", JSON.stringify(d));
}

export default function App() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    loadDecisions()
  );
  const [index, setIndex] = useState(0);

  // Load NDJSON
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(VENUES_URL);
        if (!res.ok) throw new Error(`Failed to fetch ${VENUES_URL}: ${res.status}`);

        const text = await res.text();
        const parsed = parseNdjson(text);

        if (!cancelled) {
          setVenues(parsed);
          setIndex(0);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist decisions
  useEffect(() => {
    saveDecisions(decisions);
  }, [decisions]);

  const remainingVenues = useMemo(() => {
    // filter out already decided
    return venues.filter((v) => !decisions[v.id]);
  }, [venues, decisions]);

  const current = remainingVenues[index] ?? null;

  function next() {
    setIndex((i) => {
      const max = remainingVenues.length - 1;
      if (max < 0) return 0;
      return Math.min(i + 1, max);
    });
  }

  function mark(decision: Decision) {
    if (!current) return;
    setDecisions((d) => ({ ...d, [current.id]: decision }));
    // keep index the same because the list shrinks; next item shifts into place
  }

  const savedCount = Object.values(decisions).filter((d) => d === "saved").length;
  const skippedCount = Object.values(decisions).filter((d) => d === "skipped").length;

  if (loading) {
    return (
      <div style={{ padding: 16, color: "#374151" }}>
        Loading venues…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
        <div style={{ marginTop: 12, color: "#6b7280" }}>
          Make sure <code>public/venues.ndjson</code> exists.
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Done</div>
        <div style={{ marginTop: 8, color: "#374151" }}>
          No more venues left to review.
        </div>
        <div style={{ marginTop: 12, color: "#6b7280" }}>
          Saved: {savedCount} · Skipped: {skippedCount} · Total loaded: {venues.length}
        </div>
        <button
          onClick={() => {
            setDecisions({});
            setIndex(0);
          }}
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
          }}
        >
          Reset decisions
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "14px 16px 0",
          color: "#6b7280",
          fontSize: 13,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          Remaining: {remainingVenues.length} · Saved: {savedCount} · Skipped: {skippedCount}
        </div>
        <button
          onClick={() => {
            setDecisions({});
            setIndex(0);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      <VenueCard
        venue={current}
        onNext={next}
        onSave={() => mark("saved")}
        onSkip={() => mark("skipped")}
      />
    </div>
  );
}

