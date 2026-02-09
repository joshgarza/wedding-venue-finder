/**
 * Aesthetic descriptor words for taste profile system
 * These 14 words are used to describe user preferences via CLIP text embeddings
 *
 * The system computes text embeddings for each word and finds the top 5 that
 * best match the user's taste profile (centroid of liked venue images)
 */

export const AESTHETIC_WORDS = [
  "Moody",
  "Elegant",
  "Vintage",
  "Modern",
  "Rustic",
  "Romantic",
  "Luxurious",
  "Minimalist",
  "Bohemian",
  "Classic",
  "Industrial",
  "Garden",
  "Beachside",
  "Mountain"
] as const;

export type AestheticWord = typeof AESTHETIC_WORDS[number];
