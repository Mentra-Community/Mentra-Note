/**
 * NotesManager
 *
 * Manages user notes - both manual and AI-generated.
 * Handles note persistence to MongoDB and AI generation from transcripts.
 */

import { SyncedManager, synced, rpc } from "../../../lib/sync";
import { Note, createNote, getNotes, updateNote, deleteNote } from "../../models";
import {
  createProviderFromEnv,
  isProviderAvailable,
  type AgentProvider,
  type UnifiedMessage,
} from "../../services/llm";
import type { TranscriptSegment } from "./TranscriptManager";
import type { FileManager } from "./FileManager";

// =============================================================================
// Types
// =============================================================================

export interface NoteData {
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
// Manager
// =============================================================================

export class NotesManager extends SyncedManager {
  @synced notes = synced<NoteData[]>([]);
  @synced generating = false;

  private provider: AgentProvider | null = null;

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private getFileManager(): FileManager | null {
    return (this._session as any)?.file || null;
  }

  private getNoteDate(note: NoteData): string {
    const d = new Date(note.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

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

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const dbNotes = await getNotes(userId);

      if (dbNotes.length > 0) {
        const loadedNotes: NoteData[] = dbNotes.map((n) => ({
          id: n._id?.toString() || `note_${Date.now()}`,
          title: n.title,
          content: n.content || n.summary || "",
          summary: n.summary,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          transcriptRange: n.transcriptRange,
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

  // ===========================================================================
  // Persistence Helpers
  // ===========================================================================

  private async persistNote(note: NoteData): Promise<string> {
    const userId = this._session?.userId;
    if (!userId) return note.id;

    try {
      const dbNote = await createNote(userId, {
        title: note.title,
        summary: note.summary || "",
        content: note.content,
        transcriptRange: note.transcriptRange,
      });

      // Notify FileManager about the new note
      const fileManager = this.getFileManager();
      if (fileManager) {
        const noteDate = this.getNoteDate(note);
        await fileManager.onNoteCreated(noteDate);
      }

      return dbNote._id?.toString() || note.id;
    } catch (error) {
      console.error("[NotesManager] Failed to persist note:", error);
      return note.id;
    }
  }

  private async persistNoteUpdate(
    noteId: string,
    updates: Partial<NoteData>,
  ): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      await updateNote(userId, noteId, {
        title: updates.title,
        summary: updates.summary,
        content: updates.content,
      });
    } catch (error) {
      console.error("[NotesManager] Failed to update note in DB:", error);
    }
  }

  private async persistNoteDelete(noteId: string, noteDate: string): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      await deleteNote(userId, noteId);

      // Notify FileManager about the deleted note
      const fileManager = this.getFileManager();
      if (fileManager) {
        await fileManager.onNoteDeleted(noteDate);
      }
    } catch (error) {
      console.error("[NotesManager] Failed to delete note from DB:", error);
    }
  }

  // ===========================================================================
  // RPC Methods
  // ===========================================================================

  @rpc
  async generateNote(
    title?: string,
    startTime?: Date | string,
    endTime?: Date | string,
  ): Promise<NoteData> {
    this.generating = true;

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
          summary =
            transcriptText.length > 500
              ? transcriptText.substring(0, 500) + "..."
              : transcriptText;
        }
      } else {
        summary =
          transcriptText.length > 500
            ? transcriptText.substring(0, 500) + "..."
            : transcriptText;
      }

      const now = new Date();
      const note: NoteData = {
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

      const dbId = await this.persistNote(note);
      note.id = dbId;

      this.notes.mutate((n) => n.unshift(note));
      return note;
    } finally {
      this.generating = false;
    }
  }

  @rpc
  async createManualNote(title: string, content: string): Promise<NoteData> {
    const now = new Date();
    const note: NoteData = {
      id: `note_${Date.now()}`,
      title,
      content,
      summary:
        content.length > 200 ? content.substring(0, 200) + "..." : content,
      createdAt: now,
      updatedAt: now,
    };

    const dbId = await this.persistNote(note);
    note.id = dbId;

    this.notes.mutate((n) => n.unshift(note));
    return note;
  }

  @rpc
  async updateNote(noteId: string, updates: Partial<NoteData>): Promise<NoteData> {
    let updatedNote: NoteData | null = null;

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

    await this.persistNoteUpdate(noteId, updates);

    return updatedNote;
  }

  @rpc
  async deleteNote(noteId: string): Promise<void> {
    // Find the note first to get its date
    const note = this.notes.find((n) => n.id === noteId);
    const noteDate = note ? this.getNoteDate(note) : null;

    this.notes.set(this.notes.filter((n) => n.id !== noteId));

    if (noteDate) {
      await this.persistNoteDelete(noteId, noteDate);
    }
  }

  @rpc
  async getNoteById(noteId: string): Promise<NoteData | null> {
    return this.notes.find((n) => n.id === noteId) || null;
  }

  @rpc
  async getAllNotes(): Promise<NoteData[]> {
    return [...this.notes];
  }
}
