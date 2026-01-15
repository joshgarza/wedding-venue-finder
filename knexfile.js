module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      user: 'postgres',
      password: 'postgres', // todo: move login stuff to secrets manager
      database: 'wedding_venue_finder'
    },
    migrations: {
      directory: './migrations'
    }
  }
};
