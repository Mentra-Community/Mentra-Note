/**
 * CloudflareR2Manager
 *
 * Manages R2 cloud storage uploads for transcript batching.
 * Triggered when the batch cutoff date is crossed (end of day).
 */

import { SyncedManager, synced, rpc } from "../../../lib/sync";
import {
  batchTranscriptsToR2,
  deleteProcessedSegments,
  type TranscriptBatchResult,
} from "../../services/r2Batch.service";

// =============================================================================
// Types
// =============================================================================

export type BatchStatus = "none" | "in_progress" | "success" | "failed";

export interface BatchInfo {
  date: string;
  status: BatchStatus;
  segmentCount: number;
  r2Url?: string;
  error?: string;
  timestamp: string;
}

// =============================================================================
// Manager
// =============================================================================

export class CloudflareR2Manager extends SyncedManager {
  @synced isBatching = false;
  @synced lastBatchDate = "";
  @synced lastBatchStatus: BatchStatus = "none";
  @synced lastBatchSegmentCount = 0;
  @synced lastBatchUrl = "";
  @synced lastBatchError = "";

  // ===========================================================================
  // Batch Trigger
  // ===========================================================================

  /**
   * Trigger R2 batch upload for transcripts up to the cutoff timestamp
   * Called by TranscriptManager when batch cutoff is crossed
   *
   * @param userId - User's ID
   * @param cutoffTimestamp - Timestamp to batch up to (ISO string, e.g. 2026-02-05T16:54:59.000Z)
   * @param timezone - User's timezone for metadata
   * @returns Batch result
   */
  async triggerBatch(
    userId: string,
    cutoffTimestamp: string,
    timezone: string,
  ): Promise<TranscriptBatchResult> {
    if (this.isBatching) {
      console.log(`[R2Manager] Batch already in progress, skipping`);
      return {
        success: false,
        date: cutoffTimestamp,
        segmentCount: 0,
        error: new Error("Batch already in progress"),
      };
    }

    console.log(
      `[R2Manager] Triggering batch for ${userId} up to ${cutoffTimestamp}`,
    );

    this.isBatching = true;
    this.lastBatchStatus = "in_progress";
    this.lastBatchError = "";

    try {
      const result = await batchTranscriptsToR2({
        userId,
        cutoffTimestamp,
        timezone,
      });

      this.isBatching = false;
      this.lastBatchDate = cutoffTimestamp;
      this.lastBatchSegmentCount = result.segmentCount;

      if (result.success) {
        this.lastBatchStatus = "success";
        this.lastBatchUrl = result.r2Url || "";
        console.log(
          `[R2Manager] Batch successful: ${result.segmentCount} segments uploaded`,
        );
      } else {
        this.lastBatchStatus = "failed";
        this.lastBatchError = result.error?.message || "Unknown error";
        console.error(`[R2Manager] Batch failed:`, result.error);
      }

      return result;
    } catch (error) {
      this.isBatching = false;
      this.lastBatchStatus = "failed";
      this.lastBatchError =
        error instanceof Error ? error.message : String(error);

      console.error(`[R2Manager] Batch error:`, error);

      return {
        success: false,
        date: cutoffTimestamp,
        segmentCount: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // ===========================================================================
  // RPC Methods (callable from frontend)
  // ===========================================================================

  /**
   * Manually trigger a batch upload (admin/debug feature)
   */
  @rpc
  async forceBatch(cutoffDate?: string): Promise<BatchInfo> {
    const userId = this._session?.userId;
    if (!userId) {
      return {
        date: cutoffDate || "",
        status: "failed",
        segmentCount: 0,
        error: "No user session",
        timestamp: new Date().toISOString(),
      };
    }

    // Get timezone from settings manager
    const settingsManager = this.getSettingsManager();
    const timezone = settingsManager?.timezone || "UTC";

    // Get TimeManager for date if not provided
    const timeManager = this.getTimeManager();
    const batchDate = cutoffDate || timeManager?.getTodayDate() || "";

    const result = await this.triggerBatch(userId, batchDate, timezone);

    return {
      date: batchDate,
      status: result.success ? "success" : "failed",
      segmentCount: result.segmentCount,
      r2Url: result.r2Url,
      error: result.error?.message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current batch status
   */
  @rpc
  async getBatchStatus(): Promise<BatchInfo> {
    return {
      date: this.lastBatchDate,
      status: this.lastBatchStatus,
      segmentCount: this.lastBatchSegmentCount,
      r2Url: this.lastBatchUrl || undefined,
      error: this.lastBatchError || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Delete processed segments from MongoDB after confirming R2 upload
   * This is a separate step to allow verification before deletion
   */
  @rpc
  async cleanupProcessedSegments(cutoffTimestamp: string): Promise<number> {
    const userId = this._session?.userId;
    if (!userId) {
      console.error(`[R2Manager] No user session for cleanup`);
      return 0;
    }

    return deleteProcessedSegments({ userId, cutoffTimestamp });
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private getSettingsManager(): { timezone: string | null } | null {
    // Access settings manager through session
    const session = this._session as any;
    return session?.settings || null;
  }

  private getTimeManager(): { getTodayDate: () => string } | null {
    // Access time manager through transcript manager
    const session = this._session as any;
    return session?.transcript?.getTimeManager?.() || null;
  }
}
