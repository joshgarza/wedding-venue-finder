import knex, { Knex } from "knex";
import knexConfig from "../knexfile";

export const db = knex(knexConfig.development);

/**
 * Get database instance (for testing)
 */
export function getDb(): Knex {
  return db;
}

