// src/pipeline/stages.ts
export type BBox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};


export type PipelineCtx = {
  tiles?: BBox[]
  bboxRaw: string;
  // where we write artifacts
  dataDir: string;       // e.g. "data"
  publicOut: string;     // e.g. "public/venues.ndjson"
  // Overpass only needed for collect
  overpass: {
    endpoints: string[];
    queryForBBox: (bbox: BBox) => string;
    delayMx?: number;
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

