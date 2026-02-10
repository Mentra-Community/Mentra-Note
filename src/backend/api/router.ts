/**
 * Notes App API Router
 *
 * Simplified API for the Notes app - focuses on transcripts, notes, and settings.
 * Most real-time state is handled via WebSocket sync, but these endpoints
 * provide REST access for specific operations.
 */

import { Hono } from "hono";
import { createAuthMiddleware } from "@mentra/sdk";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { sessions } from "../session";
import {
  getOrCreateDailyTranscript,
  Note as NoteModel,
  UserSettings,
  File as FileModel,
  getFiles,
  updateFile,
} from "../models";

// Environment
const API_KEY = process.env.MENTRAOS_API_KEY || "";
const PACKAGE_NAME = process.env.PACKAGE_NAME || "";
const COOKIE_SECRET = process.env.COOKIE_SECRET || API_KEY;

export const api = new Hono();

// =============================================================================
// Auth Middleware
// =============================================================================

const authMiddleware = createAuthMiddleware({
  apiKey: API_KEY,
  packageName: PACKAGE_NAME,
  cookieSecret: COOKIE_SECRET,
});

/**
 * Get userId from auth context or header
 */
function getUserId(c: any): string | null {
  // Try auth context first (from middleware)
  const authUserId = c.get("userId");
  if (authUserId) return authUserId;

  // Fallback to header
  const headerUserId = c.req.header("x-user-id");
  if (headerUserId) return headerUserId;

  return null;
}

/**
 * Require auth - returns userId or throws
 */
function requireAuth(c: any): string {
  const userId = getUserId(c);
  if (!userId) {
    throw { error: "Unauthorized", status: 401 };
  }
  return userId;
}

/**
 * Require session - returns session or throws
 */
function requireSession(c: any) {
  const userId = requireAuth(c);

  const session = sessions.get(userId);
  if (!session) {
    throw { error: "No active session", status: 404 };
  }

  return { userId, session };
}

// =============================================================================
// Health Check
// =============================================================================

api.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    activeSessions: sessions.getActiveUserIds().length,
  });
});

// =============================================================================
// Auth Status
// =============================================================================

api.get("/auth/status", authMiddleware, (c) => {
  const userId = getUserId(c);
  return c.json({
    authenticated: !!userId,
    userId: userId || null,
  });
});

// =============================================================================
// Transcript Endpoints
// =============================================================================

/**
 * GET /transcripts/today - Get today's transcript
 */
api.get("/transcripts/today", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const session = sessions.get(userId);

    // Get today's date in local format
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Prefer session data if available
    if (session) {
      const segments = session.transcript.segments;
      return c.json({
        date: todayDate,
        segments: segments.map((s: any) => ({
          id: s.id,
          text: s.text,
          timestamp: s.timestamp,
          isFinal: s.isFinal,
          speakerId: s.speakerId,
        })),
        count: segments.length,
      });
    }

    // Fallback to DB
    const transcript = await getOrCreateDailyTranscript(userId, todayDate);
    return c.json({
      date: todayDate,
      segments: transcript.segments || [],
      count: transcript.segments?.length || 0,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * GET /transcripts/:date - Get transcript for a specific date
 */
api.get("/transcripts/:date", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const date = c.req.param("date");

    const transcript = await getOrCreateDailyTranscript(userId, date);
    return c.json({
      date,
      segments: transcript.segments || [],
      count: transcript.segments?.length || 0,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * DELETE /transcripts/today - Clear today's transcript
 */
api.delete("/transcripts/today", authMiddleware, async (c) => {
  try {
    const { session } = requireSession(c);

    await session.transcript.clear();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

// =============================================================================
// Notes Endpoints
// =============================================================================

/**
 * GET /notes - Get all notes
 */
api.get("/notes", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const session = sessions.get(userId);

    // Prefer session data
    if (session) {
      return c.json({
        notes: session.notes.notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          summary: n.summary,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          transcriptRange: n.transcriptRange,
        })),
        count: session.notes.notes.length,
      });
    }

    // Fallback to DB
    const notes = await NoteModel.find({ userId }).sort({ createdAt: -1 });
    return c.json({
      notes: notes.map((n: any) => ({
        id: n._id.toString(),
        title: n.title,
        content: n.content,
        summary: n.summary,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      count: notes.length,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * GET /notes/:id - Get a specific note
 */
api.get("/notes/:id", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const noteId = c.req.param("id");
    const session = sessions.get(userId);

    // Check session first
    if (session) {
      const note = session.notes.notes.find((n: any) => n.id === noteId);
      if (note) {
        return c.json({
          id: note.id,
          title: note.title,
          content: note.content,
          summary: note.summary,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          transcriptRange: note.transcriptRange,
        });
      }
    }

    // Fallback to DB
    const note = await NoteModel.findOne({ _id: noteId, userId });
    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    return c.json({
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      summary: note.summary,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * POST /notes/generate - Generate a note from transcript
 */
api.post("/notes/generate", authMiddleware, async (c) => {
  try {
    const { session } = requireSession(c);

    const body = await c.req.json().catch(() => ({}));
    const { title, startTime, endTime } = body;

    const note = await session.notes.generateNote(
      title,
      startTime ? new Date(startTime) : undefined,
      endTime ? new Date(endTime) : undefined,
    );

    return c.json({
      id: note.id,
      title: note.title,
      content: note.content,
      summary: note.summary,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      transcriptRange: note.transcriptRange,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * POST /notes - Create a manual note
 */
api.post("/notes", authMiddleware, async (c) => {
  try {
    const { session } = requireSession(c);

    const body = await c.req.json();
    const { title, content } = body;

    if (!title || !content) {
      return c.json({ error: "title and content required" }, 400);
    }

    const note = await session.notes.createManualNote(title, content);

    return c.json({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * PUT /notes/:id - Update a note
 */
api.put("/notes/:id", authMiddleware, async (c) => {
  try {
    const { session } = requireSession(c);
    const noteId = c.req.param("id");

    const body = await c.req.json();
    const { title, content, summary } = body;

    const note = await session.notes.updateNote(noteId, {
      title,
      content,
      summary,
    });

    return c.json({
      id: note.id,
      title: note.title,
      content: note.content,
      summary: note.summary,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * DELETE /notes/:id - Delete a note
 */
api.delete("/notes/:id", authMiddleware, async (c) => {
  try {
    const { session } = requireSession(c);
    const noteId = c.req.param("id");

    await session.notes.deleteNote(noteId);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

// =============================================================================
// Settings Endpoints
// =============================================================================

/**
 * GET /settings - Get user settings
 */
api.get("/settings", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const session = sessions.get(userId);

    const defaultSettings = {
      showLiveTranscript: true,
      displayName: null,
    };

    // Prefer session data
    if (session) {
      return c.json({
        showLiveTranscript: session.settings.showLiveTranscript,
        displayName: session.settings.displayName,
      });
    }

    // Fallback to DB
    const dbSettings = await UserSettings.findOne({ userId });
    if (dbSettings) {
      return c.json({
        showLiveTranscript:
          dbSettings.showLiveTranscript ?? defaultSettings.showLiveTranscript,
        displayName: dbSettings.displayName ?? defaultSettings.displayName,
      });
    }

    return c.json(defaultSettings);
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * PUT /settings - Update user settings
 */
api.put("/settings", authMiddleware, async (c) => {
  try {
    const { session } = requireSession(c);

    const body = await c.req.json();
    const { showLiveTranscript, displayName } = body;

    await session.settings.updateSettings({
      showLiveTranscript,
      displayName,
    });

    return c.json({
      success: true,
      settings: {
        showLiveTranscript: session.settings.showLiveTranscript,
        displayName: session.settings.displayName,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

// =============================================================================
// File Endpoints (Flags: archived, trashed, favourite)
// =============================================================================

/**
 * GET /files - Get all files for a user (with optional filters)
 */
api.get("/files", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);

    // Parse query params for filters
    const isArchived = c.req.query("isArchived");
    const isTrashed = c.req.query("isTrashed");
    const isFavourite = c.req.query("isFavourite");

    const filter: {
      isArchived?: boolean;
      isTrashed?: boolean;
      isFavourite?: boolean;
    } = {};

    if (isArchived !== undefined) {
      filter.isArchived = isArchived === "true";
    }
    if (isTrashed !== undefined) {
      filter.isTrashed = isTrashed === "true";
    }
    if (isFavourite !== undefined) {
      filter.isFavourite = isFavourite === "true";
    }

    const files = await getFiles(userId, filter);

    return c.json({
      files: files.map((f) => ({
        id: f._id.toString(),
        date: f.date,
        noteCount: f.noteCount,
        transcriptSegmentCount: f.transcriptSegmentCount,
        hasTranscript: f.hasTranscript,
        hasNotes: f.hasNotes,
        isArchived: f.isArchived,
        isTrashed: f.isTrashed,
        isFavourite: f.isFavourite,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
      count: files.length,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * GET /files/:date - Get a specific file by date
 */
api.get("/files/:date", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const date = c.req.param("date");

    const file = await FileModel.findOne({ userId, date });

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json({
      id: file._id.toString(),
      date: file.date,
      noteCount: file.noteCount,
      transcriptSegmentCount: file.transcriptSegmentCount,
      hasTranscript: file.hasTranscript,
      hasNotes: file.hasNotes,
      isArchived: file.isArchived,
      isTrashed: file.isTrashed,
      isFavourite: file.isFavourite,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

/**
 * PATCH /files/:date - Update file flags (archived, trashed, favourite)
 */
api.patch("/files/:date", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const date = c.req.param("date");

    const body = await c.req.json();
    const { isArchived, isTrashed, isFavourite } = body;

    // Build updates object with only provided fields
    const updates: {
      isArchived?: boolean;
      isTrashed?: boolean;
      isFavourite?: boolean;
    } = {};

    if (isArchived !== undefined) {
      updates.isArchived = isArchived;
    }
    if (isTrashed !== undefined) {
      updates.isTrashed = isTrashed;
    }
    if (isFavourite !== undefined) {
      updates.isFavourite = isFavourite;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const file = await updateFile(userId, date, updates);

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    return c.json({
      success: true,
      file: {
        id: file._id.toString(),
        date: file.date,
        isArchived: file.isArchived,
        isTrashed: file.isTrashed,
        isFavourite: file.isFavourite,
        updatedAt: file.updatedAt,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

// =============================================================================
// Session Status
// =============================================================================

/**
 * GET /session/status - Get current session status
 */
api.get("/session/status", authMiddleware, (c) => {
  try {
    const userId = requireAuth(c);
    const session = sessions.get(userId);

    if (!session) {
      return c.json({
        hasSession: false,
        isConnected: false,
        hasGlassesConnected: false,
        isRecording: false,
        transcriptCount: 0,
        notesCount: 0,
      });
    }

    return c.json({
      hasSession: true,
      isConnected: true,
      hasGlassesConnected: session.hasGlassesConnected,
      isRecording: session.transcript.isRecording,
      transcriptCount: session.transcript.segments.length,
      notesCount: session.notes.notes.length,
    });
  } catch (err: any) {
    return c.json({ error: err.error || "Internal error" }, err.status || 500);
  }
});

// =============================================================================
// Photo Proxy (serves R2 images to the browser)
// =============================================================================

/**
 * GET /photos/:date/:filename - Proxy photo from R2
 * The browser can't access R2 directly (requires auth), so we stream it through.
 */
api.get("/photos/:date/:filename", authMiddleware, async (c) => {
  try {
    const userId = requireAuth(c);
    const date = c.req.param("date");
    const filename = c.req.param("filename");

    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "mentra-notes";
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      return c.json({ error: "R2 not configured" }, 500);
    }

    const key = `transcripts/${userId}/${date}/photos/${filename}`;

    const s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: key }),
    );

    if (!response.Body) {
      return c.json({ error: "Photo not found" }, 404);
    }

    const contentType = response.ContentType || "image/png";
    const bodyBytes = await response.Body.transformToByteArray();

    return new Response(bodyBytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    if (err.name === "NoSuchKey") {
      return c.json({ error: "Photo not found" }, 404);
    }
    console.error("[Photo Proxy] Error:", err);
    return c.json({ error: "Failed to fetch photo" }, 500);
  }
});

// =============================================================================
// Catch-all for unknown routes
// =============================================================================

api.all("*", (c) => {
  return c.json(
    {
      error: "Not Found",
      path: c.req.path,
      method: c.req.method,
    },
    404,
  );
});
