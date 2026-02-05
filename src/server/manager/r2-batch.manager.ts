import { Transcript } from "../../shared/schema/transcript.schema";
import { uploadBatchToR2 } from "../services/r2Upload.service";

export interface TranscriptionBatchResult {
  success: boolean;
  date: string;
  transcriptionCount: number;
  r2Url?: string;
  error?: Error;
}

/**
 * Extract date in YYYY-MM-DD format from cutoff time string
 * Handles formats: "02/03/2026, 11:59:59 PM" or "YYYY-MM-DD"
 */
export function extractDateFromFormatted(cutoffDateTime: string): string {
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(cutoffDateTime)) {
    return cutoffDateTime;
  }

  // Parse "MM/DD/YYYY, HH:MM:SS AM/PM" format
  const match = cutoffDateTime.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month}-${day}`;
  }

  // Fallback: return as is if format doesn't match
  return cutoffDateTime;
}

/**
 * Batch all transcriptions for a given user up to a cutoff date
 * Groups transcriptions by their date attribute and uploads to R2
 *
 * @param userEmail - User's email identifier
 * @param cutoffDateTime - Cutoff date/time (format: "02/03/2026, 11:59:59 PM")
 * @returns Batch result with count and R2 URL
 */
export async function batchTranscriptionsToR2(params: {
  userEmail: string;
  cutoffDateTime: string;
}): Promise<TranscriptionBatchResult> {
  const { userEmail, cutoffDateTime } = params;

  // Extract YYYY-MM-DD format from the cutoff time
  const cutoffDate = extractDateFromFormatted(cutoffDateTime);

  console.log(`\n[R2Batch] 📦 Starting batch for ${userEmail} up to ${cutoffDate}`);
  console.log(`[R2Batch] 📅 Cutoff time: ${cutoffDateTime}`);

  try {
    // Query all transcriptions for this user up to the cutoff date
    // The date format in DB is "YYYY-MM-DD:HH:MM:SS", so we can use string comparison
    const transcriptions = await Transcript.find({
      userEmail,
      date: { $lte: `${cutoffDate}:23:59:59` }, // All transcriptions on or before cutoff date
    })
      .sort({ date: 1 }) // Sort by date ascending
      .exec();

    console.log(`[R2Batch] 📊 Found ${transcriptions.length} transcriptions for batching`);

    if (transcriptions.length === 0) {
      console.log(`[R2Batch] ℹ️  No transcriptions found for ${cutoffDate}`);
      return {
        success: true,
        date: cutoffDate,
        transcriptionCount: 0,
      };
    }

    // Group transcriptions by date for organized batching
    const grouped = groupByDate(transcriptions);
    console.log(`[R2Batch] 📅 Grouped into ${Object.keys(grouped).length} date(s)`);

    // For each date, upload to R2
    let totalUploaded = 0;
    let lastUrl: string | undefined;

    for (const [date, dateTranscriptions] of Object.entries(grouped)) {
      if (date > cutoffDate) {
        console.log(`[R2Batch] ⏭️  Skipping ${date} (after cutoff)`);
        continue;
      }

      console.log(`[R2Batch] 📤 Uploading ${dateTranscriptions.length} transcriptions for ${date}`);

      const result = await uploadBatchToR2({
        userEmail,
        date,
        transcriptions: dateTranscriptions,
      });

      if (!result.success) {
        console.error(`[R2Batch] ❌ Failed to upload batch for ${date}:`, result.error);
        return {
          success: false,
          date: cutoffDate,
          transcriptionCount: totalUploaded,
          error: result.error,
        };
      }

      totalUploaded += dateTranscriptions.length;
      lastUrl = result.url;
      console.log(`[R2Batch] ✅ Successfully uploaded ${dateTranscriptions.length} transcriptions for ${date}`);
    }

    console.log(`[R2Batch] 🎉 Batch complete! Total uploaded: ${totalUploaded}`);

    return {
      success: true,
      date: cutoffDate,
      transcriptionCount: totalUploaded,
      r2Url: lastUrl,
    };
  } catch (error) {
    console.error(`[R2Batch] 💥 Error during batching:`, error);
    return {
      success: false,
      date: cutoffDate,
      transcriptionCount: 0,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Group transcriptions by their date attribute
 * @param transcriptions - Array of transcription documents
 * @returns Object with date as key and array of transcriptions as value
 */
function groupByDate(transcriptions: any[]): Record<string, any[]> {
  return transcriptions.reduce(
    (acc, transcription) => {
      // Extract date portion from "YYYY-MM-DD:HH:MM:SS" format
      const dateOnly = transcription.date?.split(":")[0] || "unknown";
      if (!acc[dateOnly]) {
        acc[dateOnly] = [];
      }
      acc[dateOnly].push(transcription);
      return acc;
    },
    {} as Record<string, any[]>
  );
}

/**
 * Delete transcriptions from DB after successful R2 upload
 * Call this after confirming R2 upload was successful
 *
 * @param userEmail - User's email identifier
 * @param cutoffDate - Date cutoff to delete up to
 * @returns Number of documents deleted
 */
export async function deleteProcessedTranscriptions(params: {
  userEmail: string;
  cutoffDate: string;
}): Promise<number> {
  const { userEmail, cutoffDate } = params;

  console.log(`[R2Batch] 🗑️  Deleting transcriptions for ${userEmail} up to ${cutoffDate}`);

  try {
    const result = await Transcript.deleteMany({
      userEmail,
      date: { $lte: `${cutoffDate}:23:59:59` },
    }).exec();

    console.log(`[R2Batch] ✅ Deleted ${result.deletedCount} transcriptions`);
    return result.deletedCount;
  } catch (error) {
    console.error(`[R2Batch] ❌ Error deleting transcriptions:`, error);
    throw error;
  }
}
