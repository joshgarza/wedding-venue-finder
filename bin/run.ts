#!/usr/bin/env node
import { db } from "../db/db-config";
import { getArg, parseBBox, overpassQuery, tileBBox } from "../src/utils/index";
import type { BBox } from "../src/pipeline/stages";
import { runPipeline } from "../src/pipeline/runPipeline";
import { collectStage } from "../src/pipeline/stage_1_collect";
import { crawlStage } from "../src/pipeline/stage_2_crawl";
import { imageStage } from "../src/pipeline/stage_3_images";
import { enrichmentStage } from "../src/pipeline/stage_4_enrichment";

const california: BBox = {
	minLon: -124.409591,
	minLat: 32.534156,
	maxLon: -114.131211,
	maxLat: 42.009518,
};

const testSF: BBox = {
  minLon: -122.4100, // West
  minLat: 37.7850,   // South
  maxLon: -122.3950, // East
  maxLat: 37.7950,   // North
};

async function main() {
  const defaultBbox = `${testSF.minLon},${testSF.minLat},${testSF.maxLon},${testSF.maxLat}`;
    
  // const defaultBbox = `${california.minLon},${california.minLat},${california.maxLon},${california.maxLat}`;

  const bboxRaw = getArg("bbox") ?? defaultBbox;
  const bbox = parseBBox(bboxRaw);

  // Keep tileDeg small enough that this tiny box results in only 1 or 2 tiles
  const tileDeg = Number(getArg("tileDeg") ?? "0.01"); 
  const tiles = tileBBox(bbox, tileDeg);

	const ctx = {
		db,
		bboxRaw,
		tiles,
		overpass: {
		endpoints: [
			"https://overpass-api.de/api/interpreter",
			"https://overpass.private.coffee/api/interpreter",
			"https://overpass.osm.jp/api/interpreter",
		],
		queryForBBox: overpassQuery,
		delayMs: 1000,
		},
	};
	
	try {
		const stages = [
			collectStage,
      crawlStage,
      imageStage,
      enrichmentStage
		];

		await runPipeline(ctx, stages);
	} finally {
		await db.destroy();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});

