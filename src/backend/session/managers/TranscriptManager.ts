/**
 * TranscriptManager
 *
 * Manages transcript segments, interim text, and hour summaries.
 * Handles both real-time transcription and historical transcript loading.
 */

import { SyncedManager, synced, rpc } from "../../../lib/sync";
import {
  getOrCreateDailyTranscript,
  getDailyTranscript,
  getAvailableDates,
  appendTranscriptSegments,
  saveHourSummary,
  getHourSummaries,
  type TranscriptSegmentI,
} from "../../models";
import {
  createProviderFromEnv,
  type AgentProvider,
  type UnifiedMessage,
} from "../../services/llm";

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
  date: string;
  hour: number;
  hourLabel: string;
  summary: string;
  segmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Manager
// =============================================================================

export class TranscriptManager extends SyncedManager {
  @synced segments = synced<TranscriptSegment[]>([]);
  @synced interimText = "";
  @synced isRecording = false;
  @synced hourSummaries = synced<HourSummary[]>([]);
  @synced currentHourSummary = "";
  @synced loadedDate = "";
  @synced availableDates = synced<string[]>([]);
  @synced isLoadingHistory = false;

  private segmentIndex = 0;
  private provider: AgentProvider | null = null;
  private pendingSegments: TranscriptSegmentI[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private rollingSummaryTimer: ReturnType<typeof setInterval> | null = null;
  private lastSummaryHour: number = -1;
  private lastSummarySegmentCount: number = 0;

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private getTodayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  private getProvider(): AgentProvider {
    if (!this.provider) {
      this.provider = createProviderFromEnv();
    }
    return this.provider;
  }

  private formatHourLabel(hour: number): string {
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12} ${ampm}`;
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const today = this.getTodayDate();
      this.loadedDate = today;

      // Load available dates
      const dates = await getAvailableDates(userId);
      this.availableDates.set(dates);

      const transcript = await getOrCreateDailyTranscript(userId, today);

      if (transcript.segments && transcript.segments.length > 0) {
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

      // Load saved hour summaries
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
      }

      this.startRollingSummaryTimer();
    } catch (error) {
      console.error("[TranscriptManager] Failed to hydrate:", error);
    }
  }

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

  destroy(): void {
    this.stopRollingSummaryTimer();
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // ===========================================================================
  // Rolling Summary Timer
  // ===========================================================================

  private startRollingSummaryTimer(): void {
    if (this.rollingSummaryTimer) return;

    this.updateRollingSummary();

    this.rollingSummaryTimer = setInterval(
      () => {
        this.updateRollingSummary();
      },
      5 * 60 * 1000,
    );

    console.log("[TranscriptManager] Rolling summary timer started");
  }

  private stopRollingSummaryTimer(): void {
    if (this.rollingSummaryTimer) {
      clearInterval(this.rollingSummaryTimer);
      this.rollingSummaryTimer = null;
    }
  }

  private async updateRollingSummary(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();
    const today = this.getTodayDate();

    const hourSegments = this.segments.filter((seg) => {
      const segDate = new Date(seg.timestamp);
      const segDateStr = `${segDate.getFullYear()}-${String(segDate.getMonth() + 1).padStart(2, "0")}-${String(segDate.getDate()).padStart(2, "0")}`;
      return segDateStr === today && segDate.getHours() === currentHour;
    });

    const hourChanged = currentHour !== this.lastSummaryHour;
    const significantNewSegments =
      hourSegments.length >= this.lastSummarySegmentCount + 5;

    if (hourSegments.length === 0) {
      if (hourChanged) {
        this.currentHourSummary = `${this.formatHourLabel(currentHour)} - Waiting for activity...`;
        this.lastSummaryHour = currentHour;
        this.lastSummarySegmentCount = 0;
      }
      return;
    }

    if (!hourChanged && !significantNewSegments) {
      return;
    }

    try {
      const summary = await this.generateHourSummary(currentHour);
      this.currentHourSummary = summary.summary;
      this.lastSummaryHour = currentHour;
      this.lastSummarySegmentCount = hourSegments.length;
    } catch (error) {
      console.error("[TranscriptManager] Failed to update rolling summary:", error);
      this.currentHourSummary = `${this.formatHourLabel(currentHour)} - ${hourSegments.length} segments recorded`;
    }
  }

  getCurrentHourSummary(): string {
    if (this.currentHourSummary) {
      return this.currentHourSummary;
    }
    const hour = new Date().getHours();
    return `${this.formatHourLabel(hour)} - Starting...`;
  }

  // ===========================================================================
  // Segment Management
  // ===========================================================================

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = null;
      await this.persist();
    }, 30000);
  }

  addSegment(text: string, isFinal: boolean, speakerId?: string): void {
    if (!text.trim()) return;

    this.isRecording = true;

    if (!isFinal) {
      this.interimText = text;
      return;
    }

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

    this.pendingSegments.push({
      text: segment.text,
      timestamp: segment.timestamp,
      isFinal: segment.isFinal,
      speakerId: segment.speakerId,
      index: this.segmentIndex,
    });
    this.scheduleSave();
  }

  stopRecording(): void {
    this.isRecording = false;
    this.interimText = "";
  }

  // ===========================================================================
  // RPC Methods
  // ===========================================================================

  @rpc
  async refreshHourSummary(): Promise<string> {
    await this.updateRollingSummary();
    return this.currentHourSummary;
  }

  @rpc
  async loadDateTranscript(
    date: string,
  ): Promise<{ segments: TranscriptSegment[]; hourSummaries: HourSummary[] }> {
    const userId = this._session?.userId;
    if (!userId) {
      return { segments: [], hourSummaries: [] };
    }

    const today = this.getTodayDate();

    if (date === today) {
      this.loadedDate = today;
      return {
        segments: [...this.segments],
        hourSummaries: [...this.hourSummaries],
      };
    }

    this.isLoadingHistory = true;

    try {
      const transcript = await getDailyTranscript(userId, date);

      if (!transcript || transcript.segments.length === 0) {
        this.loadedDate = date;
        this.isLoadingHistory = false;
        return { segments: [], hourSummaries: [] };
      }

      const loadedSegments: TranscriptSegment[] = transcript.segments.map(
        (seg, idx) => ({
          id: `seg_${idx + 1}`,
          text: seg.text,
          timestamp: seg.timestamp,
          isFinal: seg.isFinal,
          speakerId: seg.speakerId,
        }),
      );

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

      this.segments.set(loadedSegments);
      this.loadedDate = date;
      this.hourSummaries.set(loadedSummaries);
      this.isLoadingHistory = false;

      return {
        segments: loadedSegments,
        hourSummaries: loadedSummaries,
      };
    } catch (error) {
      console.error(`[TranscriptManager] Failed to load transcript for ${date}:`, error);
      this.isLoadingHistory = false;
      throw error;
    }
  }

  @rpc
  async loadTodayTranscript(): Promise<void> {
    const today = this.getTodayDate();
    if (this.loadedDate === today) return;
    await this.hydrate();
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
    this.hourSummaries.set([]);
    this.currentHourSummary = "";
    this.lastSummaryHour = -1;
    this.lastSummarySegmentCount = 0;
  }

  @rpc
  async generateHourSummary(hour?: number): Promise<HourSummary> {
    const now = new Date();
    const targetHour = hour ?? now.getHours();
    const targetDate = this.loadedDate || this.getTodayDate();

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

    const transcriptText = hourSegments.map((s) => s.text).join(" ");

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
- Keep body under 150 characters`,
      });

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
        } catch (err) {
          console.error("[TranscriptManager] Failed to save hour summary:", err);
        }
      }

      // Update local state
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

      return summary;
    } catch (error) {
      console.error("[TranscriptManager] Failed to generate hour summary:", error);
      throw error;
    }
  }
}
