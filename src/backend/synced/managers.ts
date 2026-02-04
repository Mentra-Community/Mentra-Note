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
  appendTranscriptSegments,
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
