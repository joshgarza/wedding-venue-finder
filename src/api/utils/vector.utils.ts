/**
 * Vector utilities for CLIP embeddings
 * Provides cosine similarity and centroid computation for taste profile system
 */

/**
 * Computes cosine similarity between two vectors
 * Returns value in range [-1, 1]:
 * - 1.0 = identical direction
 * - 0.0 = orthogonal (perpendicular)
 * - -1.0 = opposite direction
 *
 * @param v1 First vector
 * @param v2 Second vector
 * @returns Cosine similarity score
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error('Vector dimensions must match');
  }

  // Compute dot product
  let dotProduct = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
  }

  // Compute magnitudes
  let mag1 = 0;
  let mag2 = 0;
  for (let i = 0; i < v1.length; i++) {
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  // Handle zero vectors
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  return dotProduct / (mag1 * mag2);
}

/**
 * Computes the centroid (simple average) of multiple vectors
 * No weighting applied - all vectors contribute equally
 *
 * @param vectors Array of vectors
 * @returns Centroid vector
 */
export function computeCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error('Cannot compute centroid of empty array');
  }

  const dimension = vectors[0].length;

  // Verify all vectors have same dimension
  for (const vector of vectors) {
    if (vector.length !== dimension) {
      throw new Error('All vectors must have the same dimension');
    }
  }

  // Initialize centroid
  const centroid = new Array(dimension).fill(0);

  // Sum all vectors
  for (const vector of vectors) {
    for (let i = 0; i < dimension; i++) {
      centroid[i] += vector[i];
    }
  }

  // Average
  for (let i = 0; i < dimension; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

/**
 * Normalizes a vector to unit length (magnitude = 1)
 *
 * @param v Vector to normalize
 * @returns Normalized vector
 */
export function normalizeVector(v: number[]): number[] {
  // Compute magnitude
  let magnitude = 0;
  for (let i = 0; i < v.length; i++) {
    magnitude += v[i] * v[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude === 0) {
    throw new Error('Cannot normalize zero vector');
  }

  // Normalize
  const normalized = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    normalized[i] = v[i] / magnitude;
  }

  return normalized;
}
