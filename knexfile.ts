import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      user: 'postgres',
      password: 'your_password',
      database: 'my_spatial_db'
    },
    migrations: {
      directory: './migrations',
      extension: 'ts' // Tell knex to look for .ts migration files
    }
  }
};

export default config;
