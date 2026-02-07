/**
 * Note Model
 *
 * Stores user notes - both manual and AI-generated.
 * Notes can optionally be linked to a transcript time range.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

// =============================================================================
// Interfaces
// =============================================================================

export interface NoteI extends Document {
  userId: string;
  title: string;
  summary: string;
  content: string;
  isStarred: boolean;
  transcriptRange?: {
    startTime: Date;
    endTime: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Schema
// =============================================================================

const NoteSchema = new Schema<NoteI>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    isStarred: { type: Boolean, default: false },
    transcriptRange: {
      startTime: { type: Date },
      endTime: { type: Date },
    },
  },
  { timestamps: true },
);

// Index for efficient user queries sorted by creation date
NoteSchema.index({ userId: 1, createdAt: -1 });

// =============================================================================
// Model
// =============================================================================

export const Note: Model<NoteI> =
  mongoose.models.Note || mongoose.model<NoteI>("Note", NoteSchema);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new note
 */
export async function createNote(
  userId: string,
  data: {
    title: string;
    content?: string;
    summary?: string;
    transcriptRange?: { startTime: Date; endTime: Date };
  },
): Promise<NoteI> {
  return Note.create({
    userId,
    title: data.title,
    content: data.content || "",
    summary: data.summary || "",
    transcriptRange: data.transcriptRange,
  });
}

/**
 * Get all notes for a user
 */
export async function getNotes(userId: string): Promise<NoteI[]> {
  return Note.find({ userId }).sort({ createdAt: -1 });
}

/**
 * Get a single note by ID
 */
export async function getNoteById(
  userId: string,
  noteId: string,
): Promise<NoteI | null> {
  return Note.findOne({ _id: noteId, userId });
}

/**
 * Update a note
 */
export async function updateNote(
  userId: string,
  noteId: string,
  data: Partial<{
    title: string;
    content: string;
    summary: string;
    isStarred: boolean;
  }>,
): Promise<NoteI | null> {
  return Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: data },
    { new: true },
  );
}

/**
 * Delete a note
 */
export async function deleteNote(
  userId: string,
  noteId: string,
): Promise<boolean> {
  const result = await Note.deleteOne({ _id: noteId, userId });
  return result.deletedCount > 0;
}

/**
 * Get notes by date range (based on createdAt)
 */
export async function getNotesByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<NoteI[]> {
  return Note.find({
    userId,
    createdAt: { $gte: startDate, $lte: endDate },
  }).sort({ createdAt: -1 });
}

/**
 * Delete all notes for a specific date (YYYY-MM-DD)
 * Returns the number of deleted notes
 */
export async function deleteNotesByDate(
  userId: string,
  date: string,
): Promise<number> {
  // Parse date string to get start and end of day
  const [year, month, day] = date.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  const result = await Note.deleteMany({
    userId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  return result.deletedCount;
}
