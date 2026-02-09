/**
 * File Model
 *
 * Single source of truth for folders/dates.
 * Links to transcripts and tracks folder-level metadata.
 */

import mongoose, { Schema, Document, Model, Types } from "mongoose";

// =============================================================================
// Interfaces
// =============================================================================

export interface FileI extends Document {
  userId: string;
  date: string; // YYYY-MM-DD (unique per user)

  // Transcript linkage
  dailyTranscriptId?: Types.ObjectId; // Reference to DailyTranscript (if exists in MongoDB)
  r2Key?: string; // R2 object key for archived transcripts

  // Denormalized counts
  noteCount: number;
  transcriptSegmentCount: number;

  // Flags
  hasTranscript: boolean;
  hasNotes: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isFavourite: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Schema
// =============================================================================

const FileSchema = new Schema<FileI>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },

    dailyTranscriptId: { type: Schema.Types.ObjectId, ref: "DailyTranscript" },
    r2Key: { type: String },

    noteCount: { type: Number, default: 0 },
    transcriptSegmentCount: { type: Number, default: 0 },

    hasTranscript: { type: Boolean, default: false },
    hasNotes: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isTrashed: { type: Boolean, default: false },
    isFavourite: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Compound unique index - one File per user per date
FileSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for filtering
FileSchema.index({ userId: 1, isArchived: 1, isTrashed: 1, date: -1 });
FileSchema.index({ userId: 1, isFavourite: 1, date: -1 });

// =============================================================================
// Model
// =============================================================================

export const File: Model<FileI> =
  mongoose.models.File || mongoose.model<FileI>("File", FileSchema);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get or create a File for a user and date
 */
export async function getOrCreateFile(
  userId: string,
  date: string,
  defaults?: Partial<FileI>,
): Promise<FileI> {
  let file = await File.findOne({ userId, date });

  if (!file) {
    file = await File.create({
      userId,
      date,
      noteCount: 0,
      transcriptSegmentCount: 0,
      hasTranscript: false,
      hasNotes: false,
      isArchived: false,
      isTrashed: false,
      isFavourite: false,
      ...defaults,
    });
  }

  return file;
}

/**
 * Get a File by userId and date
 */
export async function getFile(
  userId: string,
  date: string,
): Promise<FileI | null> {
  return File.findOne({ userId, date });
}

/**
 * Get all Files for a user (optionally filtered)
 */
export async function getFiles(
  userId: string,
  filter?: { isArchived?: boolean; isTrashed?: boolean; isFavourite?: boolean },
): Promise<FileI[]> {
  const query: Record<string, unknown> = { userId };

  if (filter?.isArchived !== undefined) {
    query.isArchived = filter.isArchived;
  }
  if (filter?.isTrashed !== undefined) {
    query.isTrashed = filter.isTrashed;
  }
  if (filter?.isFavourite !== undefined) {
    query.isFavourite = filter.isFavourite;
  }

  return File.find(query).sort({ date: -1 });
}

/**
 * Update a File
 */
export async function updateFile(
  userId: string,
  date: string,
  updates: Partial<FileI>,
): Promise<FileI | null> {
  return File.findOneAndUpdate(
    { userId, date },
    { $set: updates },
    { new: true },
  );
}

/**
 * Increment note count for a File (upserts if doesn't exist)
 */
export async function incrementNoteCount(
  userId: string,
  date: string,
  delta: number = 1,
): Promise<void> {
  if (delta > 0) {
    // Incrementing - set hasNotes to true
    await File.updateOne(
      { userId, date },
      {
        $inc: { noteCount: delta },
        $set: { hasNotes: true },
        $setOnInsert: {
          userId,
          date,
          transcriptSegmentCount: 0,
          hasTranscript: false,
          isArchived: false,
          isTrashed: false,
          isFavourite: false,
        },
      },
      { upsert: true },
    );
  } else {
    // Decrementing - just decrement first
    await File.updateOne(
      { userId, date },
      { $inc: { noteCount: delta } },
    );

    // Then check if hasNotes should be false
    const file = await File.findOne({ userId, date });
    if (file && file.noteCount <= 0) {
      await File.updateOne(
        { userId, date },
        { $set: { hasNotes: false, noteCount: 0 } },
      );
    }
  }
}

/**
 * Update transcript info for a File (upserts if doesn't exist)
 */
export async function updateFileTranscript(
  userId: string,
  date: string,
  transcriptInfo: {
    dailyTranscriptId?: Types.ObjectId;
    r2Key?: string;
    segmentCount?: number;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (transcriptInfo.dailyTranscriptId !== undefined) {
    updates.dailyTranscriptId = transcriptInfo.dailyTranscriptId;
  }
  if (transcriptInfo.r2Key !== undefined) {
    updates.r2Key = transcriptInfo.r2Key;
  }
  if (transcriptInfo.segmentCount !== undefined) {
    updates.transcriptSegmentCount = transcriptInfo.segmentCount;
  }

  updates.hasTranscript = true;

  await File.updateOne(
    { userId, date },
    {
      $set: updates,
      $setOnInsert: {
        userId,
        date,
        noteCount: 0,
        hasNotes: false,
        isArchived: false,
        isTrashed: false,
        isFavourite: false,
      },
    },
    { upsert: true },
  );
}

/**
 * Bulk create Files for multiple dates (for migration/hydration)
 */
export async function bulkCreateFiles(
  userId: string,
  dates: string[],
): Promise<void> {
  const operations = dates.map((date) => ({
    updateOne: {
      filter: { userId, date },
      update: {
        $setOnInsert: {
          userId,
          date,
          noteCount: 0,
          transcriptSegmentCount: 0,
          hasTranscript: false,
          hasNotes: false,
          isArchived: false,
          isTrashed: false,
          isFavourite: false,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await File.bulkWrite(operations);
  }
}

/**
 * Delete a File (soft delete via isTrashed flag or hard delete)
 */
export async function deleteFile(
  userId: string,
  date: string,
  hard: boolean = false,
): Promise<boolean> {
  if (hard) {
    const result = await File.deleteOne({ userId, date });
    return result.deletedCount > 0;
  } else {
    const result = await File.updateOne(
      { userId, date },
      { $set: { isTrashed: true } },
    );
    return result.modifiedCount > 0;
  }
}
