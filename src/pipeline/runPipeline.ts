// src/pipeline/runPipeline.ts
import { Stage, PipelineCtx } from "./stages";

export async function runPipeline(ctx: PipelineCtx, stages: Stage[]) {
  for (const stage of stages) {
    process.stderr.write(`\n== stage: ${stage.name} ==\n`);

    try {
      const res = await stage.run(ctx);

      process.stderr.write(`\nStage successfully ran: ${res.success}\n`);

      if (!res.success) {
        process.stderr.write(`\nPipeline aborted: stage "${stage.name}" failed.\n`);
        return;
      }
    } catch (err) {
      process.stderr.write(`\nPipeline aborted: stage "${stage.name}" threw: ${(err as Error).message}\n`);
      return;
    }
  }

  process.stderr.write(`\nPipeline complete.\n`);
}

