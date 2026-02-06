import {
  DailyTranscript,
  type TranscriptSegmentI,
} from "../models/daily-transcript.model";
import {
  uploadBatchToR2,
  formatSegmentForR2,
  type R2TranscriptSegment,
} from "./r2Upload.service";

// =============================================================================
// Interfaces
// =============================================================================

export interface TranscriptBatchResult {
  success: boolean;
  date: string;
  segmentCount: number;
  r2Url?: string;
  error?: Error;
}

// =============================================================================
// Main Batch Function
// =============================================================================

/**
 * Batch all transcripts for a given user up to a cutoff timestamp and upload to R2
 * Filters segments by their timestamp being <= cutoffTimestamp
 *
 * @param userId - User's ID
 * @param cutoffTimestamp - Cutoff timestamp as ISO string (e.g. 2026-02-05T16:54:59.000Z)
 * @param timezone - User's timezone for metadata
 * @returns Batch result with count and R2 URL
 */
export async function batchTranscriptsToR2(params: {
  userId: string;
  cutoffTimestamp: string;
  timezone: string;
}): Promise<TranscriptBatchResult> {
  const { userId, cutoffTimestamp, timezone } = params;
  const cutoffDate = new Date(cutoffTimestamp);

  console.log(
    `\n[R2Batch] Starting batch for ${userId} up to ${cutoffTimestamp}`,
  );

  try {
    // Query all DailyTranscripts for this user that have segments
    const dailyTranscripts = await DailyTranscript.find({
      userId,
      totalSegments: { $gt: 0 },
    })
      .sort({ date: 1 })
      .exec();

    console.log(
      `[R2Batch] Found ${dailyTranscripts.length} daily transcripts to check`,
    );

    if (dailyTranscripts.length === 0) {
      console.log(`[R2Batch] No transcripts found`);
      return {
        success: true,
        date: cutoffTimestamp,
        segmentCount: 0,
      };
    }

    // Group segments by date, filtering by cutoff timestamp
    const segmentsByDate: Record<string, R2TranscriptSegment[]> = {};
    let totalSegmentsFound = 0;

    for (const dailyTranscript of dailyTranscripts) {
      const { date, segments } = dailyTranscript;

      if (!segments || segments.length === 0) continue;

      // Filter segments where timestamp <= cutoffTimestamp
      const eligibleSegments = segments.filter((segment) => {
        const segmentTime = new Date(segment.timestamp);
        return segmentTime <= cutoffDate;
      });

      if (eligibleSegments.length > 0) {
        segmentsByDate[date] = eligibleSegments.map((segment) =>
          formatSegmentForR2(segment as TranscriptSegmentI),
        );
        totalSegmentsFound += eligibleSegments.length;
        console.log(
          `[R2Batch] Date ${date}: ${eligibleSegments.length}/${segments.length} segments eligible`,
        );
      }
    }

    if (totalSegmentsFound === 0) {
      console.log(`[R2Batch] No segments found up to ${cutoffTimestamp}`);
      return {
        success: true,
        date: cutoffTimestamp,
        segmentCount: 0,
      };
    }

    // Upload each day's segments to R2
    let totalUploaded = 0;
    let lastUrl: string | undefined;

    for (const [date, r2Segments] of Object.entries(segmentsByDate)) {
      console.log(
        `[R2Batch] Uploading ${r2Segments.length} segments for ${date}`,
      );

      const result = await uploadBatchToR2({
        userId,
        date,
        segments: r2Segments,
        timezone,
      });

      if (!result.success) {
        console.error(
          `[R2Batch] Failed to upload batch for ${date}:`,
          result.error,
        );
        return {
          success: false,
          date: cutoffTimestamp,
          segmentCount: totalUploaded,
          error: result.error,
        };
      }

      totalUploaded += r2Segments.length;
      lastUrl = result.url;
      console.log(
        `[R2Batch] Successfully uploaded ${r2Segments.length} segments for ${date}`,
      );
    }

    console.log(`[R2Batch] Batch complete! Total uploaded: ${totalUploaded}`);

    return {
      success: true,
      date: cutoffTimestamp,
      segmentCount: totalUploaded,
      r2Url: lastUrl,
    };
  } catch (error) {
    console.error(`[R2Batch] Error during batching:`, error);
    return {
      success: false,
      date: cutoffTimestamp,
      segmentCount: 0,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Delete processed segments from MongoDB after successful R2 upload
 * Removes segments with timestamp <= cutoffTimestamp from DailyTranscript documents
 * If all segments are removed, deletes the document entirely
 *
 * @param userId - User's ID
 * @param cutoffTimestamp - Timestamp cutoff (ISO string) to delete up to (inclusive)
 * @returns Number of segments deleted
 */
export async function deleteProcessedSegments(params: {
  userId: string;
  cutoffTimestamp: string;
}): Promise<number> {
  const { userId, cutoffTimestamp } = params;
  const cutoffDate = new Date(cutoffTimestamp);

  console.log(
    `[R2Batch] Deleting segments for ${userId} up to ${cutoffTimestamp}`,
  );

  try {
    // Get all daily transcripts with segments
    const dailyTranscripts = await DailyTranscript.find({
      userId,
      totalSegments: { $gt: 0 },
    }).exec();

    let totalDeleted = 0;

    for (const doc of dailyTranscripts) {
      const originalCount = doc.segments.length;

      // Filter out segments that were batched (keep segments AFTER cutoff)
      const remainingSegments = doc.segments.filter((segment) => {
        const segmentTime = new Date(segment.timestamp);
        return segmentTime > cutoffDate;
      });

      const deletedCount = originalCount - remainingSegments.length;

      if (deletedCount > 0) {
        if (remainingSegments.length === 0) {
          // All segments removed, delete the document
          await DailyTranscript.deleteOne({ _id: doc._id }).exec();
          console.log(
            `[R2Batch] Deleted entire document for ${doc.date} (${deletedCount} segments)`,
          );
        } else {
          // Update document with remaining segments
          await DailyTranscript.updateOne(
            { _id: doc._id },
            {
              $set: {
                segments: remainingSegments,
                totalSegments: remainingSegments.length,
              },
            },
          ).exec();
          console.log(
            `[R2Batch] Removed ${deletedCount} segments from ${doc.date}, ${remainingSegments.length} remaining`,
          );
        }
        totalDeleted += deletedCount;
      }
    }

    console.log(`[R2Batch] Total segments deleted: ${totalDeleted}`);
    return totalDeleted;
  } catch (error) {
    console.error(`[R2Batch] Error deleting segments:`, error);
    throw error;
  }
}

/**
 * Get dates that have been batched to R2 for a user
 * Useful for checking what's already been uploaded
 */
export async function getUnbatchedDates(userId: string): Promise<string[]> {
  const transcripts = await DailyTranscript.find(
    { userId, totalSegments: { $gt: 0 } },
    { date: 1 },
  ).sort({ date: 1 });

  return transcripts.map((t) => t.date);
}
