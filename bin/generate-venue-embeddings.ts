/**
 * Batch Venue Embedding Generation Script
 * Pre-computes CLIP embeddings for all venue images
 * Stores in venue_embeddings table for taste profile matching
 */

import { getDb } from '../db/db-config';
import { EmbeddingService } from '../src/api/services/embedding.service';
import { ensureClipServiceAvailable } from '../src/api/utils/clip-health';
import * as cliProgress from 'cli-progress';
import * as fs from 'fs';

interface Venue {
  venue_id: string;
  name: string;
  image_data: {
    local_paths?: string[];
    processed_at?: string;
  } | null;
}

interface EmbeddingRecord {
  venue_id: string;
  image_path: string;
  embedding_vector: string; // pgvector format: '[0.1, 0.2, ...]'
}

const CONCURRENCY_LIMIT = 10;
const BATCH_SIZE = 50; // Process venues in batches

/**
 * Main function to generate embeddings for all venue images
 */
async function generateVenueEmbeddings() {
  const db = getDb();

  console.log('=== Venue Embedding Generation ===\n');

  // Check CLIP service availability
  await ensureClipServiceAvailable();

  try {
    // Get all venues with images
    console.log('Fetching venues with images...');
    const venues = await db<Venue>('venues')
      .whereNotNull('image_data')
      .select('venue_id', 'name', 'image_data');

    if (venues.length === 0) {
      console.log('No venues with images found.');
      return;
    }

    console.log(`Found ${venues.length} venues with images\n`);

    // Flatten venues into image paths
    const imagesToProcess: Array<{
      venue_id: string;
      venue_name: string;
      image_path: string;
    }> = [];

    for (const venue of venues) {
      const imagePaths = venue.image_data?.local_paths || [];

      for (const imagePath of imagePaths) {
        // Check if file exists
        if (!fs.existsSync(imagePath)) {
          console.warn(`⚠ Image not found: ${imagePath}`);
          continue;
        }

        // Check if embedding already exists
        const existing = await db('venue_embeddings')
          .where({ venue_id: venue.venue_id, image_path: imagePath })
          .first();

        if (!existing) {
          imagesToProcess.push({
            venue_id: venue.venue_id,
            venue_name: venue.name,
            image_path: imagePath
          });
        }
      }
    }

    if (imagesToProcess.length === 0) {
      console.log('✓ All venue images already have embeddings');
      return;
    }

    console.log(`Processing ${imagesToProcess.length} new images\n`);

    // Progress bar
    const progressBar = new cliProgress.SingleBar(
      {
        format: 'Progress | {bar} | {percentage}% | {value}/{total} images | ETA: {eta}s',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      },
      cliProgress.Presets.shades_classic
    );

    progressBar.start(imagesToProcess.length, 0);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
      const batch = imagesToProcess.slice(i, i + BATCH_SIZE);
      const imagePaths = batch.map(item => item.image_path);

      try {
        // Generate embeddings with concurrency limit
        const embeddings = await EmbeddingService.generateBatchImageEmbeddings(
          imagePaths,
          CONCURRENCY_LIMIT
        );

        // Store embeddings in database
        const embeddingRecords: EmbeddingRecord[] = [];

        for (let j = 0; j < batch.length; j++) {
          const item = batch[j];
          const embedding = embeddings[j];

          if (embedding && embedding.length === 512) {
            // Convert to pgvector format: '[0.1, 0.2, ...]'
            const vectorString = `[${embedding.join(',')}]`;

            embeddingRecords.push({
              venue_id: item.venue_id,
              image_path: item.image_path,
              embedding_vector: vectorString
            });

            successCount++;
          } else {
            errorCount++;
          }

          processedCount++;
          progressBar.update(processedCount);
        }

        // Bulk insert embeddings
        if (embeddingRecords.length > 0) {
          await db('venue_embeddings').insert(embeddingRecords);
        }
      } catch (error) {
        console.error(`\nError processing batch starting at index ${i}:`, error);
        errorCount += batch.length;
        processedCount += batch.length;
        progressBar.update(processedCount);
      }
    }

    progressBar.stop();

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Total images processed: ${processedCount}`);
    console.log(`✓ Successfully generated: ${successCount}`);
    if (errorCount > 0) {
      console.log(`✗ Failed: ${errorCount}`);
    }
    console.log(`\nEmbeddings stored in venue_embeddings table`);
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the script
if (require.main === module) {
  generateVenueEmbeddings()
    .then(() => {
      console.log('\n✓ Embedding generation complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Embedding generation failed:', error);
      process.exit(1);
    });
}

export { generateVenueEmbeddings };
