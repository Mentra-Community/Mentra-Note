/**
 * NotesSession - Notes app session using the sync library
 *
 * Uses @manager decorator for automatic wiring:
 * - Injects session reference into managers
 * - Infers manager name from property key
 * - Auto-registers with session
 *
 * One session per user - created when any client (webview or glasses) connects.
 */

import { SyncedSession, SessionManager, manager } from "../../lib/sync";
import {
  TranscriptSyncedManager,
  NotesSyncedManager,
  ChatSyncedManager,
  SettingsSyncedManager,
} from "./managers";
import type { AppSession } from "@mentra/sdk";

export class NotesSession extends SyncedSession {
  // Managers - @manager decorator handles all wiring automatically
  @manager transcript = new TranscriptSyncedManager();
  @manager notes = new NotesSyncedManager();
  @manager chat = new ChatSyncedManager();
  @manager settings = new SettingsSyncedManager();

  // MentraOS AppSession - null if no glasses connected (not synced)
  private _appSession: AppSession | null = null;

  // ===========================================================================
  // AppSession Management (glasses connection)
  // ===========================================================================

  get appSession(): AppSession | null {
    return this._appSession;
  }

  get hasGlassesConnected(): boolean {
    return this._appSession !== null;
  }

  /**
   * Called when glasses connect via MentraOS
   */
  setAppSession(appSession: AppSession): void {
    const wasHeadless = this._appSession === null;
    this._appSession = appSession;

    if (wasHeadless) {
      console.log(
        `[NotesSession] Glasses connected for ${this.userId} - full mode`,
      );
      // Broadcast state change
      this.broadcastStateChange("session", "hasGlassesConnected", true);
    }
  }

  /**
   * Called when glasses disconnect
   */
  clearAppSession(): void {
    if (this._appSession === null) return;

    this._appSession = null;

    console.log(
      `[NotesSession] Glasses disconnected for ${this.userId} - headless mode`,
    );
    this.broadcastStateChange("session", "hasGlassesConnected", false);
  }

  // ===========================================================================
  // Transcription Handling
  // ===========================================================================

  /**
   * Handle incoming transcription from glasses
   */
  onTranscription(text: string, isFinal: boolean, speakerId?: string): void {
    // Add to transcript
    this.transcript.addSegment(text, isFinal, speakerId);

    // Show on glasses display if connected and enabled
    if (this._appSession && this.settings.showLiveTranscript) {
      this._appSession.dashboard.content.write(text);
    }
  }

  // ===========================================================================
  // Override getSnapshot to include session-level state
  // ===========================================================================

  getSnapshot(): Record<string, any> {
    const snapshot = super.getSnapshot();

    // Add session-level state
    snapshot.hasGlassesConnected = this.hasGlassesConnected;
    snapshot.hasActiveSession = true; // Session exists if we're here
    snapshot.isRecording = this.transcript.isRecording;

    return snapshot;
  }
}

// Session manager instance
export const sessions = new SessionManager<NotesSession>(
  (userId) => new NotesSession(userId),
);
