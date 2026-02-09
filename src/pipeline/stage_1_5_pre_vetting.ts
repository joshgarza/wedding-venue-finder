import axios from 'axios';
import pLimit from 'p-limit';
import type { Stage } from './stages';

// Wedding-related keywords to detect in homepage
const WEDDING_KEYWORDS = [
  'wedding',
  'venue',
  'reception',
  'ceremony',
  'estate',
  'events',
  'celebrate',
  'nuptials',
  'bride',
  'groom'
];

// Extract text from HTML tags for keyword matching
function extractTextFromHTML(html: string): string {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  const title = titleMatch ? titleMatch[1] : '';

  // Extract meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1] : '';

  // Extract H1 tags
  const h1Matches = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gis);
  const h1Text = Array.from(h1Matches).map(m => m[1]).join(' ');

  // Extract H2 tags
  const h2Matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gis);
  const h2Text = Array.from(h2Matches).map(m => m[1]).join(' ');

  // Combine all text
  const combinedText = `${title} ${metaDesc} ${h1Text} ${h2Text}`;

  // Strip HTML tags and normalize whitespace
  return combinedText
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// Check if OSM tags indicate a wedding venue
function hasWeddingTags(osmMetadata: any): boolean {
  if (!osmMetadata) return false;

  const tags = osmMetadata.tags || osmMetadata;

  return (
    tags.venue === 'wedding' ||
    tags.amenity === 'events_venue' ||
    tags.amenity === 'conference_centre' ||
    tags.building === 'estate' ||
    tags.historic === 'manor' ||
    tags.tourism === 'attraction'
  );
}

export const preVettingStage: Stage = {
  name: 'pre-vetting',
  async run(ctx) {
    const { db } = ctx;

    // Get venues that haven't been pre-vetted yet
    const venues = await db('venues')
      .whereNull('pre_vetted_at')
      .whereNotNull('website_url')
      .where('website_url', '!=', '');

    if (venues.length === 0) {
      console.log('No venues to pre-vet');
      return { success: true };
    }

    console.log(`\nPre-vetting ${venues.length} venues...\n`);

    const limit = pLimit(10); // Higher concurrency since we're only fetching homepage
    let yesCount = 0;
    let noCount = 0;
    let needsConfirmationCount = 0;

    await Promise.all(
      venues.map((venue) =>
        limit(async () => {
          try {
            // Fetch ONLY the homepage (no BFS)
            const response = await axios.get(venue.website_url, {
              timeout: 5000, // 5 second timeout
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (compatible; WeddingVenueFinder/1.0; +https://weddingvenuefinder.com)'
              },
              maxRedirects: 3
            });

            const html = response.data;
            const text = extractTextFromHTML(html);

            // Check for wedding keywords
            const matchedKeywords = WEDDING_KEYWORDS.filter((keyword) =>
              text.includes(keyword)
            );

            // Check OSM tags
            const hasOSMWeddingTag = hasWeddingTags(venue.osm_metadata);

            // Bucket logic
            let status: 'yes' | 'no' | 'needs_confirmation' = 'no';

            if (matchedKeywords.length >= 2 || hasOSMWeddingTag) {
              status = 'yes'; // Proceed to BFS crawl
              yesCount++;
            } else if (matchedKeywords.length === 1) {
              status = 'needs_confirmation'; // TODO: retry later
              needsConfirmationCount++;
            } else {
              status = 'no'; // Skip crawling
              noCount++;
            }

            // Update database
            await db('venues')
              .where({ venue_id: venue.venue_id })
              .update({
                pre_vetting_status: status,
                pre_vetting_keywords: matchedKeywords.length > 0 ? matchedKeywords : null,
                pre_vetted_at: new Date()
              });

            console.log(
              `${status === 'yes' ? '✅' : status === 'no' ? '❌' : '⚠️'} ${venue.name}: ${status} (keywords: ${matchedKeywords.join(', ') || 'none'})`
            );
          } catch (err: any) {
            // On error, mark as needs_confirmation (could be rate limit, timeout, etc.)
            console.error(
              `⚠️ ${venue.name}: Error fetching homepage - ${err.message}`
            );

            await db('venues')
              .where({ venue_id: venue.venue_id })
              .update({
                pre_vetting_status: 'needs_confirmation',
                pre_vetting_keywords: null,
                pre_vetted_at: new Date()
              });

            needsConfirmationCount++;
          }
        })
      )
    );

    console.log(`\nPre-vetting complete:`);
    console.log(`  ✅ Yes (proceed to BFS): ${yesCount}`);
    console.log(`  ❌ No (skip crawl): ${noCount}`);
    console.log(`  ⚠️ Needs confirmation: ${needsConfirmationCount}`);

    return { success: true };
  }
};
