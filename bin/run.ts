#!/usr/bin/env node
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { getArg, parseBBox, overpassQuery, createWriter, sleep, postOverpass } from "../utils";

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

