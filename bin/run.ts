#!/usr/bin/env node
import { getArg, parseBBox, overpassQuery } from "../src/utils/index.js";
import { runPipeline } from "../src/pipeline/runPipeline.js";
import { collectStage } from "../src/pipeline/stage_collect.js";
import { addWebsitesStage } from "../src/pipeline/stage_addWebsites.js";

async function main() {
  // minLon, minLat, maxLon, maxLat
  const bboxRaw = getArg("bbox") ?? "-124.409591,32.534156,-114.131211,42.009518";
  const bbox = parseBBox(bboxRaw);

  const ctx = {
    bboxRaw,
    dataDir: "data",
    publicOut: "frontend/public/venues.ndjson",
    overpass: {
      endpoints: [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
        "https://overpass.osm.jp/api/interpreter",
      ],
      query: overpassQuery(bbox),
    },
  };

  const stages = [
    collectStage,
    addWebsitesStage,
    // photosStage next
  ];

  await runPipeline(ctx, stages);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

