import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { pipeline } from 'stream/promises';

export async function downloadImage(url: string, targetFolder: string, venueId: string): Promise<string | null> {
  try {
    // 1. Create unique filename from URL hash or name
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    await fs.promises.mkdir(targetFolder, { recursive: true });
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const filename = `${hash.substring(0, 10)}${ext}`;

    // 3. Download with 5s timeout
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 5000,
      headers: { 'User-Agent': 'WeddingVenueBot/1.0' }
    });

    // PRD CHECK: Filter by size (> 50KB)
    const contentLength = parseInt(response.headers['content-length'] || '0');
    if (contentLength > 0 && contentLength < 51200) return null; // Skip small icons

    await pipeline(response.data, fs.createWriteStream(targetPath));
    return targetPath;
  } catch (err) {
    return null;
  }
}

export function extractImageUrls(markdown: string): string[] {
  // Regex to find standard Markdown images: ![alt](url)
  const regex = /!\[.*?\]\((https?:\/\/.*?)\)/g;
  const matches = [...markdown.matchAll(regex)];
  return matches.map(m => m[1]);
}
