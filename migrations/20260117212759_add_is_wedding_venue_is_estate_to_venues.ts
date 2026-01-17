import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('venues', (table) => {
    table.boolean('is_wedding_venue').default(false);
    table.boolean('is_estate').default(false);
  });
};


export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('venues', (table) => {
    table.dropColumn('is_wedding_venue');
    table.dropColumn('is_estate');
  });
};

