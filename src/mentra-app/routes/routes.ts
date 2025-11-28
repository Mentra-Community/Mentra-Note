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
 * - GET /api/photo-base64/:requestId - Get photo as base64 JSON
 * - GET /api/photo-stream - SSE endpoint for real-time photo updates
 * - GET /webview - Main photo viewer web interface
 *
 * =============================================================================
 */

import { Express, Response } from 'express';
import { AuthenticatedRequest } from '@mentra/sdk';
import * as ejs from 'ejs';
import * as path from 'path';

// Store SSE clients
const sseClients: Set<Response> = new Set();
const transcriptionClients: Set<Response> = new Set();

// Store active sessions for audio playback
const activeSessions: Map<string, any> = new Map();


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
 * Helper function to broadcast photo to all SSE clients
 */
export function broadcastPhotoToClients(photo: StoredPhoto): void {
  const base64Data = photo.buffer.toString('base64');
  const photoData = {
    requestId: photo.requestId,
    timestamp: photo.timestamp.getTime(),
    mimeType: photo.mimeType,
    filename: photo.filename,
    size: photo.size,
    base64: base64Data,
    dataUrl: `data:${photo.mimeType};base64,${base64Data}`
  };

  const message = `data: ${JSON.stringify(photoData)}\n\n`;

  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      // Remove dead clients
      sseClients.delete(client);
    }
  });
}

/**
 * Helper function to broadcast transcription to all SSE clients
 */
export function broadcastTranscriptionToClients(text: string, isFinal: boolean): void {
  const transcriptionData = {
    text,
    isFinal,
    timestamp: Date.now()
  };

  const message = `data: ${JSON.stringify(transcriptionData)}\n\n`;

  transcriptionClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      // Remove dead clients
      transcriptionClients.delete(client);
    }
  });
}

/**
 * Register an active session for audio playback
 */
export function registerSession(userId: string, session: any): void {
  activeSessions.set(userId, session);
}

/**
 * Unregister a session
 */
export function unregisterSession(userId: string): void {
  activeSessions.delete(userId);
}

/**
 * Set up all web routes for the application
 */
export function setupWebviewRoutes(
  app: Express,
  photosMap: Map<string, StoredPhoto>
): void {

  // SSE Route: Real-time photo stream
  app.get('/api/photo-stream', (req: any, res: any) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Add this client to the set
    sseClients.add(res);

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Send existing photo if available (for development)
    const firstPhoto = Array.from(photosMap.values())[0];
    if (firstPhoto) {
      const base64Data = firstPhoto.buffer.toString('base64');
      const photoData = {
        requestId: firstPhoto.requestId,
        timestamp: firstPhoto.timestamp.getTime(),
        mimeType: firstPhoto.mimeType,
        filename: firstPhoto.filename,
        size: firstPhoto.size,
        base64: base64Data,
        dataUrl: `data:${firstPhoto.mimeType};base64,${base64Data}`
      };
      res.write(`data: ${JSON.stringify(photoData)}\n\n`);
    }

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // SSE Route: Real-time transcription stream
  app.get('/api/transcription-stream', (req: any, res: any) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Add this client to the set
    transcriptionClients.add(res);

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    // Handle client disconnect
    req.on('close', () => {
      transcriptionClients.delete(res);
    });
  });

  // Route: Play audio from URL
  app.post('/api/play-audio', async (req: any, res: any) => {
    try {
      const { audioUrl } = req.body;

      if (!audioUrl) {
        res.status(400).json({ error: 'audioUrl is required' });
        return;
      }

      // For development: Get the first available session
      const firstSession = Array.from(activeSessions.values())[0];

      if (!firstSession) {
        res.status(404).json({ error: 'No active session available' });
        return;
      }

      // Play the audio
      await firstSession.audio.playAudio({ audioUrl });

      res.json({ success: true, message: 'Audio playback started' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Route: Text-to-speech
  app.post('/api/speak', async (req: any, res: any) => {
    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({ error: 'text is required' });
        return;
      }

      // For development: Get the first available session
      const firstSession = Array.from(activeSessions.values())[0];

      if (!firstSession) {
        res.status(404).json({ error: 'No active session available' });
        return;
      }

      // Speak the text
      await firstSession.audio.speak(text);

      res.json({ success: true, message: 'Text-to-speech started' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Route: Stop audio
  app.post('/api/stop-audio', async (req: any, res: any) => {
    console.log('Stop audio endpoint hit');
    try {
      // For development: Get the first available session
      const firstSession = Array.from(activeSessions.values())[0];

      if (!firstSession) {
        console.log('No active session available');
        res.status(404).json({ error: 'No active session available' });
        return;
      }

      console.log('Stopping audio...');
      // Stop the audio
      await firstSession.audio.stopAudio();

      console.log('Audio stopped successfully');
      res.json({ success: true, message: 'Audio stopped' });
    } catch (error: any) {
      console.error('Error stopping audio:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route 1: Get the latest photo metadata
  app.get('/api/latest-photo', (req: any, res: any) => {
    const userId = (req as AuthenticatedRequest).authUserId;

    // For development: Allow unauthenticated access and return any available photo
    if (!userId) {
      // Get the first available photo from any user
      const firstPhoto = Array.from(photosMap.values())[0];

      if (!firstPhoto) {
        res.status(404).json({ error: 'No photo available' });
        return;
      }

      res.json({
        requestId: firstPhoto.requestId,
        timestamp: firstPhoto.timestamp.getTime(),
        hasPhoto: true
      });
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


  // Route 3: Get photo as base64 JSON
  app.get('/api/photo-base64/:requestId', (req: any, res: any) => {
    const userId = (req as AuthenticatedRequest).authUserId;
    const requestId = req.params.requestId;

    // For development: Allow unauthenticated access
    if (!userId) {
      // Find photo by requestId across all users
      const photo = Array.from(photosMap.values()).find(p => p.requestId === requestId);

      if (!photo) {
        res.status(404).json({ error: 'Photo not found' });
        return;
      }

      const base64Data = photo.buffer.toString('base64');

      res.json({
        requestId: photo.requestId,
        timestamp: photo.timestamp.getTime(),
        mimeType: photo.mimeType,
        filename: photo.filename,
        size: photo.size,
        base64: base64Data,
        dataUrl: `data:${photo.mimeType};base64,${base64Data}`
      });
      return;
    }

    const photo = photosMap.get(userId);

    if (!photo || photo.requestId !== requestId) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    const base64Data = photo.buffer.toString('base64');

    res.json({
      requestId: photo.requestId,
      timestamp: photo.timestamp.getTime(),
      mimeType: photo.mimeType,
      filename: photo.filename,
      size: photo.size,
      base64: base64Data,
      dataUrl: `data:${photo.mimeType};base64,${base64Data}`
    });
  });


  // Route 4: Main photo viewer web interface
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
