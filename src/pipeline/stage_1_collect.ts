import type { Stage } from "./stages";
import { postOverpass, sleep, tileKey } from "../utils/index";
import cliProgress from "cli-progress";

export const collectStage: Stage = {
  name: "collect",
  async run(ctx) {
    const { db } = ctx;
    const tiles = ctx.tiles ?? [];
    let totalElements = 0;
    let totalUpdated = 0;

    // Resume: load already-collected tile keys
    const hasTable = await db.schema.hasTable("collected_tiles");
    const doneTiles = new Set<string>();
    if (hasTable) {
      const rows = await db("collected_tiles").select("tile_key");
      for (const r of rows) doneTiles.add(r.tile_key);
    }

    const remaining = tiles.filter((t) => !doneTiles.has(tileKey(t)));
    const skipped = tiles.length - remaining.length;

    process.stderr.write(
      `collect: ${tiles.length} total tiles, ${skipped} already done, ${remaining.length} remaining\n`
    );

    if (remaining.length === 0) {
      process.stderr.write("collect: nothing to do\n");
      return { success: true };
    }

    const bar = new cliProgress.SingleBar(
      { format: "collect [{bar}] {percentage}% | {value}/{total} tiles | ETA: {eta_formatted}" },
      cliProgress.Presets.shades_classic
    );
    bar.start(remaining.length, 0);

    for (let i = 0; i < remaining.length; i++) {
      const t = remaining[i];
      const key = tileKey(t);

      try {
        const { data } = await postOverpass(ctx.overpass.endpoints, ctx.overpass.queryForBBox(t));
        const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
        totalElements += elements.length;

        for (const el of elements) {
          const tags = el.tags ?? {};
          const lat = typeof el.lat === "number" ? el.lat : el.center?.lat ?? null;
          const lng = typeof el.lon === "number" ? el.lon : el.center?.lon ?? null;

          if (!lat || !lng) continue;

          const osmId = `${el.type}/${el.id}`;

          await db('venues')
            .insert({
              osm_id: osmId,
              name: tags.name ?? "Unknown Venue",
              website_url: tags.website ?? tags["contact:website"] ?? tags.url ?? null,
              location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lng, lat]),
              osm_metadata: JSON.stringify(tags),
              is_active: true
            })
            .onConflict('osm_id')
            .merge({
              name: tags.name ?? "Unknown Venue",
              website_url: tags.website ?? tags["contact:website"] ?? tags.url ?? null,
              location_lat_long: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lng, lat]),
              osm_metadata: JSON.stringify(tags),
              updated_at: db.fn.now()
            });

          totalUpdated++;
        }

        // Record tile as collected
        if (hasTable) {
          await db("collected_tiles")
            .insert({ tile_key: key, element_count: elements.length })
            .onConflict("tile_key")
            .ignore();
        }

        if (ctx.overpass.delayMs > 0 && i < remaining.length - 1) {
          await sleep(ctx.overpass.delayMs);
        }
      } catch (err) {
        process.stderr.write(`\ntile failed (${key}); skipping. ${String(err).slice(0, 100)}\n`);
      }

      bar.increment();
    }

    bar.stop();
    process.stderr.write(`collect: elements=${totalElements} upserted=${totalUpdated}\n`);

    return { success: true };
  },
};
