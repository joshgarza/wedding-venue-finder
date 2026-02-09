import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('taste_profiles', (table) => {
    table.uuid('profile_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().unique().references('user_id').inTable('users').onDelete('CASCADE');

    // VECTOR(512) for CLIP embeddings - stores user's aesthetic centroid
    table.specificType('embedding_vector', 'VECTOR(512)').notNullable();

    // Top 5 descriptive words for user's taste
    table.specificType('descriptive_words', 'TEXT[5]').notNullable();

    // Confidence score (0.0-1.0)
    table.float('confidence').notNullable().defaultTo(0.0);

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Index for user lookup
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('taste_profiles');
}
