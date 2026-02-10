/**
 * SettingsManager
 *
 * Manages user preferences and settings for the Notes app.
 * Includes glasses display mode, transcript visibility, and timezone.
 */

import { SyncedManager, synced, rpc } from "../../../lib/sync";
import {
  getOrCreateUserSettings,
  updateUserSettings,
} from "../../models";

// =============================================================================
// Types
// =============================================================================

export type GlassesDisplayMode =
  | "off" // Nothing shown on glasses
  | "live_transcript" // Real-time transcription text
  | "hour_summary" // Rolling hour description/summary
  | "key_points"; // Only show when AI detects something important

// =============================================================================
// Manager
// =============================================================================

export class SettingsManager extends SyncedManager {
  @synced showLiveTranscript = true;
  @synced displayName: string | null = null;
  @synced timezone: string | null = null; // IANA timezone e.g. "America/Los_Angeles"
  @synced glassesDisplayMode: GlassesDisplayMode = "live_transcript";
  @synced superCollapsed = false;

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async hydrate(): Promise<void> {
    const userId = this._session?.userId;
    if (!userId) return;

    try {
      const settings = await getOrCreateUserSettings(userId);

      this.showLiveTranscript = settings.showLiveTranscript;
      this.glassesDisplayMode =
        (settings.glassesDisplayMode as GlassesDisplayMode) || "live_transcript";
      this.superCollapsed = settings.superCollapsed ?? false;
      this.displayName = settings.displayName || null;

      console.log(`[SettingsManager] Hydrated settings for ${userId}`);
    } catch (error) {
      console.error("[SettingsManager] Failed to hydrate:", error);
    }
  }

  // ===========================================================================
  // RPC Methods
  // ===========================================================================

  @rpc
  async updateSettings(settings: {
    showLiveTranscript?: boolean;
    displayName?: string;
    timezone?: string;
    glassesDisplayMode?: GlassesDisplayMode;
    superCollapsed?: boolean;
  }): Promise<void> {
    const userId = this._session?.userId;

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
    if (settings.superCollapsed !== undefined) {
      this.superCollapsed = settings.superCollapsed;
    }

    // Persist to database
    if (userId) {
      try {
        await updateUserSettings(userId, {
          showLiveTranscript: this.showLiveTranscript,
          glassesDisplayMode: this.glassesDisplayMode,
          superCollapsed: this.superCollapsed,
          displayName: this.displayName || undefined,
        });
      } catch (error) {
        console.error("[SettingsManager] Failed to persist settings:", error);
      }
    }
  }

  @rpc
  async getSettings(): Promise<{
    showLiveTranscript: boolean;
    displayName: string | null;
    timezone: string | null;
    glassesDisplayMode: GlassesDisplayMode;
    superCollapsed: boolean;
  }> {
    return {
      showLiveTranscript: this.showLiveTranscript,
      displayName: this.displayName,
      timezone: this.timezone,
      glassesDisplayMode: this.glassesDisplayMode,
      superCollapsed: this.superCollapsed,
    };
  }
}
