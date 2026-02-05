/**
 * ChatHistory Model
 *
 * Stores per-day chat history for AI conversations.
 * Each user has a separate chat history for each day.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

// =============================================================================
// Interfaces
// =============================================================================

export interface ChatMessageI {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatHistoryI extends Document {
  userId: string;
  date: string; // YYYY-MM-DD
  messages: ChatMessageI[];
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Schemas
// =============================================================================

const ChatMessageSchema = new Schema<ChatMessageI>(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false },
);

const ChatHistorySchema = new Schema<ChatHistoryI>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    messages: [ChatMessageSchema],
  },
  { timestamps: true },
);

// Compound index for efficient user + date queries
ChatHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

// =============================================================================
// Model
// =============================================================================

export const ChatHistory: Model<ChatHistoryI> =
  mongoose.models.ChatHistory ||
  mongoose.model<ChatHistoryI>("ChatHistory", ChatHistorySchema);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get chat history for a user and date
 */
export async function getChatHistory(
  userId: string,
  date: string,
): Promise<ChatHistoryI | null> {
  return ChatHistory.findOne({ userId, date });
}

/**
 * Get or create chat history for a user and date
 */
export async function getOrCreateChatHistory(
  userId: string,
  date: string,
): Promise<ChatHistoryI> {
  let history = await ChatHistory.findOne({ userId, date });

  if (!history) {
    history = await ChatHistory.create({
      userId,
      date,
      messages: [],
    });
  }

  return history;
}

/**
 * Add a message to chat history
 */
export async function addChatMessage(
  userId: string,
  date: string,
  message: ChatMessageI,
): Promise<void> {
  await ChatHistory.updateOne(
    { userId, date },
    {
      $push: { messages: message },
      $setOnInsert: { userId, date },
    },
    { upsert: true },
  );
}

/**
 * Add multiple messages to chat history
 */
export async function addChatMessages(
  userId: string,
  date: string,
  messages: ChatMessageI[],
): Promise<void> {
  await ChatHistory.updateOne(
    { userId, date },
    {
      $push: { messages: { $each: messages } },
      $setOnInsert: { userId, date },
    },
    { upsert: true },
  );
}

/**
 * Clear chat history for a user and date
 */
export async function clearChatHistory(
  userId: string,
  date: string,
): Promise<void> {
  await ChatHistory.updateOne({ userId, date }, { $set: { messages: [] } });
}

/**
 * Delete chat history for a user and date
 */
export async function deleteChatHistory(
  userId: string,
  date: string,
): Promise<boolean> {
  const result = await ChatHistory.deleteOne({ userId, date });
  return result.deletedCount > 0;
}

/**
 * Get all dates that have chat history for a user
 */
export async function getChatHistoryDates(userId: string): Promise<string[]> {
  const histories = await ChatHistory.find(
    { userId, "messages.0": { $exists: true } },
    { date: 1 },
  ).sort({ date: -1 });

  return histories.map((h) => h.date);
}
