/**
 * PostGIS spatial query utilities for venue search
 * Provides functions for radius-based location queries and distance calculations
 */

import { Knex } from 'knex';

/**
 * Builds a PostGIS radius query using ST_DWithin for efficient geographic search
 * Uses geography type for accurate distance calculations in meters
 *
 * @param query - Knex query builder to extend
 * @param lat - Latitude of search center
 * @param lng - Longitude of search center
 * @param radiusMeters - Search radius in meters
 * @returns Extended query builder with radius filter
 */
export function buildRadiusQuery(
  query: Knex.QueryBuilder,
  lat: number,
  lng: number,
  radiusMeters: number
): Knex.QueryBuilder {
  // ST_DWithin with geography type for accurate meter-based search
  // Uses SRID 4326 (WGS84 lat/lng)
  return query.whereRaw(
    `ST_DWithin(
      location_lat_long::geography,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
      ?
    )`,
    [lng, lat, radiusMeters]
  );
}

/**
 * Calculates distance between venue location and search point
 * Returns distance in meters using ST_Distance with geography type
 *
 * @param lat - Latitude of search center
 * @param lng - Longitude of search center
 * @returns Knex.Raw expression that computes distance in meters
 */
export function calculateDistance(lat: number, lng: number): Knex.Raw {
  // ST_Distance with geography type returns meters
  // Cast location_lat_long to geography for accurate calculation
  return require('../../../db/db-config').db.raw(
    `ST_Distance(
      location_lat_long::geography,
      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
    )`,
    [lng, lat]
  );
}

/**
 * Extracts lat/lng coordinates from PostGIS point
 * Helper function for converting geometry to JSON-friendly format
 *
 * @param point - PostGIS point from query result
 * @returns Object with lat and lng properties, or null if invalid
 */
export function extractCoordinates(point: any): { lat: number; lng: number } | null {
  if (!point) return null;

  // Handle different PostGIS point formats
  if (typeof point === 'string') {
    // WKT format: "POINT(lng lat)"
    const match = point.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
    }
  } else if (point.x !== undefined && point.y !== undefined) {
    // GeoJSON-like format
    return {
      lng: point.x,
      lat: point.y
    };
  }

  return null;
}
