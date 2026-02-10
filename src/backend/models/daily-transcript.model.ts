/**
 * DailyTranscript Model
 *
 * Stores transcript segments for a user's day.
 * Segments are grouped by date (YYYY-MM-DD) for efficient querying.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

// =============================================================================
// Interfaces
// =============================================================================

export interface TranscriptSegmentI {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  speakerId?: string;
  index: number;
  type?: "transcript" | "photo";
  photoUrl?: string;
  photoMimeType?: string;
  photoDescription?: string;
  timezone?: string;
}

export interface DailyTranscriptI extends Document {
  userId: string;
  date: string; // YYYY-MM-DD
  segments: TranscriptSegmentI[];
  totalSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Schemas
// =============================================================================

const TranscriptSegmentSchema = new Schema<TranscriptSegmentI>(
  {
    text: { type: String, required: true },
    timestamp: { type: Date, required: true },
    isFinal: { type: Boolean, required: true },
    speakerId: { type: String },
    index: { type: Number, required: true },
    type: { type: String, enum: ["transcript", "photo"], default: "transcript" },
    photoUrl: { type: String },
    photoMimeType: { type: String },
    photoDescription: { type: String },
    timezone: { type: String },
  },
  { _id: false },
);

const DailyTranscriptSchema = new Schema<DailyTranscriptI>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    segments: [TranscriptSegmentSchema],
    totalSegments: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Compound index for efficient user + date queries
DailyTranscriptSchema.index({ userId: 1, date: 1 }, { unique: true });

// =============================================================================
// Model
// =============================================================================

export const DailyTranscript: Model<DailyTranscriptI> =
  mongoose.models.DailyTranscript ||
  mongoose.model<DailyTranscriptI>("DailyTranscript", DailyTranscriptSchema);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get or create a daily transcript for a user and date
 */
export async function getOrCreateDailyTranscript(
  userId: string,
  date: string,
): Promise<DailyTranscriptI> {
  let transcript = await DailyTranscript.findOne({ userId, date });

  if (!transcript) {
    transcript = await DailyTranscript.create({
      userId,
      date,
      segments: [],
      totalSegments: 0,
    });
  }

  return transcript;
}

/**
 * Get a daily transcript (returns null if not found)
 */
export async function getDailyTranscript(
  userId: string,
  date: string,
): Promise<DailyTranscriptI | null> {
  return DailyTranscript.findOne({ userId, date });
}

/**
 * Append segments to a daily transcript (upsert)
 */
export async function appendTranscriptSegments(
  userId: string,
  date: string,
  segments: TranscriptSegmentI[],
): Promise<void> {
  await DailyTranscript.updateOne(
    { userId, date },
    {
      $push: { segments: { $each: segments } },
      $inc: { totalSegments: segments.length },
      $setOnInsert: { userId, date },
    },
    { upsert: true },
  );
}

/**
 * Get all dates that have transcripts for a user
 */
export async function getAvailableDates(userId: string): Promise<string[]> {
  const transcripts = await DailyTranscript.find(
    { userId, totalSegments: { $gt: 0 } },
    { date: 1 },
  ).sort({ date: -1 });

  return transcripts.map((t) => t.date);
}

/**
 * Get transcript summaries (date + segment count) for a user
 */
export async function getTranscriptSummaries(
  userId: string,
): Promise<Array<{ date: string; segmentCount: number }>> {
  const transcripts = await DailyTranscript.find(
    { userId, totalSegments: { $gt: 0 } },
    { date: 1, totalSegments: 1 },
  ).sort({ date: -1 });

  return transcripts.map((t) => ({
    date: t.date,
    segmentCount: t.totalSegments,
  }));
}

/**
 * Delete a daily transcript for a user and date
 * Returns true if deleted, false if not found
 */
export async function deleteDailyTranscript(
  userId: string,
  date: string,
): Promise<boolean> {
  const result = await DailyTranscript.deleteOne({ userId, date });
  return result.deletedCount > 0;
}
