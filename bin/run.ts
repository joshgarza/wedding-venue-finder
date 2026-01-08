#!/usr/bin/env node
import process from "node:process";
import fs from "node:fs";
import path from "node:path";

type BBox = { west: number; south: number; east: number; north: number };

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parseBBox(raw: string): BBox {
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

function overpassQuery(b: BBox) {
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

function createWriter(outPath?: string) {
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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postOverpass(endpoints: string[], query: string) {
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

async function main() {
  const bboxRaw = getArg("bbox") ?? "-122.55,37.69,-122.35,37.84";
  const bbox = parseBBox(bboxRaw);

  const query = overpassQuery(bbox);

  const outPath = getArg("out"); // e.g. venues.ndjson
  const writer = createWriter(outPath);

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
  ];

  const { endpoint, data } = await postOverpass(endpoints, query);
  const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const lat = typeof el.lat === "number" ? el.lat : el.center?.lat ?? null;
    const lon = typeof el.lon === "number" ? el.lon : el.center?.lon ?? null;

    writer.write(
      JSON.stringify({
        osm: { type: el.type, id: el.id },
        name: tags.name ?? null,
        lat,
        lon,
        website: tags.website ?? tags["contact:website"] ?? null,
        tags,
      }) + "\n"
    );

  }

  process.stderr.write(`Fetched ${elements.length} elements for bbox ${bboxRaw}\n`);
  writer.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

