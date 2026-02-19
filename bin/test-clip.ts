/**
 * CLIP Service Smoke Test
 * Tests health, text encoding, image encoding, and logo detection
 * Run: tsx bin/test-clip.ts
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingService } from '../src/api/services/embedding.service';
import { LogoFilter } from '../src/utils/logo-filter';

const TEST_IMAGE_URL = 'https://picsum.photos/id/164/400/300';

/** Find a local seeded image for testing local file path encoding */
function findLocalImage(): string | null {
  const dataDir = path.resolve(__dirname, '..', 'data', 'venues');
  if (!fs.existsSync(dataDir)) return null;
  const venues = fs.readdirSync(dataDir);
  for (const venue of venues) {
    const imgDir = path.join(dataDir, venue, 'raw_images');
    if (fs.existsSync(imgDir)) {
      const imgs = fs.readdirSync(imgDir).filter(f => f.endsWith('.jpg'));
      if (imgs.length > 0) return path.join(imgDir, imgs[0]);
    }
  }
  return null;
}

async function main() {
  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  process.stdout.write('1. Health check... ');
  try {
    const healthy = await EmbeddingService.checkHealth();
    if (healthy) {
      console.log('PASS');
      passed++;
    } else {
      console.log('FAIL (unhealthy)');
      failed++;
    }
  } catch (e) {
    console.log('FAIL', e);
    failed++;
  }

  // Test 2: Text embedding
  process.stdout.write('2. Text embedding... ');
  try {
    const embedding = await EmbeddingService.generateTextEmbedding('a beautiful wedding venue with gardens');
    if (embedding.length === 512) {
      console.log(`PASS (${embedding.length}-dim)`);
      passed++;
    } else {
      console.log(`FAIL (got ${embedding.length}-dim, expected 512)`);
      failed++;
    }
  } catch (e) {
    console.log('FAIL', e);
    failed++;
  }

  // Test 3: Image embedding
  process.stdout.write('3. Image embedding... ');
  try {
    const embedding = await EmbeddingService.generateImageEmbedding(TEST_IMAGE_URL);
    if (embedding.length === 512) {
      console.log(`PASS (${embedding.length}-dim)`);
      passed++;
    } else {
      console.log(`FAIL (got ${embedding.length}-dim, expected 512)`);
      failed++;
    }
  } catch (e) {
    console.log('FAIL', e);
    failed++;
  }

  // Test 4: Logo detection (should NOT be a logo — it's a landscape photo)
  process.stdout.write('4. Logo detection (expect false)... ');
  try {
    const isLogo = await LogoFilter.isLogo(TEST_IMAGE_URL);
    if (!isLogo) {
      console.log('PASS (correctly identified as not a logo)');
      passed++;
    } else {
      console.log('FAIL (false positive — identified photo as logo)');
      failed++;
    }
  } catch (e) {
    console.log('FAIL', e);
    failed++;
  }

  // Test 5: Local file image embedding (base64 path)
  const localImage = findLocalImage();
  if (localImage) {
    process.stdout.write('5. Local file embedding (base64)... ');
    try {
      const embedding = await EmbeddingService.generateImageEmbedding(localImage);
      if (embedding.length === 512) {
        console.log(`PASS (${embedding.length}-dim from ${path.basename(localImage)})`);
        passed++;
      } else {
        console.log(`FAIL (got ${embedding.length}-dim, expected 512)`);
        failed++;
      }
    } catch (e) {
      console.log('FAIL', e);
      failed++;
    }
  } else {
    console.log('5. Local file embedding... SKIP (no seeded images found)');
  }

  console.log(`\n${passed}/${passed + failed} tests passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
