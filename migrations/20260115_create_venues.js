exports.up = async function(knex) {
  // 1. Create the Enum for venue_type
  await knex.raw(`CREATE TYPE venue_type_enum AS ENUM ('restaurant', 'hotel', 'museum', 'park', 'other')`);

  // 2. Create the table
  await knex.schema.createTable('venues', (table) => {
    table.uuid('venue_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // NEW: Unique OSM Identifier for Upserts
    table.string('osm_id').unique().notNullable(); 
    
    table.string('name').notNullable();
    table.string('website_url');
    table.boolean('is_active').defaultTo(true);
    
    table.specificType('venue_type', 'venue_type_enum');
    
    // Phi-3 / AI Extracted Data
    table.boolean('has_lodging').nullable();
    table.integer('lodging_capacity').defaultTo(0);
    table.boolean('is_historic').defaultTo(false);
    table.integer('pricing_tier').checkIn([1, 2, 3, 4]);

    // Media and Metadata
    table.specificType('image_urls', 'text[]'); 
    table.jsonb('image_tags');      // For Moon AI results
    table.jsonb('osm_metadata');   // NEW: Store raw OSM tags here

    table.timestamps(true, true);
  });

  // 3. Add PostGIS Point column
  await knex.raw(`SELECT AddGeometryColumn('venues', 'location_lat_long', 4326, 'POINT', 2)`);
  
  // 4. Spatial Index
  await knex.raw(`CREATE INDEX venues_location_idx ON venues USING GIST (location_lat_long)`);
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('venues')
    .then(() => knex.raw('DROP TYPE venue_type_enum'));
};
