// src/pipeline/stages.ts
export type BBox = {
	minLon: number;
	minLat: number;
	maxLon: number;
	maxLat: number;
};


export type PipelineCtx = {
	db: Knex;
	tiles?: BBox[];
	bboxRaw: string;
	dataDir: string;       // e.g. "data"
	publicOut: string;     // e.g. "public/venues.ndjson"
	overpass: {
		endpoints: string[];
		queryForBBox: (bbox: BBox) => string;
		delayMx?: number;
	};
};

export type StageResult = {
  success: boolean;
};

export type Stage = {
	name: string;
	run: (ctx: PipelineCtx) => Promise<StageResult>;
};

