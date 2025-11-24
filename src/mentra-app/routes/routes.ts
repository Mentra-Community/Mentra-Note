/**
 * =============================================================================
 * Web Routes Module
 * =============================================================================
 *
 * This module contains all API endpoints and web routes for the photo viewer.
 *
 * Routes included:
 * - GET /api/latest-photo - Get metadata for the latest photo
 * - GET /api/photo/:requestId - Get the actual photo image data
 * - GET /webview - Main photo viewer web interface
 *
 * =============================================================================
 */

import { Express } from 'express';
import { AuthenticatedRequest } from '@mentra/sdk';
import * as ejs from 'ejs';
import * as path from 'path';


interface StoredPhoto {
  requestId: string;
  buffer: Buffer;
  timestamp: Date;
  userId: string;
  mimeType: string;
  filename: string;
  size: number;
}


/**
 * Set up all web routes for the application
 */
export function setupWebviewRoutes(
  app: Express,
  photosMap: Map<string, StoredPhoto>
): void {

  // Route 1: Get the latest photo metadata
  app.get('/api/latest-photo', (req: any, res: any) => {
    const userId = (req as AuthenticatedRequest).authUserId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const photo = photosMap.get(userId);

    if (!photo) {
      res.status(404).json({ error: 'No photo available' });
      return;
    }

    res.json({
      requestId: photo.requestId,
      timestamp: photo.timestamp.getTime(),
      hasPhoto: true
    });
  });


  // Route 2: Get the actual photo image data
  app.get('/api/photo/:requestId', (req: any, res: any) => {
    const userId = (req as AuthenticatedRequest).authUserId;
    const requestId = req.params.requestId;

    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const photo = photosMap.get(userId);

    if (!photo || photo.requestId !== requestId) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    res.set({
      'Content-Type': photo.mimeType,
      'Cache-Control': 'no-cache'
    });

    res.send(photo.buffer);
  });


  // Route 3: Main photo viewer web interface
  app.get('/webview', async (req: any, res: any) => {
    const userId = (req as AuthenticatedRequest).authUserId;

    if (!userId) {
      res.status(401).send(`
        <html>
          <head><title>Photo Viewer - Not Authenticated</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Please open this page from the MentraOS app</h1>
          </body>
        </html>
      `);
      return;
    }

    const templatePath = path.join(process.cwd(), 'views', 'photo-viewer.ejs');
    const html = await ejs.renderFile(templatePath, {});

    res.send(html);
  });
}
