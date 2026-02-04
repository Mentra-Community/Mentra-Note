/**
 * Notes App Synced Types
 *
 * Shared types for frontend and backend.
 * Import these on the frontend for full type safety with useSynced().
 */

// =============================================================================
// Domain Types
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
// Manager Interfaces (State + RPCs)
// =============================================================================

export interface TranscriptManagerI {
  // State (auto-syncs)
  segments: TranscriptSegment[];
  interimText: string;
  isRecording: boolean;

  // RPCs
  getRecentSegments(count?: number): Promise<TranscriptSegment[]>;
  getFullText(): Promise<string>;
  clear(): Promise<void>;
}

export interface NotesManagerI {
  // State
  notes: Note[];
  generating: boolean;

  // RPCs
  generateNote(title?: string, startTime?: Date, endTime?: Date): Promise<Note>;
  createManualNote(title: string, content: string): Promise<Note>;
  updateNote(noteId: string, updates: Partial<Note>): Promise<Note>;
  deleteNote(noteId: string): Promise<void>;
  getNoteById(noteId: string): Promise<Note | null>;
  getAllNotes(): Promise<Note[]>;
}

export interface ChatManagerI {
  // State
  messages: ChatMessage[];
  isTyping: boolean;

  // RPCs
  sendMessage(content: string): Promise<ChatMessage>;
  clearHistory(): Promise<void>;
}

export interface SettingsManagerI {
  // State
  showLiveTranscript: boolean;
  displayName: string | null;

  // RPCs
  updateSettings(settings: {
    showLiveTranscript?: boolean;
    displayName?: string;
  }): Promise<void>;
}

// =============================================================================
// Session Interface
// =============================================================================

export interface SessionI {
  userId: string;

  // Session-level state
  hasGlassesConnected: boolean;
  hasActiveSession: boolean;
  isRecording: boolean;

  // Managers
  transcript: TranscriptManagerI;
  notes: NotesManagerI;
  chat: ChatManagerI;
  settings: SettingsManagerI;
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

export type WSMessageToClient =
  | { type: "connected" }
  | { type: "snapshot"; state: Record<string, any> }
  | { type: "state_change"; manager: string; property: string; value: any }
  | { type: "rpc_response"; id: string; result?: any; error?: string };

export type WSMessageToServer =
  | { type: "request_snapshot" }
  | {
      type: "rpc_request";
      id: string;
      manager: string;
      method: string;
      args: any[];
    };
