import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Create enum for swipe actions
  await knex.raw(`
    CREATE TYPE swipe_action AS ENUM ('right', 'left', 'unsave')
  `);

  await knex.schema.createTable('swipes', (table) => {
    table.uuid('swipe_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('user_id').inTable('users').onDelete('CASCADE');
    table.uuid('venue_id').notNullable().references('venue_id').inTable('venues').onDelete('CASCADE');
    table.specificType('action', 'swipe_action').notNullable();
    table.uuid('session_id').nullable(); // Groups swipes into onboarding sessions
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('user_id');
    table.index('venue_id');
    table.index('session_id');
    table.index(['user_id', 'venue_id']); // For checking duplicate swipes
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('swipes');
  await knex.raw('DROP TYPE IF EXISTS swipe_action');
}
