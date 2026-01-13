// src/pipeline/stage_addWebsites.ts
import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";
import { Stage } from "./stages.js";
import { createWriter } from "../utils/index.js";

export const addWebsitesStage: Stage = {
  name: "addWebsites",
  async run(ctx, inputFile) {
    if (!inputFile) throw new Error("addWebsites requires inputFile");

    const outFile = path.join(ctx.dataDir, "01_with_websites.ndjson");
    const tmp = `${outFile}.tmp`;
    const missingFile = path.join(ctx.dataDir, "01_missing_websites.ndjson");
    const tmpMissing = `${missingFile}.tmp`;

    const out = createWriter(tmp);
    const missing = createWriter(tmpMissing);

    const rl = readline.createInterface({
      input: fs.createReadStream(inputFile, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const v = JSON.parse(trimmed);

      // For now: only normalize + pull from existing tags fields.
      // Later: add wikidata enrichment if you want.
      const website =
        v.website ??
        v.tags?.website ??
        v.tags?.["contact:website"] ??
        v.tags?.url ??
        null;

      const updated = { ...v, website };

      out.write(JSON.stringify(updated) + "\n");
      if (!website) missing.write(JSON.stringify(updated) + "\n");
    }

    await out.close();
    await missing.close();

    fs.renameSync(tmp, outFile);
    fs.renameSync(tmpMissing, missingFile);

    return { outFile, nextInputFile: outFile, extraFiles: [missingFile] };
  },
};

