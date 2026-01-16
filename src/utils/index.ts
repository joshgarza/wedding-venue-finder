#!/usr/bin/env node
import process from "node:process";
import fs from "node:fs";
import path from "node:path";

type BBox = { 
	minLon: number; 
	minLat: number; 
	maxLon: number; 
	maxLat: number 
};

export function tileBBox(
  bbox: BBox,
  tileSizeDeg: number
): BBox[] {
  const tiles: BBox[] = [];
  if (tileSizeDeg <= 0) {
    throw new Error("tileSizeDeg must be > 0");
  }

  for (
    let lat = bbox.minLat;
    lat < bbox.maxLat;
    lat += tileSizeDeg
  ) {
    const nextLat = Math.min(lat + tileSizeDeg, bbox.maxLat);
    
    for (
      let lon = bbox.minLon;
      lon < bbox.maxLon;
      lon += tileSizeDeg
    ) {
      const nextLon = Math.min(lon + tileSizeDeg, bbox.maxLon);

      tiles.push({
        minLon: lon,
        minLat: lat,
        maxLon: nextLon,
        maxLat: nextLat,
      });
    }
  }
  return tiles;
}

export function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

export function parseBBox(raw: string): BBox {
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid --bbox. Expected "minLon,minLat,maxLon,maxLat" as numbers.`);
  }
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (!(minLon < maxLon) || !(minLat < maxLat)) {
    throw new Error(`Invalid --bbox. Must satisfy minLon < maxLon and minLat < maxLat.`);
  }
  return { minLon, minLat, maxLon, maxLat };
}

export function bboxToOverpass(b: { minLat: number; minLon: number; maxLat: number; maxLon: number }): string {
  // Overpass bbox order is: (south, west, north, east) => (minLat, minLon, maxLat, maxLon)
  return `(${b.minLat},${b.minLon},${b.maxLat},${b.maxLon})`;
}

export function overpassQuery(b: BBox) {
  const bbox = bboxToOverpass(b);

  return `
[out:json][timeout:90];
(
  // 1. Specific Amenities
  node["amenity"~"events_venue|conference_centre|wedding_venue"]${bbox};
  way["amenity"~"events_venue|conference_centre|wedding_venue"]${bbox};
  
  // 2. Resorts (Removed the "booking:wedding" filter to see if we get ANY resorts first)
  node["leisure"="resort"]${bbox};
  way["leisure"="resort"]${bbox};

  // 3. Historic/Luxury types
  node["historic"~"manor|castle|stately_house"]${bbox};
  way["historic"~"manor|castle|stately_house"]${bbox};

  // 4. Name-based search (Search for these names regardless of the 'building' tag)
  node["name"~"Estate|Garden|Ranch|Vineyard|Winery",i]${bbox};
  way["name"~"Estate|Garden|Ranch|Vineyard|Winery",i]${bbox};
);
out body center;
`.trim();
}

export function createWriter(outPath?: string) {
  if (!outPath) {
    return {
      write: (line: string) => process.stdout.write(line),
      close: () => {},
    };
  }

  const fullPath = path.resolve(outPath);
  const stream = fs.createWriteStream(fullPath, { flags: "w" });

  return {
    write: (line: string) => stream.write(line),
    close: async () => {
	stream.end();
	await new Promise<void>((resolve, reject) => {
		stream.on("finish", resolve);
		stream.on("error", reject);
        });
    }
  };
}

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function postOverpass(endpoints: string[], query: string) {
  const body = new URLSearchParams({ data: query }).toString();

  const retryable = (status: number) =>
    status === 429 || status === 502 || status === 503 || status === 504;

  let lastErr: unknown;

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": "wedding-venue-finder/0.1 (personal use)",
        },
        body,
      });

      if (res.ok) return { endpoint, data: await res.json() };

      const text = await res.text().catch(() => "");
      lastErr = new Error(
        `Overpass error ${res.status} from ${endpoint}\n` + text.slice(0, 500)
      );

      if (!retryable(res.status)) break;

      // exponential-ish backoff: 0.5s, 1s, 2s, 4s
      await sleep(500 * Math.pow(2, attempt));
    }
  }

  throw lastErr;
}
