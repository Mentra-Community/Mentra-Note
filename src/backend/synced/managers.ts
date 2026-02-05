/**
 * Notes App Synced Managers
 *
 * Uses the decorator-based sync API:
 * - @synced on properties for synced state
 * - synced<T>() helper for typed array/object initialization
 * - @rpc on methods for frontend-callable functions
 * - No constructor needed - @manager decorator handles wiring
 */

import { SyncedManager, synced, rpc, type Synced } from "../../lib/sync";
import {
  getOrCreateDailyTranscript,
  getDailyTranscript,
  getAvailableDates,
  appendTranscriptSegments,
  saveHourSummary,
  getHourSummaries,
  Note as NoteModel,
  type ITranscriptSegment,
} from "../services/db";
import {
  createProviderFromEnv,
  isProviderAvailable,
  type AgentProvider,
  type UnifiedMessage,
} from "../services/llm";

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

export interface HourSummary {
  id: string;
  date: string; // YYYY-MM-DD in user's timezone
  hour: number; // 0-23
  hourLabel: string; // "9 AM", "2 PM", etc.
  summary: string; // AI-generated 1-2 sentence summary
  segmentCount: number;
  createdAt: Date;
  updatedAt: Date;
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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// =============================================================================
// Transcript Manager
// =============================================================================

export class TranscriptSyncedManager extends SyncedManager {
  @synced segments = synced<TranscriptSegment[]>([]);
  @synced interimText = "";
  @synced isRecording = false;
  @synced hourSummaries = synced<HourSummary[]>([]);
  @synced currentHourSummary = ""; // Rolling summary for glasses display
  @synced loadedDate = ""; // Currently loaded date (YYYY-MM-DD)
  @synced availableDates = synced<string[]>([]); // Dates with transcripts
  @synced isLoadingHistory = false; // Loading indicator for historical data

  private segmentIndex = 0;
  private provider: AgentProvider | null = null;
  private pendingSegments: ITranscriptSegment[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private rollingSummaryTimer: ReturnType<typeof setInterval> | null = null;
  private lastSummaryHour: number = -1;
  private lastSummarySegmentCount: number = 0;

  /**
   * Get today's date string in local timezone (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  /**
   * Get AI provider for generating summaries
   */
  private getProvider(): AgentProvider {
    if (!this.provider) {
      this.provider = createProviderFromEnv();
    }
    return this.provider;
  }

  /**
   * Format hour number to label (e.g., 9 -> "9 AM", 14 -> "2 PM")
   */
  private formatHourLabel(hour: number): string {
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12} ${ampm}`;
  }

  /**
   * Load today's transcript from DB and start rolling summary timer
   */
  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const today = this.getTodayDate();
      this.loadedDate = today;

      // Load available dates for folder list
      const dates = await getAvailableDates(userId, 90);
      this.availableDates.set(dates);

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

      // Load saved hour summaries for today
      const savedSummaries = await getHourSummaries(userId, today);
      if (savedSummaries.length > 0) {
        const loadedSummaries: HourSummary[] = savedSummaries.map((s) => ({
          id: `summary_${s.date}_${s.hour}`,
          date: s.date,
          hour: s.hour,
          hourLabel: s.hourLabel,
          summary: s.summary,
          segmentCount: s.segmentCount,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        this.hourSummaries.set(loadedSummaries);
        console.log(
          `[TranscriptManager] Loaded ${loadedSummaries.length} hour summaries for ${userId}`,
        );
      }

      // Start the rolling summary timer
      this.startRollingSummaryTimer();
    } catch (error) {
      console.error("[TranscriptManager] Failed to hydrate:", error);
    }
  }

  /**
   * Start the rolling summary timer (runs every 5 minutes)
   * Generates/updates hour summary if there are new segments
   */
  private startRollingSummaryTimer(): void {
    if (this.rollingSummaryTimer) return;

    // Run immediately on start, then every 5 minutes
    this.updateRollingSummary();

    this.rollingSummaryTimer = setInterval(
      () => {
        this.updateRollingSummary();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    console.log("[TranscriptManager] Rolling summary timer started");
  }

  /**
   * Stop the rolling summary timer
   */
  private stopRollingSummaryTimer(): void {
    if (this.rollingSummaryTimer) {
      clearInterval(this.rollingSummaryTimer);
      this.rollingSummaryTimer = null;
      console.log("[TranscriptManager] Rolling summary timer stopped");
    }
  }

  /**
   * Update the rolling hour summary if there are new segments
   */
  private async updateRollingSummary(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const today = this.getTodayDate();

    // Get segments for the current hour
    const hourSegments = this.segments.filter((seg) => {
      const segDate = new Date(seg.timestamp);
      const segDateStr = `${segDate.getFullYear()}-${String(segDate.getMonth() + 1).padStart(2, "0")}-${String(segDate.getDate()).padStart(2, "0")}`;
      return segDateStr === today && segDate.getHours() === currentHour;
    });

    // Check if we need to update:
    // 1. Hour changed
    // 2. Segment count increased significantly (5+ new segments)
    const hourChanged = currentHour !== this.lastSummaryHour;
    const significantNewSegments =
      hourSegments.length >= this.lastSummarySegmentCount + 5;

    if (hourSegments.length === 0) {
      // No segments this hour - set a default message
      if (hourChanged) {
        this.currentHourSummary = `${this.formatHourLabel(currentHour)} - Waiting for activity...`;
        this.lastSummaryHour = currentHour;
        this.lastSummarySegmentCount = 0;
      }
      return;
    }

    if (!hourChanged && !significantNewSegments) {
      // No significant change, skip update
      return;
    }

    console.log(
      `[TranscriptManager] Updating rolling summary for ${this.formatHourLabel(currentHour)} (${hourSegments.length} segments)`,
    );

    try {
      // Generate summary for current hour
      const summary = await this.generateHourSummary(currentHour);
      this.currentHourSummary = summary.summary;
      this.lastSummaryHour = currentHour;
      this.lastSummarySegmentCount = hourSegments.length;

      console.log(
        `[TranscriptManager] Rolling summary updated: "${summary.summary.substring(0, 50)}..."`,
      );
    } catch (error) {
      console.error(
        "[TranscriptManager] Failed to update rolling summary:",
        error,
      );
      // Set a fallback summary
      this.currentHourSummary = `${this.formatHourLabel(currentHour)} - ${hourSegments.length} segments recorded`;
    }
  }

  /**
   * Get the current hour summary (for glasses display)
   */
  getCurrentHourSummary(): string {
    if (this.currentHourSummary) {
      return this.currentHourSummary;
    }
    // Fallback if no summary yet
    const hour = new Date().getHours();
    return `${this.formatHourLabel(hour)} - Starting...`;
  }

  /**
   * Force an immediate refresh of the rolling hour summary
   * Useful when user wants the latest summary right now
   */
  @rpc
  async refreshHourSummary(): Promise<string> {
    await this.updateRollingSummary();
    return this.currentHourSummary;
  }

  /**
   * Load transcript for a specific date (for viewing historical days)
   * Returns the segments for that date without affecting the current recording
   */
  @rpc
  async loadDateTranscript(
    date: string,
  ): Promise<{ segments: TranscriptSegment[]; hourSummaries: HourSummary[] }> {
    const userId = this._session?.userId;
    if (!userId) {
      return { segments: [], hourSummaries: [] };
    }

    const today = this.getTodayDate();

    // If requesting today, just return current segments
    if (date === today) {
      this.loadedDate = today;
      return {
        segments: [...this.segments],
        hourSummaries: [...this.hourSummaries],
      };
    }

    this.isLoadingHistory = true;

    try {
      console.log(
        `[TranscriptManager] Loading historical transcript for ${date}`,
      );

      const transcript = await getDailyTranscript(userId, date);

      if (!transcript || transcript.segments.length === 0) {
        console.log(`[TranscriptManager] No transcript found for ${date}`);
        this.loadedDate = date;
        this.isLoadingHistory = false;
        return { segments: [], hourSummaries: [] };
      }

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

      console.log(
        `[TranscriptManager] Loaded ${loadedSegments.length} segments for ${date}`,
      );

      // Load saved hour summaries for this date
      const savedSummaries = await getHourSummaries(userId, date);
      const loadedSummaries: HourSummary[] = savedSummaries.map((s) => ({
        id: `summary_${s.date}_${s.hour}`,
        date: s.date,
        hour: s.hour,
        hourLabel: s.hourLabel,
        summary: s.summary,
        segmentCount: s.segmentCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

      // Update state with historical data
      this.segments.set(loadedSegments);
      this.loadedDate = date;
      this.hourSummaries.set(loadedSummaries);
      this.isLoadingHistory = false;

      console.log(
        `[TranscriptManager] Loaded ${loadedSummaries.length} hour summaries for ${date}`,
      );

      return {
        segments: loadedSegments,
        hourSummaries: loadedSummaries,
      };
    } catch (error) {
      console.error(
        `[TranscriptManager] Failed to load transcript for ${date}:`,
        error,
      );
      this.isLoadingHistory = false;
      throw error;
    }
  }

  /**
   * Switch back to today's transcript (after viewing history)
   */
  @rpc
  async loadTodayTranscript(): Promise<void> {
    const today = this.getTodayDate();
    if (this.loadedDate === today) return;

    // Re-hydrate to load today's data
    await this.hydrate();
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
      index: this.segmentIndex,
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

  /**
   * Stop recording state (called when glasses disconnect)
   */
  stopRecording(): void {
    this.isRecording = false;
    this.interimText = "";
    // Don't stop the rolling summary timer - we may want to keep updating
    // summaries even when glasses are disconnected (for webview users)
  }

  /**
   * Clean up resources when session is destroyed
   */
  destroy(): void {
    this.stopRollingSummaryTimer();
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  @rpc
  async clear(): Promise<void> {
    this.segments.set([]);
    this.interimText = "";
    this.segmentIndex = 0;
    this.hourSummaries.set([]);
    this.currentHourSummary = "";
    this.lastSummaryHour = -1;
    this.lastSummarySegmentCount = 0;
  }

  /**
   * Generate a summary for a specific hour (or current hour if not specified)
   * Uses loadedDate to support both today and historical dates
   */
  @rpc
  async generateHourSummary(hour?: number): Promise<HourSummary> {
    const now = new Date();
    const targetHour = hour ?? now.getHours();
    // Use loadedDate (supports historical) or fall back to today
    const targetDate = this.loadedDate || this.getTodayDate();

    // Get segments for this hour on the target date
    const hourSegments = this.segments.filter((seg) => {
      const segDate = new Date(seg.timestamp);
      const segDateStr = `${segDate.getFullYear()}-${String(segDate.getMonth() + 1).padStart(2, "0")}-${String(segDate.getDate()).padStart(2, "0")}`;
      return segDateStr === targetDate && segDate.getHours() === targetHour;
    });

    if (hourSegments.length === 0) {
      const summary: HourSummary = {
        id: `summary_${targetDate}_${targetHour}`,
        date: targetDate,
        hour: targetHour,
        hourLabel: this.formatHourLabel(targetHour),
        summary: "No activity recorded during this hour.",
        segmentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return summary;
    }

    // Build transcript text for this hour
    const transcriptText = hourSegments.map((s) => s.text).join(" ");

    // Generate summary via AI
    const provider = this.getProvider();
    const messages: UnifiedMessage[] = [
      {
        role: "user",
        content: `Summarize this hour's activity:\n\n${transcriptText}`,
      },
    ];

    try {
      const response = await provider.chat(messages, {
        tier: "fast",
        maxTokens: 200,
        systemPrompt: `You write hour summaries for a personal notes app. Output a TITLE on line 1, then a BODY on line 2.

FORMAT:
Line 1: Short title (2-4 words, noun phrase, no punctuation)
Line 2: 1-2 sentences in PAST TENSE describing what happened. Be specific and punchy.

RULES:
- Title is a noun phrase like "Product Launch Sync" or "Bug Fixes"
- Body uses past tense: "Fixed", "Debugged", "Reviewed", "Discussed"
- NO filler: skip "also", "additionally", "as well"
- Include specific names, numbers, technical terms mentioned
- Keep body under 150 characters

EXAMPLES:

Input: "We talked about the new login flow and how the button should be blue, then moved on to discussing the API rate limits"
Output:
Login Flow Redesign
Changed button color to blue. Addressed API rate limit concerns for new endpoints.

Input: "John mentioned the server is down, Sarah said she'll look into the database issues, we also need to update the docs"
Output:
Server Outage
Server went down. Sarah investigating database issues. Docs need updating.

Input: "debugging the frame pacing on android and the keyboard resize bugs, also looked at location permissions"
Output:
Android Debugging
Fixed frame pacing and keyboard resize bugs. Investigated location permission issues.`,
      });

      // Handle response content (may be string or array)
      const responseText =
        typeof response.content === "string"
          ? response.content
          : response.content
              .filter((c) => c.type === "text")
              .map((c) => (c as any).text)
              .join("");

      const summary: HourSummary = {
        id: `summary_${targetDate}_${targetHour}`,
        date: targetDate,
        hour: targetHour,
        hourLabel: this.formatHourLabel(targetHour),
        summary: responseText,
        segmentCount: hourSegments.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Persist to database
      const userId = this._session?.userId;
      if (userId) {
        try {
          await saveHourSummary(
            userId,
            targetDate,
            targetHour,
            summary.hourLabel,
            summary.summary,
            summary.segmentCount,
          );
          console.log(
            `[TranscriptManager] Saved hour summary to DB for ${targetDate} ${summary.hourLabel}`,
          );
        } catch (err) {
          console.error(
            "[TranscriptManager] Failed to save hour summary:",
            err,
          );
        }
      }

      // Update or add to hourSummaries
      this.hourSummaries.mutate((summaries) => {
        const existingIndex = summaries.findIndex(
          (s) => s.date === targetDate && s.hour === targetHour,
        );
        if (existingIndex >= 0) {
          summaries[existingIndex] = summary;
        } else {
          summaries.push(summary);
        }
      });

      console.log(
        `[TranscriptManager] Generated hour summary for ${this.formatHourLabel(targetHour)}: ${responseText.substring(0, 50)}...`,
      );

      return summary;
    } catch (error) {
      console.error(
        "[TranscriptManager] Failed to generate hour summary:",
        error,
      );
      throw error;
    }
  }
}

// =============================================================================
// Notes Manager
// =============================================================================

export class NotesSyncedManager extends SyncedManager {
  @synced notes = synced<Note[]>([]);
  @synced generating = false;

  private provider: AgentProvider | null = null;

  /**
   * Get or create the AI provider
   */
  private getProvider(): AgentProvider | null {
    if (this.provider) return this.provider;

    if (!isProviderAvailable("gemini") && !isProviderAvailable("anthropic")) {
      console.warn("[NotesManager] No AI provider available");
      return null;
    }

    try {
      this.provider = createProviderFromEnv();
      return this.provider;
    } catch (error) {
      console.error("[NotesManager] Failed to create AI provider:", error);
      return null;
    }
  }

  /**
   * Load notes from DB
   */
  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const dbNotes = await NoteModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(100);

      if (dbNotes.length > 0) {
        const loadedNotes: Note[] = dbNotes.map((n) => ({
          id: n._id?.toString() || `note_${Date.now()}`,
          title: n.title,
          content: n.content || n.summary || "",
          summary: n.summary,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        }));

        this.notes.set(loadedNotes);
        console.log(
          `[NotesManager] Hydrated ${loadedNotes.length} notes for ${userId}`,
        );
      }
    } catch (error) {
      console.error("[NotesManager] Failed to hydrate:", error);
    }
  }

  /**
   * Save a note to DB
   */
  private async persistNote(note: Note): Promise<string> {
    const userId = this._session?.userId;
    if (!userId) return note.id;

    try {
      const dbNote = await NoteModel.create({
        userId,
        title: note.title,
        summary: note.summary || "",
        content: note.content,
        keyPoints: [],
        decisions: [],
        detailLevel: "standard",
        isStarred: false,
      });

      return dbNote._id?.toString() || note.id;
    } catch (error) {
      console.error("[NotesManager] Failed to persist note:", error);
      return note.id;
    }
  }

  /**
   * Update a note in DB
   */
  private async persistNoteUpdate(
    noteId: string,
    updates: Partial<Note>,
  ): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      await NoteModel.findOneAndUpdate(
        { _id: noteId, userId },
        {
          $set: {
            title: updates.title,
            summary: updates.summary,
            content: updates.content,
            updatedAt: new Date(),
          },
        },
      );
    } catch (error) {
      console.error("[NotesManager] Failed to update note in DB:", error);
    }
  }

  /**
   * Delete a note from DB
   */
  private async persistNoteDelete(noteId: string): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      await NoteModel.deleteOne({ _id: noteId, userId });
    } catch (error) {
      console.error("[NotesManager] Failed to delete note from DB:", error);
    }
  }

  /**
   * Generate a note from transcript using AI
   */
  @rpc
  async generateNote(
    title?: string,
    startTime?: Date | string,
    endTime?: Date | string,
  ): Promise<Note> {
    this.generating = true;

    // Convert string dates to Date objects (WebSocket serializes dates as strings)
    const startDate = startTime
      ? typeof startTime === "string"
        ? new Date(startTime)
        : startTime
      : undefined;
    const endDate = endTime
      ? typeof endTime === "string"
        ? new Date(endTime)
        : endTime
      : undefined;

    try {
      // Get transcript context from session
      const transcriptManager = (this._session as any)?.transcript;
      const segments: TranscriptSegment[] = transcriptManager?.segments ?? [];

      // Filter segments by time range if provided
      let relevantSegments = segments;
      if (startDate || endDate) {
        relevantSegments = segments.filter((seg) => {
          const segTime = new Date(seg.timestamp).getTime();
          const afterStart = !startDate || segTime >= startDate.getTime();
          const beforeEnd = !endDate || segTime <= endDate.getTime();
          return afterStart && beforeEnd;
        });
      }

      const transcriptText = relevantSegments.map((s) => s.text).join(" ");

      if (!transcriptText.trim()) {
        throw new Error("No transcript content to generate note from");
      }

      // Try to generate summary with AI
      let summary = "";
      let generatedTitle = title;

      const provider = this.getProvider();
      if (provider && transcriptText.length > 50) {
        try {
          const messages: UnifiedMessage[] = [
            {
              role: "user",
              content: `Please analyze this transcript and provide:
1. A concise title (if not provided)
2. A clear summary (2-3 paragraphs max)

Transcript:
${transcriptText}

${title ? `Use this title: "${title}"` : "Generate an appropriate title based on the content."}

Respond in this exact format:
TITLE: [title here]
SUMMARY: [summary here]`,
            },
          ];

          const response = await provider.chat(messages, {
            tier: "fast",
            maxTokens: 1024,
            systemPrompt:
              "You are a helpful assistant that creates clear, concise notes from transcripts. Focus on key points and actionable information.",
          });

          const responseText =
            typeof response.content === "string"
              ? response.content
              : response.content
                  .filter((c) => c.type === "text")
                  .map((c) => (c as any).text)
                  .join("");

          // Parse response
          const titleMatch = responseText.match(
            /TITLE:\s*(.+?)(?:\n|SUMMARY:)/s,
          );
          const summaryMatch = responseText.match(/SUMMARY:\s*(.+)/s);

          if (titleMatch && !title) {
            generatedTitle = titleMatch[1].trim();
          }
          if (summaryMatch) {
            summary = summaryMatch[1].trim();
          }
        } catch (error) {
          console.error("[NotesManager] AI generation failed:", error);
          // Fall back to simple summary
          summary =
            transcriptText.length > 500
              ? transcriptText.substring(0, 500) + "..."
              : transcriptText;
        }
      } else {
        // No AI available, use simple truncation
        summary =
          transcriptText.length > 500
            ? transcriptText.substring(0, 500) + "..."
            : transcriptText;
      }

      const now = new Date();
      const note: Note = {
        id: `note_${Date.now()}`,
        title: generatedTitle || `Note - ${now.toLocaleTimeString()}`,
        content: transcriptText,
        summary: summary || transcriptText.substring(0, 200),
        createdAt: now,
        updatedAt: now,
        transcriptRange:
          startDate && endDate
            ? { startTime: startDate, endTime: endDate }
            : relevantSegments.length > 0
              ? {
                  startTime: new Date(relevantSegments[0].timestamp),
                  endTime: new Date(
                    relevantSegments[relevantSegments.length - 1].timestamp,
                  ),
                }
              : undefined,
      };

      // Persist to DB and update ID
      const dbId = await this.persistNote(note);
      note.id = dbId;

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
      summary:
        content.length > 200 ? content.substring(0, 200) + "..." : content,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to DB and update ID
    const dbId = await this.persistNote(note);
    note.id = dbId;

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

    // Persist to DB
    await this.persistNoteUpdate(noteId, updates);

    return updatedNote;
  }

  /**
   * Delete a note
   */
  @rpc
  async deleteNote(noteId: string): Promise<void> {
    this.notes.set(this.notes.filter((n) => n.id !== noteId));
    await this.persistNoteDelete(noteId);
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
// Chat Manager
// =============================================================================

export class ChatSyncedManager extends SyncedManager {
  @synced messages = synced<ChatMessage[]>([]);
  @synced isTyping = false;

  private provider: AgentProvider | null = null;

  /**
   * Get or create the AI provider
   */
  private getProvider(): AgentProvider | null {
    if (this.provider) return this.provider;

    if (!isProviderAvailable("gemini") && !isProviderAvailable("anthropic")) {
      console.warn("[ChatManager] No AI provider available");
      return null;
    }

    try {
      this.provider = createProviderFromEnv();
      return this.provider;
    } catch (error) {
      console.error("[ChatManager] Failed to create AI provider:", error);
      return null;
    }
  }

  /**
   * Build context from transcripts and notes
   */
  private getContext(): string {
    const transcriptManager = (this._session as any)?.transcript;
    const notesManager = (this._session as any)?.notes;

    const segments: TranscriptSegment[] = transcriptManager?.segments ?? [];
    const notes: Note[] = notesManager?.notes ?? [];

    let context = "";

    // Add recent transcript (last 50 segments)
    if (segments.length > 0) {
      const recentSegments = segments.slice(-50);
      const transcriptText = recentSegments.map((s) => s.text).join(" ");
      context += `## Recent Transcript\n${transcriptText}\n\n`;
    }

    // Add recent notes (last 5)
    if (notes.length > 0) {
      const recentNotes = notes.slice(0, 5);
      context += `## Recent Notes\n`;
      recentNotes.forEach((note) => {
        context += `### ${note.title}\n${note.summary || note.content}\n\n`;
      });
    }

    return context;
  }

  /**
   * Send a message and get AI response
   */
  @rpc
  async sendMessage(content: string): Promise<ChatMessage> {
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    this.messages.mutate((m) => m.push(userMessage));

    // Check for AI provider
    const provider = this.getProvider();
    if (!provider) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content:
          "I'm sorry, but AI chat is not available. Please configure an AI provider (GEMINI_API_KEY or ANTHROPIC_API_KEY).",
        timestamp: new Date(),
      };
      this.messages.mutate((m) => m.push(errorMessage));
      return errorMessage;
    }

    this.isTyping = true;

    try {
      // Build context
      const context = this.getContext();

      // Build conversation history (last 10 messages)
      const recentMessages = this.messages.slice(-10);
      const conversationHistory: UnifiedMessage[] = recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add current message with context
      const messagesForAI: UnifiedMessage[] = [
        ...conversationHistory.slice(0, -1), // Previous messages
        {
          role: "user" as const,
          content: `${context ? `Context:\n${context}\n\n` : ""}User question: ${content}`,
        },
      ];

      const response = await provider.chat(messagesForAI, {
        tier: "fast",
        maxTokens: 2048,
        systemPrompt: `You are a helpful assistant for a notes app. You have access to the user's recent transcripts and notes.

Your role is to:
- Answer questions about the user's transcripts and notes
- Help summarize or find information in the recorded content
- Provide helpful suggestions based on what was discussed
- Be concise but thorough

If you don't have enough context to answer a question, say so and ask for clarification.`,
      });

      const responseText =
        typeof response.content === "string"
          ? response.content
          : response.content
              .filter((c) => c.type === "text")
              .map((c) => (c as any).text)
              .join("");

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      this.messages.mutate((m) => m.push(assistantMessage));
      return assistantMessage;
    } catch (error) {
      console.error("[ChatManager] Chat failed:", error);

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content:
          "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      this.messages.mutate((m) => m.push(errorMessage));
      return errorMessage;
    } finally {
      this.isTyping = false;
    }
  }

  /**
   * Clear chat history
   */
  @rpc
  async clearHistory(): Promise<void> {
    this.messages.set([]);
  }
}

// =============================================================================
// Settings Manager
// =============================================================================

export type GlassesDisplayMode =
  | "off" // Nothing shown on glasses
  | "live_transcript" // Real-time transcription text
  | "hour_summary" // Rolling hour description/summary
  | "key_points"; // Only show when AI detects something important

export class SettingsSyncedManager extends SyncedManager {
  @synced showLiveTranscript = true;
  @synced displayName: string | null = null;
  @synced timezone: string | null = null; // IANA timezone e.g. "America/Los_Angeles"
  @synced glassesDisplayMode: GlassesDisplayMode = "live_transcript";

  /**
   * Initialize with user's timezone from client
   */
  async hydrate(): Promise<void> {
    // Timezone will be set by client on first connect
    // Could also load from DB if we persist settings
  }

  @rpc
  async updateSettings(settings: {
    showLiveTranscript?: boolean;
    displayName?: string;
    timezone?: string;
    glassesDisplayMode?: GlassesDisplayMode;
  }): Promise<void> {
    if (settings.showLiveTranscript !== undefined) {
      this.showLiveTranscript = settings.showLiveTranscript;
    }
    if (settings.displayName !== undefined) {
      this.displayName = settings.displayName;
    }
    if (settings.timezone !== undefined) {
      this.timezone = settings.timezone;
      console.log(`[SettingsManager] Timezone set to ${settings.timezone}`);
    }
    if (settings.glassesDisplayMode !== undefined) {
      this.glassesDisplayMode = settings.glassesDisplayMode;
      console.log(
        `[SettingsManager] Glasses display mode set to ${settings.glassesDisplayMode}`,
      );
    }
  }
}
