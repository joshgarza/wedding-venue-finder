import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create the custom ENUM type to match the EnrichmentSchema
  await knex.raw(`CREATE TYPE pricing_tier_enum AS ENUM ('low', 'medium', 'high', 'luxury', 'unknown')`);

  // 2. Drop the old column and re-add it with the new type
  await knex.schema.alterTable("venues", (table) => {
    table.dropColumn("pricing_tier");
  });

  await knex.schema.alterTable("venues", (table) => {
    table.specificType("pricing_tier", "pricing_tier_enum").defaultTo("medium");
  });
}

export async function down(knex: Knex): Promise<void> {
  // Simple teardown: remove the column and then the type
  await knex.schema.alterTable("venues", (table) => {
    table.dropColumn("pricing_tier");
  });

  await knex.raw(`DROP TYPE pricing_tier_enum`);
}
