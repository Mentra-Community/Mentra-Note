/**
 * SEGA API Client
 *
 * Type-safe API client for the SEGA backend.
 * Provides all endpoints defined in /docs/product-spec.md
 *
 * The backend will implement these endpoints according to the design docs.
 * This client is ready before the backend is fully built.
 */

const API_BASE = "/api";

// =============================================================================
// TypeScript Types - Matching backend data models from /docs
// =============================================================================

export interface TranscriptSegment {
  timestamp: Date;
  text: string;
  speakerHint?: string;
  speakerLabel?: string;
  isFinal: boolean;
}

export interface Meeting {
  id: string;
  userId: string;
  date: string;
  startTime: Date;
  endTime?: Date;
  status: "active" | "ended" | "processing" | "complete";
  presetId?: string;
  category?: string;
  hasSensitiveContent: boolean;
  transcriptRange: {
    startIndex: number;
    endIndex?: number;
  };
  detectedParticipants: string[];
  noteId?: string;
  researchIds: string[];
}

export interface Note {
  id: string;
  userId: string;
  meetingId?: string;
  date: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  type: "ai_generated" | "manual";
  summary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  isSensitive: boolean;
  isStarred: boolean;
}

export interface ActionItem {
  id: string;
  userId: string;
  task: string;
  priority: "low" | "medium" | "high";
  owner: string;
  dueDate?: Date;
  status: "todo" | "in_progress" | "done";
  sourceMeetingId?: string;
  sourceNoteId?: string;
}

export interface ResearchResult {
  id: string;
  userId: string;
  query: string;
  queryType: "person" | "company" | "topic" | "general";
  triggerType: "automatic" | "explicit";
  meetingId?: string;
  status: "pending" | "in_progress" | "complete" | "failed";
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    content?: string;
  }>;
  summary?: string;
}

export interface MeetingPreset {
  id: string;
  userId: string;
  name: string;
  condition: string;
  category: string;
  isActive: boolean;
  userContext: string;
  noteRules: {
    detailLevel: "minimal" | "standard" | "detailed";
    captureDecisions: boolean;
    captureActionItems: boolean;
    customInstructions?: string;
  };
  researchTriggers: {
    autoResearchAttendees: boolean;
    autoResearchCompanies: boolean;
    autoResearchTopics: boolean;
    customTriggers?: string[];
  };
}

export interface UserSettings {
  autonomyLevel: "capture_only" | "suggest" | "act_with_constraints";
  showTranscriptOnGlasses: boolean;
  emailSummaries: boolean;
  emailAddress?: string;
}

export interface AppState {
  isRecording: boolean;
  meetingState:
    | "idle"
    | "meeting_detected"
    | "meeting_active"
    | "meeting_ended"
    | "processing";
  currentMeetingId?: string;
  hasActiveSession?: boolean;
}

// =============================================================================
// API Client Class
// =============================================================================

class APIClient {
  private userId: string | null = null;

  /**
   * Set the userId for API requests (used when cookie auth doesn't work)
   */
  setUserId(userId: string | null) {
    this.userId = userId;
    console.log(`[API Client] userId set to: ${userId}`);
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    console.log(`[API Client] ${options?.method || "GET"} ${url}`);

    // Build headers with optional userId for auth bypass
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    // Add userId header if available (bypasses cookie auth)
    if (this.userId) {
      headers["X-User-Id"] = this.userId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Still try cookies as fallback
    });

    console.log(
      `[API Client] Response: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Client] Error: ${response.status} - ${errorText}`);
      const error = new Error(`API Error ${response.status}: ${errorText}`);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      throw error;
    }

    const data = await response.json();
    console.log(`[API Client] Data:`, data);
    return data as T;
  }

  // ===========================================================================
  // Transcript Endpoints
  // ===========================================================================

  async getTranscriptToday(): Promise<TranscriptSegment[]> {
    const result = await this.fetch<{ segments: TranscriptSegment[] }>(
      "/transcript/today",
    );
    return result.segments || [];
  }

  async getTranscriptByDate(date: string): Promise<TranscriptSegment[]> {
    const result = await this.fetch<{ segments: TranscriptSegment[] }>(
      `/transcript/${date}`,
    );
    return result.segments || [];
  }

  async getTranscriptRange(
    date: string,
    start: number,
    end: number,
  ): Promise<TranscriptSegment[]> {
    const result = await this.fetch<{ segments: TranscriptSegment[] }>(
      `/transcript/${date}/range?start=${start}&end=${end}`,
    );
    return result.segments || [];
  }

  // ===========================================================================
  // Meeting Endpoints
  // ===========================================================================

  async getMeetings(filters?: {
    date?: string;
    status?: string;
  }): Promise<Meeting[]> {
    const params = new URLSearchParams(filters as any);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return this.fetch<Meeting[]>(`/meetings${queryString}`);
  }

  async getMeeting(id: string): Promise<Meeting> {
    return this.fetch<Meeting>(`/meetings/${id}`);
  }

  async endMeeting(id: string): Promise<Meeting> {
    return this.fetch<Meeting>(`/meetings/${id}/end`, { method: "POST" });
  }

  async processMeeting(id: string): Promise<Meeting> {
    return this.fetch<Meeting>(`/meetings/${id}/process`, { method: "POST" });
  }

  // ===========================================================================
  // Notes Endpoints
  // ===========================================================================

  async getNotes(filters?: { date?: string }): Promise<Note[]> {
    const params = new URLSearchParams(filters as any);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return this.fetch<Note[]>(`/notes${queryString}`);
  }

  async getNote(id: string): Promise<Note> {
    return this.fetch<Note>(`/notes/${id}`);
  }

  async getNotesByDate(date: string): Promise<Note[]> {
    return this.getNotes({ date });
  }

  async getNotesByMeeting(meetingId: string): Promise<Note | null> {
    try {
      return await this.fetch<Note>(`/notes/meeting/${meetingId}`);
    } catch {
      return null;
    }
  }

  async createNote(data: {
    content: string;
    meetingId?: string;
  }): Promise<Note> {
    return this.fetch<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, data: Partial<Note>): Promise<Note> {
    return this.fetch<Note>(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async regenerateNotes(id: string): Promise<Note> {
    return this.fetch<Note>(`/notes/${id}/generate-summary`, {
      method: "POST",
    });
  }

  async emailNote(id: string, recipient?: string): Promise<void> {
    await this.fetch(`/notes/${id}/email`, {
      method: "POST",
      body: JSON.stringify({ recipient }),
    });
  }

  // ===========================================================================
  // Action Items Endpoints
  // ===========================================================================

  async getActionItems(filters?: {
    status?: string;
    priority?: string;
    date?: string;
  }): Promise<ActionItem[]> {
    const params = new URLSearchParams(filters as any);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return this.fetch<ActionItem[]>(`/actions${queryString}`);
  }

  async getActionItem(id: string): Promise<ActionItem> {
    return this.fetch<ActionItem>(`/actions/${id}`);
  }

  async createActionItem(
    data: Omit<ActionItem, "id" | "userId">,
  ): Promise<ActionItem> {
    return this.fetch<ActionItem>("/actions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateActionItem(
    id: string,
    updates: Partial<ActionItem>,
  ): Promise<ActionItem> {
    return this.fetch<ActionItem>(`/actions/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteActionItem(id: string): Promise<void> {
    await this.fetch(`/actions/${id}`, { method: "DELETE" });
  }

  // ===========================================================================
  // Research Endpoints
  // ===========================================================================

  async startResearch(data: {
    query: string;
    type?: "person" | "company" | "topic" | "general";
    meetingId?: string;
  }): Promise<ResearchResult> {
    return this.fetch<ResearchResult>("/research", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getResearch(id: string): Promise<ResearchResult> {
    return this.fetch<ResearchResult>(`/research/${id}`);
  }

  async getResearchByMeeting(meetingId: string): Promise<ResearchResult[]> {
    return this.fetch<ResearchResult[]>(`/research/meeting/${meetingId}`);
  }

  async emailResearch(id: string, recipient?: string): Promise<void> {
    await this.fetch(`/research/${id}/email`, {
      method: "POST",
      body: JSON.stringify({ recipient }),
    });
  }

  // ===========================================================================
  // Settings Endpoints
  // ===========================================================================

  async getSettings(): Promise<UserSettings> {
    return this.fetch<UserSettings>("/settings");
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.fetch<UserSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  // ===========================================================================
  // Presets Endpoints
  // ===========================================================================

  async getPresets(): Promise<MeetingPreset[]> {
    return this.fetch<MeetingPreset[]>("/presets");
  }

  async getActivePresets(): Promise<MeetingPreset[]> {
    return this.fetch<MeetingPreset[]>("/presets?active=true");
  }

  async getPreset(id: string): Promise<MeetingPreset> {
    return this.fetch<MeetingPreset>(`/presets/${id}`);
  }

  async createPreset(
    preset: Omit<MeetingPreset, "id" | "userId">,
  ): Promise<MeetingPreset> {
    return this.fetch<MeetingPreset>("/presets", {
      method: "POST",
      body: JSON.stringify(preset),
    });
  }

  async updatePreset(
    id: string,
    updates: Partial<MeetingPreset>,
  ): Promise<MeetingPreset> {
    return this.fetch<MeetingPreset>(`/presets/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deletePreset(id: string): Promise<void> {
    await this.fetch(`/presets/${id}`, { method: "DELETE" });
  }

  // ===========================================================================
  // Sensitive Topics Endpoints
  // ===========================================================================

  async getSensitiveTopics(): Promise<Array<{ id: string; keyword: string }>> {
    return this.fetch<Array<{ id: string; keyword: string }>>(
      "/sensitive-topics",
    );
  }

  async addSensitiveTopic(
    keyword: string,
  ): Promise<{ id: string; keyword: string }> {
    return this.fetch<{ id: string; keyword: string }>("/sensitive-topics", {
      method: "POST",
      body: JSON.stringify({ keyword }),
    });
  }

  async removeSensitiveTopic(id: string): Promise<void> {
    await this.fetch(`/sensitive-topics/${id}`, { method: "DELETE" });
  }

  // ===========================================================================
  // State Endpoints
  // ===========================================================================

  async getState(): Promise<AppState> {
    return this.fetch<AppState>("/state");
  }

  async startRecording(): Promise<AppState> {
    return this.fetch<AppState>("/state/recording/start", { method: "POST" });
  }

  async stopRecording(): Promise<AppState> {
    return this.fetch<AppState>("/state/recording/stop", { method: "POST" });
  }

  async toggleGlassesTranscript(enabled: boolean): Promise<void> {
    await this.fetch("/state/glasses/transcript", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  }

  // ===========================================================================
  // Health & Info Endpoints
  // ===========================================================================

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.fetch<{ status: string; timestamp: string }>("/health");
  }

  async getMe(): Promise<{ authenticated: boolean; userId?: string }> {
    return this.fetch<{ authenticated: boolean; userId?: string }>("/me");
  }
}

// =============================================================================
// Export singleton instance
// =============================================================================

export const api = new APIClient();
