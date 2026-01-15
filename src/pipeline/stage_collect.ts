import type { Stage } from "./stages";
import { postOverpass, sleep } from "../utils/index";

export const collectStage: Stage = {
  name: "collect",
  async run(ctx) {
    const { db } = ctx;
    const tiles = ctx.tiles ?? [];
    let totalElements = 0;
    let totalUpdated = 0;

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const tileRaw = `${t.minLon},${t.minLat},${t.maxLon},${t.maxLat}`;
      process.stderr.write(`tile ${i + 1}/${tiles.length}: ${tileRaw}\n`);

      try {
        const { data, endpoint } = await postOverpass(ctx.overpass.endpoints, ctx.overpass.queryForBBox(t));
        const elements: any[] = Array.isArray(data?.elements) ? data.elements : [];
        totalElements += elements.length;

        for (const el of elements) {
          const tags = el.tags ?? {};
          const lat = typeof el.lat === "number" ? el.lat : el.center?.lat ?? null;
          const lng = typeof el.lon === "number" ? el.lon : el.center?.lon ?? null;

          if (!lat || !lng) continue;

          const osmId = `${el.type}/${el.id}`;

          // UPSERT logic: Insert new or update existing based on osm_id
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

        if (ctx.overpass.delayMs > 0 && i < tiles.length - 1) {
          await sleep(ctx.overpass.delayMs);
        }
      } catch (err) {
        process.stderr.write(`tile failed; skipping. ${String(err).slice(0, 100)}\n`);
      }
    }

    process.stderr.write(`collect: elements=${totalElements} upserted=${totalUpdated}\n`);

    return { success: true };
  },
};
