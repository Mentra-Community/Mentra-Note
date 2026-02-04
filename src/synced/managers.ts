/**
 * Notes App Synced Managers
 *
 * Uses the decorator-based sync API:
 * - @synced on properties for synced state
 * - synced<T>() helper for typed array/object initialization
 * - @rpc on methods for frontend-callable functions
 * - No constructor needed - @manager decorator handles wiring
 */

import { SyncedManager, synced, rpc, type Synced } from "../lib/sync";
import {
  getOrCreateDailyTranscript,
  appendTranscriptSegments,
  type ITranscriptSegment,
} from "../services/db";

// =============================================================================
// Types
// =============================================================================

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
  speakerId?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
  transcriptRange?: {
    startTime: Date;
    endTime: Date;
  };
}

// =============================================================================
// Transcript Manager
// =============================================================================

export class TranscriptSyncedManager extends SyncedManager {
  @synced segments = synced<TranscriptSegment[]>([]);
  @synced interimText = "";
  @synced isRecording = false;

  private segmentIndex = 0;
  private pendingSegments: ITranscriptSegment[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Get today's date string in local timezone (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  /**
   * Load today's transcript from DB
   */
  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const today = this.getTodayDate();
      const transcript = await getOrCreateDailyTranscript(userId, today);

      if (transcript.segments && transcript.segments.length > 0) {
        // Convert DB segments to our format
        const loadedSegments: TranscriptSegment[] = transcript.segments.map(
          (seg, idx) => ({
            id: `seg_${idx + 1}`,
            text: seg.text,
            timestamp: seg.timestamp,
            isFinal: seg.isFinal,
            speakerId: seg.speakerId,
          }),
        );

        this.segments.set(loadedSegments);
        this.segmentIndex = loadedSegments.length;

        console.log(
          `[TranscriptManager] Hydrated ${loadedSegments.length} segments for ${userId}`,
        );
      }
    } catch (error) {
      console.error("[TranscriptManager] Failed to hydrate:", error);
    }
  }

  /**
   * Persist pending segments to DB
   */
  async persist(): Promise<void> {
    if (this.pendingSegments.length === 0) return;

    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const today = this.getTodayDate();
      const toSave = [...this.pendingSegments];
      this.pendingSegments = [];

      await appendTranscriptSegments(userId, today, toSave);
      console.log(
        `[TranscriptManager] Persisted ${toSave.length} segments for ${userId}`,
      );
    } catch (error) {
      console.error("[TranscriptManager] Failed to persist:", error);
    }
  }

  /**
   * Schedule a batched save (30 second debounce)
   */
  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null;
      await this.persist();
    }, 30000);
  }

  /**
   * Add a transcript segment (called by session on transcription events)
   */
  addSegment(text: string, isFinal: boolean, speakerId?: string): void {
    if (!text.trim()) return;

    this.isRecording = true;

    if (!isFinal) {
      // Update interim text (not persisted)
      this.interimText = text;
      return;
    }

    // Clear interim and add final segment
    this.interimText = "";
    this.segmentIndex++;

    const segment: TranscriptSegment = {
      id: `seg_${this.segmentIndex}`,
      text: text.trim(),
      timestamp: new Date(),
      isFinal: true,
      speakerId,
    };

    this.segments.mutate((s) => s.push(segment));

    // Queue for persistence
    this.pendingSegments.push({
      text: segment.text,
      timestamp: segment.timestamp,
      isFinal: segment.isFinal,
      speakerId: segment.speakerId,
    });
    this.scheduleSave();
  }

  @rpc
  async getRecentSegments(count: number = 50): Promise<TranscriptSegment[]> {
    return this.segments.slice(-count);
  }

  @rpc
  async getFullText(): Promise<string> {
    return this.segments.map((s) => s.text).join(" ");
  }

  @rpc
  async clear(): Promise<void> {
    this.segments.set([]);
    this.interimText = "";
    this.segmentIndex = 0;
  }
}

// =============================================================================
// Notes Manager
// =============================================================================

export class NotesSyncedManager extends SyncedManager {
  @synced notes = synced<Note[]>([]);
  @synced generating = false;

  /**
   * Generate a note from transcript using AI
   */
  @rpc
  async generateNote(
    title?: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<Note> {
    this.generating = true;

    try {
      // Get transcript context from session
      const transcriptManager = (this._session as any)?.transcript;
      const segments: TranscriptSegment[] = transcriptManager?.segments ?? [];

      // Filter segments by time range if provided
      let relevantSegments = segments;
      if (startTime || endTime) {
        relevantSegments = segments.filter((seg) => {
          const segTime = new Date(seg.timestamp).getTime();
          const afterStart = !startTime || segTime >= startTime.getTime();
          const beforeEnd = !endTime || segTime <= endTime.getTime();
          return afterStart && beforeEnd;
        });
      }

      const transcriptText = relevantSegments.map((s) => s.text).join(" ");

      // TODO: Call AI to generate summary
      // For now, create a simple note with the transcript
      const summary =
        transcriptText.length > 500
          ? transcriptText.substring(0, 500) + "..."
          : transcriptText || "No transcript content available.";

      const now = new Date();
      const note: Note = {
        id: `note_${Date.now()}`,
        title: title || `Note - ${now.toLocaleTimeString()}`,
        content: transcriptText,
        summary,
        createdAt: now,
        updatedAt: now,
        transcriptRange:
          startTime && endTime
            ? { startTime, endTime }
            : relevantSegments.length > 0
              ? {
                  startTime: new Date(relevantSegments[0].timestamp),
                  endTime: new Date(
                    relevantSegments[relevantSegments.length - 1].timestamp,
                  ),
                }
              : undefined,
      };

      this.notes.mutate((n) => n.unshift(note));
      return note;
    } finally {
      this.generating = false;
    }
  }

  /**
   * Create a manual note (not generated from transcript)
   */
  @rpc
  async createManualNote(title: string, content: string): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: `note_${Date.now()}`,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };

    this.notes.mutate((n) => n.unshift(note));
    return note;
  }

  /**
   * Update an existing note
   */
  @rpc
  async updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
    let updatedNote: Note | null = null;

    this.notes.mutate((notes) => {
      const index = notes.findIndex((n) => n.id === noteId);
      if (index !== -1) {
        notes[index] = {
          ...notes[index],
          ...updates,
          updatedAt: new Date(),
        };
        updatedNote = notes[index];
      }
    });

    if (!updatedNote) {
      throw new Error(`Note not found: ${noteId}`);
    }

    return updatedNote;
  }

  /**
   * Delete a note
   */
  @rpc
  async deleteNote(noteId: string): Promise<void> {
    this.notes.set(this.notes.filter((n) => n.id !== noteId));
  }

  /**
   * Get a note by ID
   */
  @rpc
  async getNoteById(noteId: string): Promise<Note | null> {
    return this.notes.find((n) => n.id === noteId) || null;
  }

  /**
   * Get all notes
   */
  @rpc
  async getAllNotes(): Promise<Note[]> {
    return [...this.notes];
  }
}

// =============================================================================
// Settings Manager
// =============================================================================

export class SettingsSyncedManager extends SyncedManager {
  @synced showLiveTranscript = true;
  @synced displayName: string | null = null;

  @rpc
  async updateSettings(settings: {
    showLiveTranscript?: boolean;
    displayName?: string;
  }): Promise<void> {
    if (settings.showLiveTranscript !== undefined) {
      this.showLiveTranscript = settings.showLiveTranscript;
    }
    if (settings.displayName !== undefined) {
      this.displayName = settings.displayName;
    }
  }
}
