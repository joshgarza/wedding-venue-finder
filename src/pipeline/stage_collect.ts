// src/pipeline/stage_collect.ts
import path from "node:path";
import { Stage } from "./stages.js";
import { createWriter, postOverpass } from "../utils/index.js"; // adjust path
// You already have parseBBox + overpassQuery in main; here we assume ctx.overpass.query is provided.

export const collectStage: Stage = {
  name: "collect",
  async run(ctx) {
    const outFile = path.join(ctx.dataDir, "00_candidates.ndjson");
    const writer = createWriter(outFile);

    const { data, endpoint } = await postOverpass(ctx.overpass.endpoints, ctx.overpass.query);
    process.stderr.write(`overpass endpoint: ${endpoint}\n`);

    const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
    for (const el of elements) {
      const tags = el.tags ?? {};
      const lat = typeof el.lat === "number" ? el.lat : el.center?.lat ?? null;
      const lng = typeof el.lon === "number" ? el.lon : el.center?.lon ?? null;

      writer.write(
        JSON.stringify({
          id: `${el.type}/${el.id}`,        // normalize now
          name: tags.name ?? null,
          lat,
          lng,
          website: tags.website ?? tags["contact:website"] ?? tags.url ?? null,
          tags,
          source: "overpass",
        }) + "\n"
      );
    }

    writer.close();
    process.stderr.write(`Fetched ${elements.length} elements for bbox ${ctx.bboxRaw}\n`);

    return { outFile, nextInputFile: outFile };
  },
};

