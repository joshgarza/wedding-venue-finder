import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('venue_embeddings', (table) => {
    table.uuid('embedding_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable().references('venue_id').inTable('venues').onDelete('CASCADE');

    // Path to the image file (relative to data/venues/)
    table.text('image_path').notNullable();

    // VECTOR(512) for CLIP image embeddings
    table.specificType('embedding_vector', 'VECTOR(512)').notNullable();

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('venue_id');
    table.unique(['venue_id', 'image_path']); // Prevent duplicate embeddings for same image
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('venue_embeddings');
}

