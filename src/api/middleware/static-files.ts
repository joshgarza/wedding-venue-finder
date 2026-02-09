/**
 * Static file middleware for serving venue images
 * Implements security checks to prevent directory traversal attacks
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

// Allowed file extensions (images only)
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Base directory for venue images (absolute path)
const VENUE_IMAGES_BASE = path.resolve(process.cwd(), 'data/venues');

/**
 * Serve venue images from /data/venues directory
 * Route: GET /api/v1/images/venues/:venueId/:filename
 *
 * Security measures:
 * - Validates file extension (only images)
 * - Prevents directory traversal (../ attacks)
 * - Ensures file exists before serving
 * - Only serves files within data/venues directory
 */
export async function serveVenueImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { venueId, filename } = req.params;

    // Validate venue ID is numeric
    if (!/^\d+$/.test(venueId)) {
      return res.status(400).json({ error: 'Invalid venue ID' });
    }

    // Validate filename (no directory traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check file extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Construct safe file path
    // Pattern: data/venues/{venueId}/raw_images/{filename}
    const filePath = path.join(VENUE_IMAGES_BASE, venueId, 'raw_images', filename);

    // Verify the resolved path is still within VENUE_IMAGES_BASE (security check)
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(VENUE_IMAGES_BASE)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return res.status(403).json({ error: 'Invalid resource' });
    }

    // Set appropriate content type based on extension
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Set cache headers (cache for 1 day)
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Stream the file
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming image:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving image' });
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Setup static file routes for venue images
 * Mounts image serving endpoint at /api/v1/images/venues
 */
export function setupStaticFileRoutes(app: any) {
  app.get('/api/v1/images/venues/:venueId/:filename', serveVenueImage);
}
