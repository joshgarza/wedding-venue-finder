/**
 * Unit tests for vector utilities
 * Tests cosine similarity and centroid computation for CLIP embeddings
 */

import { describe, it, expect } from 'vitest';
import { cosineSimilarity, computeCentroid, normalizeVector } from '../../../src/api/utils/vector.utils';

describe('Vector Utilities', () => {
  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const v1 = [1, 2, 3, 4];
      const v2 = [1, 2, 3, 4];

      const similarity = cosineSimilarity(v1, v2);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0.0 for orthogonal vectors', () => {
      const v1 = [1, 0, 0, 0];
      const v2 = [0, 1, 0, 0];

      const similarity = cosineSimilarity(v1, v2);

      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should return -1.0 for opposite vectors', () => {
      const v1 = [1, 2, 3];
      const v2 = [-1, -2, -3];

      const similarity = cosineSimilarity(v1, v2);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should handle normalized vectors correctly', () => {
      const v1 = [0.6, 0.8];
      const v2 = [0.8, 0.6];

      const similarity = cosineSimilarity(v1, v2);

      // cos(θ) where v1·v2 = 0.6*0.8 + 0.8*0.6 = 0.96
      // |v1| = 1, |v2| = 1, so sim = 0.96
      expect(similarity).toBeCloseTo(0.96, 5);
    });

    it('should handle zero vector gracefully', () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 2, 3];

      const similarity = cosineSimilarity(v1, v2);

      expect(similarity).toBe(0);
    });

    it('should throw error for mismatched dimensions', () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2];

      expect(() => cosineSimilarity(v1, v2)).toThrow('Vector dimensions must match');
    });

    it('should handle 512-dimensional CLIP vectors', () => {
      const v1 = Array(512).fill(0).map((_, i) => Math.sin(i * 0.1));
      const v2 = Array(512).fill(0).map((_, i) => Math.cos(i * 0.1));

      const similarity = cosineSimilarity(v1, v2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('computeCentroid', () => {
    it('should compute centroid of single vector', () => {
      const vectors = [[1, 2, 3]];

      const centroid = computeCentroid(vectors);

      expect(centroid).toEqual([1, 2, 3]);
    });

    it('should compute centroid of multiple vectors', () => {
      const vectors = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];

      const centroid = computeCentroid(vectors);

      // Average: [(1+4+7)/3, (2+5+8)/3, (3+6+9)/3] = [4, 5, 6]
      expect(centroid).toEqual([4, 5, 6]);
    });

    it('should compute centroid of two vectors', () => {
      const vectors = [
        [0, 0, 0],
        [10, 20, 30]
      ];

      const centroid = computeCentroid(vectors);

      expect(centroid).toEqual([5, 10, 15]);
    });

    it('should handle 512-dimensional vectors', () => {
      const vectors = [
        Array(512).fill(1),
        Array(512).fill(3),
        Array(512).fill(5)
      ];

      const centroid = computeCentroid(vectors);

      expect(centroid).toHaveLength(512);
      expect(centroid[0]).toBe(3); // (1+3+5)/3 = 3
      expect(centroid[511]).toBe(3);
    });

    it('should throw error for empty array', () => {
      const vectors: number[][] = [];

      expect(() => computeCentroid(vectors)).toThrow('Cannot compute centroid of empty array');
    });

    it('should throw error for mismatched dimensions', () => {
      const vectors = [
        [1, 2, 3],
        [4, 5]
      ];

      expect(() => computeCentroid(vectors)).toThrow('All vectors must have the same dimension');
    });

    it('should handle negative values', () => {
      const vectors = [
        [-1, -2, -3],
        [1, 2, 3]
      ];

      const centroid = computeCentroid(vectors);

      expect(centroid).toEqual([0, 0, 0]);
    });
  });

  describe('normalizeVector', () => {
    it('should normalize a simple vector', () => {
      const v = [3, 4]; // magnitude = 5

      const normalized = normalizeVector(v);

      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);

      // Check magnitude is 1
      const magnitude = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('should normalize a unit vector to itself', () => {
      const v = [1, 0, 0];

      const normalized = normalizeVector(v);

      expect(normalized).toEqual([1, 0, 0]);
    });

    it('should handle already normalized vectors', () => {
      const v = [0.6, 0.8];

      const normalized = normalizeVector(v);

      expect(normalized[0]).toBeCloseTo(0.6, 5);
      expect(normalized[1]).toBeCloseTo(0.8, 5);
    });

    it('should throw error for zero vector', () => {
      const v = [0, 0, 0];

      expect(() => normalizeVector(v)).toThrow('Cannot normalize zero vector');
    });

    it('should handle 512-dimensional vectors', () => {
      const v = Array(512).fill(1);

      const normalized = normalizeVector(v);

      expect(normalized).toHaveLength(512);

      // Check magnitude is 1
      const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val ** 2, 0));
      expect(magnitude).toBeCloseTo(1.0, 5);
    });
  });
});
