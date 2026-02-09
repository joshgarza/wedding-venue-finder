// src/components/PhotoStrip.tsx

type Props = {
  photos?: (string | null | undefined)[];
  max?: number;
};

export function PhotoStrip({ photos = [], max = 6 }: Props) {
  const urls = photos.filter(Boolean).slice(0, max) as string[];

  if (urls.length === 0) {
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 14, color: "#6b7280" }}>No photos available</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {urls.map((src, i) => (
        <a
          key={`${src}-${i}`}
          href={src}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: "0 0 auto",
            width: 160,
            height: 110,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            display: "block",
          }}
          title="Open image"
        >
          <img
            src={src}
            alt={`Venue photo ${i + 1}`}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </a>
      ))}
    </div>
  );
}

