#!/usr/bin/env node
import { db } from "../db/db-config";
import { getArg, parseBBox, overpassQuery, tileBBox, tileKey } from "../src/utils/index";
import type { BBox, Stage } from "../src/pipeline/stages";
import { runPipeline } from "../src/pipeline/runPipeline";
import { collectStage } from "../src/pipeline/stage_1_collect";
import { preVettingStage } from "../src/pipeline/stage_1_5_pre_vetting";
import { crawlStage } from "../src/pipeline/stage_2_crawl";
import { imageStage } from "../src/pipeline/stage_3_images";
import { enrichmentStage } from "../src/pipeline/stage_4_enrichment";

/* ── Named region presets ─────────────────────────────────── */

const regions: Record<string, BBox> = {
	sf: {
		minLon: -122.4100,
		minLat: 37.7850,
		maxLon: -122.3950,
		maxLat: 37.7950,
	},
	la: {
		minLon: -118.67,
		minLat: 33.70,
		maxLon: -117.65,
		maxLat: 34.34,
	},
	california: {
		minLon: -124.409591,
		minLat: 32.534156,
		maxLon: -114.131211,
		maxLat: 42.009518,
	},
};

/* ── Stage lookup ─────────────────────────────────────────── */

const stageMap: Record<string, Stage> = {
	collect: collectStage,
	"pre-vetting": preVettingStage,
	crawl: crawlStage,
	images: imageStage,
	enrichment: enrichmentStage,
};

const defaultStages: Stage[] = [
	collectStage,
	preVettingStage,
	crawlStage,
	imageStage,
	enrichmentStage,
];

async function main() {
	/* ── Resolve bbox ──────────────────────────────────────── */
	const bboxArg = getArg("bbox");
	const regionArg = getArg("region");

	let bbox: BBox;
	if (bboxArg) {
		bbox = parseBBox(bboxArg);
	} else if (regionArg) {
		const preset = regions[regionArg];
		if (!preset) {
			const valid = Object.keys(regions).join(", ");
			throw new Error(`Unknown --region "${regionArg}". Valid: ${valid}`);
		}
		bbox = preset;
	} else {
		bbox = regions.sf; // default
	}

	const bboxRaw = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;

	/* ── Smart tileDeg default ─────────────────────────────── */
	const bboxArea = (bbox.maxLon - bbox.minLon) * (bbox.maxLat - bbox.minLat);
	const defaultTileDeg = bboxArea > 0.1 ? 0.25 : 0.01;
	const tileDeg = Number(getArg("tileDeg") ?? String(defaultTileDeg));
	const tiles = tileBBox(bbox, tileDeg);

	/* ── Dry run ───────────────────────────────────────────── */
	const delayMs = 300;
	const dryRun = process.argv.includes("--dry-run");
	if (dryRun) {
		const doneTiles = new Set<string>();
		const hasTable = await db.schema.hasTable("collected_tiles");
		if (hasTable) {
			const rows = await db("collected_tiles").select("tile_key");
			for (const r of rows) doneTiles.add(r.tile_key);
		}
		const doneCount = tiles.filter((t) => doneTiles.has(tileKey(t))).length;
		const remaining = tiles.length - doneCount;
		const estMinutes = ((remaining * (delayMs + 200)) / 60000).toFixed(1);

		process.stderr.write(`\n── Dry Run ──\n`);
		process.stderr.write(`Region:      ${regionArg ?? "sf (default)"}\n`);
		process.stderr.write(`Bbox:        ${bboxRaw}\n`);
		process.stderr.write(`Tile size:   ${tileDeg}°\n`);
		process.stderr.write(`Total tiles: ${tiles.length}\n`);
		process.stderr.write(`Done tiles:  ${doneCount}\n`);
		process.stderr.write(`Remaining:   ${remaining}\n`);
		process.stderr.write(`Est. time:   ~${estMinutes} min (at ${delayMs + 200}ms/tile)\n\n`);

		await db.destroy();
		return;
	}

	/* ── Resolve stages ────────────────────────────────────── */
	const stageArg = getArg("stage");
	let stages: Stage[];
	if (stageArg) {
		const stage = stageMap[stageArg];
		if (!stage) {
			const valid = Object.keys(stageMap).join(", ");
			throw new Error(`Unknown --stage "${stageArg}". Valid: ${valid}`);
		}
		stages = [stage];
	} else {
		stages = defaultStages;
	}

	/* ── Build context & run ───────────────────────────────── */
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
			delayMs,
		},
	};

	try {
		await runPipeline(ctx as any, stages);
	} finally {
		await db.destroy();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
