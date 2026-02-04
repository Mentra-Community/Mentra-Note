/**
 * Notes App API Router
 *
 * Simplified API for the Notes app - focuses on transcripts, notes, and settings.
 * Most real-time state is handled via WebSocket sync, but these endpoints
 * provide REST access for specific operations.
 */

import { Hono } from "hono";
import { createAuthMiddleware } from "@mentra/sdk";
import { sessions } from "../synced/session";
import {
  getOrCreateDailyTranscript,
  Note as NoteModel,
  UserSettings,
} from "../services/db";

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
