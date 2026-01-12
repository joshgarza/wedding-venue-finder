#!/usr/bin/env node
import process from "node:process";
import fs from "node:fs";
import path from "node:path";

type BBox = { west: number; south: number; east: number; north: number };

export function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

export function parseBBox(raw: string): BBox {
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid --bbox. Expected "west,south,east,north" as numbers.`);
  }
  const [west, south, east, north] = parts;
  if (!(west < east) || !(south < north)) {
    throw new Error(`Invalid --bbox. Must satisfy west < east and south < north.`);
  }
  return { west, south, east, north };
}

export function overpassQuery(b: BBox) {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`; // S,W,N,E
  return `
[out:json][timeout:60];
(
  node["amenity"="events_venue"](${bbox});
  way["amenity"="events_venue"](${bbox});
  relation["amenity"="events_venue"](${bbox});
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
    close: () => stream.end(),
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
          // Good practice for public Overpass instances
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
