import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    // Use DATABASE_URL from environment if available (Docker), otherwise use local config
    connection: process.env.DATABASE_URL || {
      host: '127.0.0.1',
      port: 5433,
      user: 'postgres',
      password: 'postgres',
      database: 'wedding_venue_finder'
    },
    migrations: {
      directory: './migrations',
      extension: 'ts' // Tell knex to look for .ts migration files
    }
  }
};

export default config;
