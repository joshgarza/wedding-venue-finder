/**
 * Location utilities for geocoding and geolocation
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Get user's current location using browser geolocation API
 * Returns coordinates or null if denied/unavailable
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Convert miles to meters
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

/**
 * Parse zip code and return center coordinates
 * Note: This is a simple implementation. For production, use a geocoding API
 * like Google Maps Geocoding API or Nominatim
 */
export async function geocodeZipCode(zipCode: string): Promise<Coordinates | null> {
  try {
    // Use Nominatim (OpenStreetMap) for free geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(
        zipCode
      )}&country=US&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'WeddingVenueFinder/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();

    if (data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
