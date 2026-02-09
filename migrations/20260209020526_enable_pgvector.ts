import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  // Enable pgvector extension for vector similarity search
  // Required for taste_profiles.embedding_vector and venue_embeddings.embedding_vector columns
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
}


export async function down(knex: Knex): Promise<void> {
  // Drop pgvector extension
  // Note: This will fail if any tables still use VECTOR columns
  await knex.raw('DROP EXTENSION IF EXISTS vector');
}

