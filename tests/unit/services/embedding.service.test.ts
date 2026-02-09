/**
 * Unit tests for CLIP embedding service
 * Tests image and text embedding generation with mocked axios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { EmbeddingService } from '../../../src/api/services/embedding.service';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Helper to create axios error
function createAxiosError(code: string, message: string): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.code = code;
  error.config = {} as any;
  error.toJSON = () => ({});
  return error;
}

describe('EmbeddingService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    // Mock axios.isAxiosError
    mockedAxios.isAxiosError = vi.fn((error: any) => error?.isAxiosError === true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateImageEmbedding', () => {
    it('should generate 512-dimensional embedding for image', async () => {
      const imagePath = '/path/to/image.jpg';
      const mockEmbedding = Array(512).fill(0).map((_, i) => Math.random());

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: [mockEmbedding]
        }
      });

      const embedding = await EmbeddingService.generateImageEmbedding(imagePath);

      expect(embedding).toHaveLength(512);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/encode/image'),
        {
          data: [{ uri: imagePath }]
        },
        expect.objectContaining({
          timeout: 30000
        })
      );
    });

    it('should handle CLIP service timeout', async () => {
      const imagePath = '/path/to/image.jpg';

      const timeoutError = createAxiosError('ECONNABORTED', 'timeout of 30000ms exceeded');
      mockedAxios.post.mockRejectedValueOnce(timeoutError);

      await expect(EmbeddingService.generateImageEmbedding(imagePath))
        .rejects.toThrow('CLIP service timeout');
    });

    it('should handle CLIP service unavailable', async () => {
      const imagePath = '/path/to/image.jpg';

      const connError = createAxiosError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:51000');
      mockedAxios.post.mockRejectedValueOnce(connError);

      await expect(EmbeddingService.generateImageEmbedding(imagePath))
        .rejects.toThrow('CLIP service unavailable');
    });

    it('should handle invalid response format', async () => {
      const imagePath = '/path/to/image.jpg';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: null
        }
      });

      await expect(EmbeddingService.generateImageEmbedding(imagePath))
        .rejects.toThrow('Invalid CLIP response format');
    });

    it('should handle empty embedding', async () => {
      const imagePath = '/path/to/image.jpg';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: [[]]
        }
      });

      await expect(EmbeddingService.generateImageEmbedding(imagePath))
        .rejects.toThrow('Invalid embedding dimension');
    });

    it('should handle incorrect embedding dimension', async () => {
      const imagePath = '/path/to/image.jpg';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: [Array(256).fill(0.5)] // Wrong dimension
        }
      });

      await expect(EmbeddingService.generateImageEmbedding(imagePath))
        .rejects.toThrow('Invalid embedding dimension');
    });
  });

  describe('generateTextEmbedding', () => {
    it('should generate 512-dimensional embedding for text', async () => {
      const text = 'elegant wedding venue';
      const mockEmbedding = Array(512).fill(0).map((_, i) => Math.random());

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: [mockEmbedding]
        }
      });

      const embedding = await EmbeddingService.generateTextEmbedding(text);

      expect(embedding).toHaveLength(512);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/encode/text'),
        {
          data: [text]
        },
        expect.objectContaining({
          timeout: 30000
        })
      );
    });

    it('should handle empty text', async () => {
      await expect(EmbeddingService.generateTextEmbedding(''))
        .rejects.toThrow('Text cannot be empty');
    });

    it('should handle CLIP service timeout for text', async () => {
      const text = 'rustic barn venue';

      const timeoutError = createAxiosError('ECONNABORTED', 'timeout of 30000ms exceeded');
      mockedAxios.post.mockRejectedValueOnce(timeoutError);

      await expect(EmbeddingService.generateTextEmbedding(text))
        .rejects.toThrow('CLIP service timeout');
    });
  });

  describe('generateBatchImageEmbeddings', () => {
    it('should generate embeddings for multiple images', async () => {
      const imagePaths = [
        '/path/to/image1.jpg',
        '/path/to/image2.jpg',
        '/path/to/image3.jpg'
      ];

      const mockEmbedding1 = Array(512).fill(0.1);
      const mockEmbedding2 = Array(512).fill(0.2);
      const mockEmbedding3 = Array(512).fill(0.3);

      // Mock three separate calls
      mockedAxios.post
        .mockResolvedValueOnce({ data: { result: [mockEmbedding1] } })
        .mockResolvedValueOnce({ data: { result: [mockEmbedding2] } })
        .mockResolvedValueOnce({ data: { result: [mockEmbedding3] } });

      const embeddings = await EmbeddingService.generateBatchImageEmbeddings(imagePaths);

      expect(embeddings).toHaveLength(3);
      expect(embeddings[0]).toEqual(mockEmbedding1);
      expect(embeddings[1]).toEqual(mockEmbedding2);
      expect(embeddings[2]).toEqual(mockEmbedding3);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch processing', async () => {
      const imagePaths = [
        '/path/to/image1.jpg',
        '/path/to/image2.jpg',
        '/path/to/image3.jpg'
      ];

      const mockEmbedding1 = Array(512).fill(0.1);
      const mockEmbedding3 = Array(512).fill(0.3);

      // Mock: success, failure, success
      mockedAxios.post
        .mockResolvedValueOnce({ data: { result: [mockEmbedding1] } })
        .mockRejectedValueOnce(new Error('Failed to process image'))
        .mockResolvedValueOnce({ data: { result: [mockEmbedding3] } });

      const embeddings = await EmbeddingService.generateBatchImageEmbeddings(imagePaths);

      // Should return embeddings for successful images only
      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toEqual(mockEmbedding1);
      expect(embeddings[1]).toEqual(mockEmbedding3);
    });

    it('should handle empty array', async () => {
      const embeddings = await EmbeddingService.generateBatchImageEmbeddings([]);

      expect(embeddings).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should respect concurrency limit', async () => {
      const imagePaths = Array(15).fill(0).map((_, i) => `/path/to/image${i}.jpg`);
      const mockEmbedding = Array(512).fill(0.5);

      mockedAxios.post.mockResolvedValue({ data: { result: [mockEmbedding] } });

      const embeddings = await EmbeddingService.generateBatchImageEmbeddings(imagePaths, 5);

      expect(embeddings).toHaveLength(15);
      expect(mockedAxios.post).toHaveBeenCalledTimes(15);
    });
  });

  describe('generateBatchTextEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['elegant', 'rustic', 'modern'];

      const mockEmbedding1 = Array(512).fill(0.1);
      const mockEmbedding2 = Array(512).fill(0.2);
      const mockEmbedding3 = Array(512).fill(0.3);

      mockedAxios.post
        .mockResolvedValueOnce({ data: { result: [mockEmbedding1] } })
        .mockResolvedValueOnce({ data: { result: [mockEmbedding2] } })
        .mockResolvedValueOnce({ data: { result: [mockEmbedding3] } });

      const embeddings = await EmbeddingService.generateBatchTextEmbeddings(texts);

      expect(embeddings).toHaveLength(3);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should filter out empty texts', async () => {
      const texts = ['elegant', '', 'modern', '   '];

      const mockEmbedding1 = Array(512).fill(0.1);
      const mockEmbedding2 = Array(512).fill(0.3);

      mockedAxios.post
        .mockResolvedValueOnce({ data: { result: [mockEmbedding1] } })
        .mockResolvedValueOnce({ data: { result: [mockEmbedding2] } });

      const embeddings = await EmbeddingService.generateBatchTextEmbeddings(texts);

      expect(embeddings).toHaveLength(2);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      const embeddings = await EmbeddingService.generateBatchTextEmbeddings([]);

      expect(embeddings).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('health check', () => {
    it('should return true when CLIP service is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { status: 'ok' }
      });

      const isHealthy = await EmbeddingService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/'),
        expect.objectContaining({
          timeout: 5000
        })
      );
    });

    it('should return false when CLIP service is unavailable', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const isHealthy = await EmbeddingService.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout'
      });

      const isHealthy = await EmbeddingService.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });
});
