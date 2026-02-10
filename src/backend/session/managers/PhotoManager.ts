/**
 * PhotoManager
 *
 * Captures a photo from MentraOS smart glasses and returns the base64 data.
 * Uses session.camera.requestPhoto() from the Mentra SDK.
 */

import { SyncedManager, synced, rpc } from "../../../lib/sync";
import type { AppSession } from "@mentra/sdk";

// =============================================================================
// Types
// =============================================================================

export type PhotoSize = "small" | "medium" | "large";

// =============================================================================
// Manager
// =============================================================================

export class PhotoManager extends SyncedManager {
  @synced isCapturing = false;

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private getAppSession(): AppSession | null {
    return (this._session as any)?.appSession ?? null;
  }

  // ===========================================================================
  // RPC Methods
  // ===========================================================================

  /**
   * Capture a photo and return its base64-encoded data.
   *
   * @param size - "small" (fast), "medium" (default), "large" (high-res)
   * @returns Base64 string of the captured image, or null if capture failed
   */
  @rpc
  async capturePhoto(size: PhotoSize = "small"): Promise<string | null> {
    const appSession = this.getAppSession();
    if (!appSession) {
      console.warn("[PhotoManager] Cannot capture photo - no glasses connected");
      return null;
    }

    if (this.isCapturing) {
      console.warn("[PhotoManager] Capture already in progress, skipping");
      return null;
    }

    this.isCapturing = true;

    try {
      console.log(`[PhotoManager] Requesting photo (size: ${size})...`);

      const photo = await appSession.camera.requestPhoto({ size });
      const base64 = photo.buffer.toString("base64");

      console.log(
        `[PhotoManager] Photo captured: ${photo.filename} (${photo.size} bytes)`,
      );

      return base64;
    } catch (error) {
      console.error("[PhotoManager] Failed to capture photo:", error);
      return null;
    } finally {
      this.isCapturing = false;
    }
  }
}
