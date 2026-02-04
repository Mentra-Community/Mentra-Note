/**
 * Shared Synced Types for SEGA
 *
 * These types define the contract between backend and frontend.
 * Import these on both sides for full type safety.
 */

import type {
  TranscriptSegment,
  Meeting,
  Note,
  ActionItem,
  ResearchResult,
  MeetingCategory,
  SessionState,
  AutonomyLevel,
} from "../app/session/types";

// Re-export for convenience
export type {
  TranscriptSegment,
  Meeting,
  Note,
  ActionItem,
  ResearchResult,
  MeetingCategory,
  SessionState,
  AutonomyLevel,
};

// =============================================================================
// Manager Interfaces (State + RPCs)
// =============================================================================

export interface TranscriptManagerI {
  // State
  segments: TranscriptSegment[];
  currentDate: string;
  daySegmentCount: number;
  interimText: string;

  // RPCs
  getRecentText(count?: number): Promise<string>;
  getTodayFullText(): Promise<string>;
  getRecentSegments(
    count?: number,
    finalOnly?: boolean,
  ): Promise<TranscriptSegment[]>;
}

export interface MeetingManagerI {
  // State
  activeMeeting: Meeting | null;
  recentMeetings: Meeting[];
  isInMeeting: boolean;

  // RPCs
  startMeeting(title?: string, category?: MeetingCategory): Promise<Meeting>;
  endMeeting(): Promise<Meeting | null>;
  getActiveMeeting(): Promise<Meeting | null>;
  getRecentMeetings(): Promise<Meeting[]>;
}

export interface NotesManagerI {
  // State
  notes: Note[];
  generating: boolean;
  todayNotes: Note[];

  // RPCs
  generateNotes(meetingId?: string): Promise<Note | null>;
  getNoteById(noteId: string): Promise<Note | null>;
  getNotesForMeeting(meetingId: string): Promise<Note[]>;
  getAllNotes(): Promise<Note[]>;
}

export interface ActionItemsManagerI {
  // State
  actionItems: ActionItem[];

  // RPCs
  getActionItems(): Promise<ActionItem[]>;
  updateActionItem(
    actionId: string,
    updates: { status?: string; description?: string },
  ): Promise<ActionItem | null>;
  createActionItem(item: {
    description: string;
    assignee?: string;
    priority?: string;
    dueDate?: Date;
    meetingId?: string;
  }): Promise<ActionItem>;
}

export interface ResearchManagerI {
  // State
  activeResearch: ResearchResult | null;
  recentResults: ResearchResult[];
  researching: boolean;

  // RPCs
  startResearch(
    query: string,
    type?: "person" | "company" | "topic" | "general",
  ): Promise<ResearchResult>;
}

export interface SettingsManagerI {
  // State
  autonomyLevel: AutonomyLevel;
  showLiveTranscript: boolean;
  email: string | null;
  displayName: string | null;

  // RPCs
  updateSettings(settings: {
    autonomyLevel?: AutonomyLevel;
    showLiveTranscript?: boolean;
    email?: string;
    displayName?: string;
  }): Promise<void>;
  getAutonomyLevel(): Promise<AutonomyLevel>;
  isLiveTranscriptEnabled(): Promise<boolean>;
}

export interface DisplayManagerI {
  // State
  transcriptEnabled: boolean;
  hudText: string;

  // RPCs
  enableTranscript(): Promise<void>;
  disableTranscript(): Promise<void>;
  showMessage(text: string, duration?: number): Promise<void>;
  showStatus(text: string): Promise<void>;
}

export interface AgentManagerI {
  // State
  sessionState: SessionState;
  lastAnalysisAt: Date | null;
}

// =============================================================================
// Session Interface
// =============================================================================

export interface SessionI {
  userId: string;

  // Top-level convenience state
  isRecording: boolean;
  hasActiveSession: boolean;
  hasGlassesConnected: boolean;

  // Manager state and RPCs
  transcript: TranscriptManagerI;
  meeting: MeetingManagerI;
  notes: NotesManagerI;
  actionItems: ActionItemsManagerI;
  research: ResearchManagerI;
  settings: SettingsManagerI;
  display: DisplayManagerI;
  agent: AgentManagerI;
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

export type WSMessageToClient =
  | { type: "connected" }
  | { type: "waiting"; message: string }
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
