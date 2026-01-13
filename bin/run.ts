#!/usr/bin/env node
import { getArg, parseBBox, overpassQuery, tileBBox } from "../src/utils/index.js";
import { runPipeline } from "../src/pipeline/runPipeline.js";
import { collectStage } from "../src/pipeline/stage_collect.js";
import { addWebsitesStage } from "../src/pipeline/stage_addWebsites.js";
import type { BBox } from "../src/pipeline/stages.ts"; // wherever your BBox type lives

const california: BBox = {
  minLon: -124.409591,
  minLat: 32.534156,
  maxLon: -114.131211,
  maxLat: 42.009518,
};

async function main() {
  // allow override, default to CA
  const bboxRaw =
    getArg("bbox") ??
    `${california.minLon},${california.minLat},${california.maxLon},${california.maxLat}`;

  const bbox = parseBBox(bboxRaw);

  // tiles come from the bbox we’ll crawl
  const tileDeg = Number(getArg("tileDeg") ?? "0.5");
  const tiles = tileBBox(bbox, tileDeg);

  console.log(`Generated ${tiles.length} tiles (tileDeg=${tileDeg})`);

  const ctx = {
    bboxRaw,
    dataDir: "data",
    publicOut: "frontend/public/venues.ndjson",
    tiles, // <-- NEW: pass tiles to collectStage
    overpass: {
      endpoints: [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass.osm.jp/api/interpreter",
      ],
      // <-- NEW: a builder (collectStage will call this per tile)
      queryForBBox: overpassQuery,
      delayMs: 1000,
    },
  };

  const stages = [
    collectStage,
    addWebsitesStage,
  ];

  await runPipeline(ctx, stages);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

