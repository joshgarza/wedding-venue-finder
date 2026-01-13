// src/pipeline/stage_collect.ts
import path from "node:path";
import type { Stage } from "./stages.js";
import { createWriter, postOverpass, sleep } from "../utils/index.js";

export const collectStage: Stage = {
  name: "collect",
  async run(ctx) {
    const outFile = path.join(ctx.dataDir, "00_candidates.ndjson");
    const writer = createWriter(outFile);

    const seen = new Set<string>();

    const tiles = ctx.tiles ?? [];
    const delayMs = ctx.overpass?.delayMs ?? 0;

    let totalElements = 0;
    let totalWritten = 0;

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const tileRaw = `${t.minLon},${t.minLat},${t.maxLon},${t.maxLat}`;

      process.stderr.write(`tile ${i + 1}/${tiles.length}: ${tileRaw}\n`);

      const query = ctx.overpass.queryForBBox(t);
      try {
        const { data, endpoint } = await postOverpass(ctx.overpass.endpoints, query);

	process.stderr.write(`  endpoint: ${endpoint}\n`);

	const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
	totalElements += elements.length;

	for (const el of elements) {
	  const tags = el.tags ?? {};
	  const lat = typeof el.lat === "number" ? el.lat : el.center?.lat ?? null;
	  const lng = typeof el.lon === "number" ? el.lon : el.center?.lon ?? null;

	  const id = `${el.type}/${el.id}`;
	  if (seen.has(id)) continue;
	  seen.add(id);

	  writer.write(
	    JSON.stringify({
	      id,
	      name: tags.name ?? null,
	      lat,
	      lng,
	      website: tags.website ?? tags["contact:website"] ?? tags.url ?? null,
	      tags,
	      source: "overpass",
	      bbox: tileRaw, // handy for debugging later
	    }) + "\n"
	  );

	  totalWritten++;
	}

	if (delayMs > 0 && i < tiles.length - 1) {
	  await sleep(delayMs);
	}	  
      } catch (err) {
        process.stderr.write(`tile failed; skipping. ${String(err).slice(0, 200)}\n`);
	continue;
      }
   }

   await writer.close();

   process.stderr.write(
     `collect: elements=${totalElements} unique_written=${totalWritten}\n`
   );

   return { outFile, nextInputFile: outFile };
  },
};

