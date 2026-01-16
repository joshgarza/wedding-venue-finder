// src/pipeline/runPipeline.ts
import { Stage, PipelineCtx } from "./stages";

export async function runPipeline(ctx: PipelineCtx, stages: Stage[]) {
  for (const stage of stages) {
    process.stderr.write(`\n== stage: ${stage.name} ==\n`);

    const res = await stage.run(ctx);

    process.stderr.write(`\nStage successfully ran: ${res.success}\n`);
  }

  process.stderr.write(`\nPipeline complete.\n`);
}

