import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('venues', (table) => {
    table.text('raw_markdown').nullable();
    table.timestamp('last_crawled_at').nullable();
  });
};


export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('venues', (table) => {
    table.dropColumn('raw_markdown');
    table.dropColumn('last_crawled_at');
  });
};

