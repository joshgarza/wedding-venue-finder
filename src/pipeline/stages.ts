// src/pipeline/stages.ts
export type PipelineCtx = {
  bboxRaw: string;
  // where we write artifacts
  dataDir: string;       // e.g. "data"
  publicOut: string;     // e.g. "public/venues.ndjson"
  // Overpass only needed for collect
  overpass: {
    endpoints: string[];
    query: string;
  };
};

export type StageResult = {
  outFile: string;        // staged artifact path (e.g. data/01_with_websites.ndjson)
  nextInputFile: string;  // usually same as outFile
  extraFiles?: string[];  // e.g. missing websites file
};

export type Stage = {
  name: string;
  run: (ctx: PipelineCtx, inputFile?: string) => Promise<StageResult>;
};

