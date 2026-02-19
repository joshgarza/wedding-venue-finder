import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("collected_tiles", (t) => {
    t.text("tile_key").primary();                // "minLon,minLat,maxLon,maxLat" (4 decimal places)
    t.timestamp("collected_at", { useTz: true }).defaultTo(knex.fn.now());
    t.integer("element_count").notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("collected_tiles");
}
