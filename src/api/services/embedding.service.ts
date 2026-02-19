/**
 * CLIP Embedding Service
 * Wrapper for CLIP API to generate embeddings for images and text
 * Used for taste profile system and venue ranking
 */

import axios, { AxiosError } from 'axios';
import pLimit from 'p-limit';
import * as fs from 'fs';
import * as path from 'path';

const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://localhost:51000';
const EMBEDDING_DIMENSION = 512; // ViT-B/32 model
const REQUEST_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const DEFAULT_CONCURRENCY = 10;

export class EmbeddingService {
  /**
   * Convert a local file path to a base64 data URI.
   * Returns the original string if it's already a URL.
   * Handles path remapping when running inside Docker containers
   * where host paths differ from container mount paths.
   */
  private static toImageUri(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    let resolvedPath = imagePath;

    // If the path doesn't exist, try remapping via data/venues/ segment
    // (host absolute paths won't exist inside Docker containers)
    if (!fs.existsSync(resolvedPath)) {
      const marker = 'data/venues/';
      const idx = imagePath.indexOf(marker);
      if (idx !== -1) {
        const relativePart = imagePath.substring(idx);
        // Try common container mount points
        const candidates = [
          path.resolve('/app', relativePart),
          path.resolve(process.cwd(), relativePart),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${imagePath} (also tried container remapping)`);
    }

    // Local file path — read and convert to base64 data URI
    const ext = path.extname(resolvedPath).toLowerCase().replace('.', '');
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const buffer = fs.readFileSync(resolvedPath);
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  /**
   * Generate CLIP embedding for a single image
   *
   * @param imagePath Local file path or URI to image
   * @returns 512-dimensional embedding vector
   */
  static async generateImageEmbedding(imagePath: string): Promise<number[]> {
    try {
      const uri = this.toImageUri(imagePath);
      const response = await axios.post(
        `${CLIP_SERVICE_URL}/post`,
        {
          data: [{ uri }],
          execEndpoint: '/encode'
        },
        {
          timeout: REQUEST_TIMEOUT
        }
      );

      const embedding = response.data?.data?.[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid CLIP response format');
      }

      if (embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(`Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      throw this.handleError(error, 'image');
    }
  }

  /**
   * Generate CLIP embedding for text
   *
   * @param text Text to encode
   * @returns 512-dimensional embedding vector
   */
  static async generateTextEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const response = await axios.post(
        `${CLIP_SERVICE_URL}/post`,
        {
          data: [{ text }],
          execEndpoint: '/encode'
        },
        {
          timeout: REQUEST_TIMEOUT
        }
      );

      const embedding = response.data?.data?.[0]?.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid CLIP response format');
      }

      if (embedding.length !== EMBEDDING_DIMENSION) {
        throw new Error(`Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      throw this.handleError(error, 'text');
    }
  }

  /**
   * Generate embeddings for multiple images in batch
   * Processes with concurrency limit to avoid overwhelming CLIP service
   *
   * @param imagePaths Array of image paths
   * @param concurrency Concurrent request limit (default: 10)
   * @returns Array of embeddings (failures are filtered out)
   */
  static async generateBatchImageEmbeddings(
    imagePaths: string[],
    concurrency: number = DEFAULT_CONCURRENCY
  ): Promise<number[][]> {
    if (imagePaths.length === 0) {
      return [];
    }

    const limit = pLimit(concurrency);
    const embeddings: number[][] = [];

    const promises = imagePaths.map((path, index) =>
      limit(async () => {
        try {
          const embedding = await this.generateImageEmbedding(path);
          return { embedding, index, success: true };
        } catch (error) {
          console.error(`Failed to generate embedding for ${path}:`, error);
          return { embedding: null, index, success: false };
        }
      })
    );

    const results = await Promise.all(promises);

    // Filter successful results and maintain order
    for (const result of results) {
      if (result.success && result.embedding) {
        embeddings.push(result.embedding);
      }
    }

    return embeddings;
  }

  /**
   * Generate embeddings for multiple texts in batch
   *
   * @param texts Array of texts
   * @param concurrency Concurrent request limit (default: 10)
   * @returns Array of embeddings (failures are filtered out)
   */
  static async generateBatchTextEmbeddings(
    texts: string[],
    concurrency: number = DEFAULT_CONCURRENCY
  ): Promise<number[][]> {
    // Filter out empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);

    if (validTexts.length === 0) {
      return [];
    }

    const limit = pLimit(concurrency);
    const embeddings: number[][] = [];

    const promises = validTexts.map((text, index) =>
      limit(async () => {
        try {
          const embedding = await this.generateTextEmbedding(text);
          return { embedding, index, success: true };
        } catch (error) {
          console.error(`Failed to generate embedding for "${text}":`, error);
          return { embedding: null, index, success: false };
        }
      })
    );

    const results = await Promise.all(promises);

    // Filter successful results
    for (const result of results) {
      if (result.success && result.embedding) {
        embeddings.push(result.embedding);
      }
    }

    return embeddings;
  }

  /**
   * Check if CLIP service is available and healthy
   *
   * @returns true if service is healthy, false otherwise
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${CLIP_SERVICE_URL}/`, {
        timeout: HEALTH_CHECK_TIMEOUT
      });

      return response.status === 200;
    } catch (error) {
      console.error('CLIP service health check failed:', error);
      return false;
    }
  }

  /**
   * Handle CLIP service errors with descriptive messages
   */
  private static handleError(error: unknown, type: 'image' | 'text'): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNABORTED') {
        return new Error('CLIP service timeout');
      }

      if (axiosError.code === 'ECONNREFUSED') {
        return new Error('CLIP service unavailable');
      }

      if (axiosError.response) {
        return new Error(`CLIP service error: ${axiosError.response.status}`);
      }
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(`Failed to generate ${type} embedding`);
  }
}
