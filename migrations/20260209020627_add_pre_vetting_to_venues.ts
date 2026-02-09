import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Create enum for pre-vetting status
  await knex.raw(`
    CREATE TYPE pre_vetting_status AS ENUM ('pending', 'yes', 'no', 'needs_confirmation')
  `);

  await knex.schema.alterTable('venues', (table) => {
    // Pre-vetting status (yes = proceed to BFS, no = skip, needs_confirmation = unclear)
    table.specificType('pre_vetting_status', 'pre_vetting_status').defaultTo('pending');

    // Matched keywords from homepage
    table.specificType('pre_vetting_keywords', 'TEXT[]').nullable();

    // When pre-vetting was performed
    table.timestamp('pre_vetted_at').nullable();

    // Index for filtering in Stage 2
    table.index('pre_vetting_status');
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('venues', (table) => {
    table.dropColumn('pre_vetting_status');
    table.dropColumn('pre_vetting_keywords');
    table.dropColumn('pre_vetted_at');
  });

  await knex.raw('DROP TYPE IF EXISTS pre_vetting_status');
}

