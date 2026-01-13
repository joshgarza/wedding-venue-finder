// src/pipeline/runPipeline.ts
import fs from "node:fs";
import path from "node:path";
import { Stage, PipelineCtx } from "./stages.js";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function copyToPublic(outFile: string, publicOut: string) {
  fs.copyFileSync(outFile, publicOut);
}

export async function runPipeline(ctx: PipelineCtx, stages: Stage[]) {
  ensureDir(ctx.dataDir);
  ensureDir(path.dirname(ctx.publicOut));

  let inputFile: string | undefined = undefined;

  for (const stage of stages) {
    process.stderr.write(`\n== stage: ${stage.name} ==\n`);

    const res = await stage.run(ctx, inputFile);

    process.stderr.write(`wrote: ${res.outFile}\n`);
    if (res.extraFiles?.length) {
      for (const f of res.extraFiles) process.stderr.write(`wrote: ${f}\n`);
    }
    
    console.log('Checking res before writing to public/venues.ndjson', res.outFile);
    // keep frontend always pointing at the newest output
    copyToPublic(res.outFile, ctx.publicOut);
    process.stderr.write(`updated: ${ctx.publicOut}\n`);

    inputFile = res.nextInputFile;
  }

  process.stderr.write(`\nPipeline complete. Latest: ${ctx.publicOut}\n`);
}

