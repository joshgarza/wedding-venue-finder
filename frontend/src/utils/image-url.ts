const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api/v1';

/**
 * Convert local filesystem path to API image URL.
 * Input:  /abs/path/data/venues/123/raw_images/photo.jpg
 * Output: http://localhost:3003/api/v1/images/venues/123/photo.jpg
 */
export function localPathToImageUrl(localPath: string): string {
  // Extract venue ID and filename from the path
  const match = localPath.match(/venues\/([^/]+)\/(?:raw_images|images)\/(.+)$/);
  if (match) {
    const [, venueId, filename] = match;
    return `${API_BASE_URL}/images/venues/${venueId}/${filename}`;
  }
  // Fallback: if path doesn't match expected pattern, return as-is
  return localPath;
}

/**
 * Convert relative API path to full URL.
 * Input:  /images/venues/123/photo.jpg
 * Output: http://localhost:3003/api/v1/images/venues/123/photo.jpg
 */
export function toFullImageUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  // Strip leading /api/v1 if present to avoid duplication
  const cleaned = relativePath.replace(/^\/api\/v1/, '');
  return `${API_BASE_URL}${cleaned.startsWith('/') ? '' : '/'}${cleaned}`;
}
