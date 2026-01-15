import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
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
