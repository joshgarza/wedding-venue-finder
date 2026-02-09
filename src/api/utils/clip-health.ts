/**
 * CLIP Service Health Check Utility
 * Verifies CLIP service is available before processing
 */

import { EmbeddingService } from '../services/embedding.service';

/**
 * Check if CLIP service is available and exit if not
 * Use this before running batch embedding generation scripts
 */
export async function ensureClipServiceAvailable(): Promise<void> {
  console.log('Checking CLIP service availability...');

  const isHealthy = await EmbeddingService.checkHealth();

  if (!isHealthy) {
    console.error('❌ CLIP service is not available');
    console.error('');
    console.error('Please ensure CLIP service is running:');
    console.error('  1. Check docker-compose status: docker compose ps');
    console.error('  2. Start services: docker compose up -d');
    console.error('  3. Check CLIP logs: docker compose logs clip_api');
    console.error('');
    console.error('CLIP service URL:', process.env.CLIP_SERVICE_URL || 'http://localhost:51000');
    process.exit(1);
  }

  console.log('✓ CLIP service is available');
}

/**
 * Check CLIP service health and return status
 * Non-blocking version for API endpoints
 */
export async function checkClipServiceHealth(): Promise<boolean> {
  return EmbeddingService.checkHealth();
}
