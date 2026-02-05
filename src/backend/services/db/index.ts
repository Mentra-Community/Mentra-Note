/**
 * MongoDB Database Service
 *
 * Provides:
 * - Connection management
 * - Mongoose models for all SEGA data types
 * - Helper functions for common queries
 */

import mongoose, { Schema, Document, Model } from "mongoose";

// =============================================================================
// Connection Management
// =============================================================================

let isConnected = false;

/**
 * Connect to MongoDB
 */
export async function connectDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[DB] MONGODB_URI not set - database features disabled");
    return;
  }

  try {
    await mongoose.connect(uri, {
      dbName: "notes",
    });
    isConnected = true;
    console.log("[DB] Connected to MongoDB");
  } catch (error) {
    console.error("[DB] Connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("[DB] Disconnected from MongoDB");
  } catch (error) {
    console.error("[DB] Disconnect failed:", error);
  }
}

/**
 * Check if connected
 */
export function isDBConnected(): boolean {
  return isConnected;
}

// =============================================================================
// Type Definitions
// =============================================================================

// Transcript Segment (embedded in DailyTranscript)
export interface ITranscriptSegment {
  text: string;
  timestamp: Date;
  isFinal: boolean;
  speakerId?: string;
  index: number;
  meetingId?: string;
}

// Daily Transcript
export interface IDailyTranscript extends Document {
  userId: string;
  date: string; // YYYY-MM-DD
  segments: ITranscriptSegment[];
  totalSegments: number;
  createdAt: Date;
  updatedAt: Date;
}

// Hour Summary
export interface IHourSummary extends Document {
  userId: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  hourLabel: string; // "9 AM", "2 PM", etc.
  summary: string; // AI-generated summary
  segmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Meeting
export interface IMeeting extends Document {
  userId: string;
  date: string;
  title: string;
  category: string;
  status: "active" | "ended" | "processing" | "complete";
  startTime: Date;
  endTime?: Date;
  transcriptRange: {
    startIndex: number;
    endIndex?: number;
  };
  attendees: string[];
  topics: string[];
  presetId?: string;
  isSensitive: boolean;
  sensitiveReason?: string;
  noteId?: string;
  actionItemIds: string[];
  researchIds: string[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

// Note
export interface INote extends Document {
  userId: string;
  meetingId?: string;
  title: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  content: string;
  detailLevel: "brief" | "standard" | "detailed";
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Action Item
export interface IActionItem extends Document {
  userId: string;
  meetingId?: string;
  noteId?: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  sourceText?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Research Result
export interface IResearchResult extends Document {
  userId: string;
  meetingId?: string;
  query: string;
  type: "person" | "company" | "topic" | "general";
  status: "pending" | "in_progress" | "completed" | "failed";
  summary: string;
  keyFacts: string[];
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
  content: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User Settings
export interface IUserSettings extends Document {
  userId: string;
  autonomyLevel: "capture_only" | "suggest" | "act";
  showTranscriptOnGlasses: boolean;
  showLiveTranscript: boolean;
  emailSummaries: boolean;
  emailAddress?: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Meeting Preset
export interface IMeetingPreset extends Document {
  userId: string;
  name: string;
  category: string;
  condition: string;
  isSystem: boolean;
  isActive: boolean;
  userContext?: string;
  sensitive?: boolean;
  sensitiveReason?: string;
  noteRules: {
    detailLevel: "brief" | "standard" | "detailed";
    captureDecisions: boolean;
    captureActionItems: boolean;
    customInstructions?: string;
  };
  researchTriggers: {
    autoResearchAttendees: boolean;
    autoResearchCompanies: boolean;
    autoResearchTopics: boolean;
    customTriggers?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Sensitive Topic
export interface ISensitiveTopic extends Document {
  userId: string;
  keyword: string;
  action: "pause" | "flag";
  isSystem: boolean;
  createdAt: Date;
}

// =============================================================================
// Schemas
// =============================================================================

const TranscriptSegmentSchema = new Schema<ITranscriptSegment>(
  {
    text: { type: String, required: true },
    timestamp: { type: Date, required: true },
    isFinal: { type: Boolean, required: true },
    speakerId: { type: String },
    index: { type: Number, required: true },
    meetingId: { type: String },
  },
  { _id: false },
);

const DailyTranscriptSchema = new Schema<IDailyTranscript>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    segments: [TranscriptSegmentSchema],
    totalSegments: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

// Compound index for userId + date (unique per user per day)
DailyTranscriptSchema.index({ userId: 1, date: 1 }, { unique: true });

const HourSummarySchema = new Schema<IHourSummary>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    hour: { type: Number, required: true },
    hourLabel: { type: String, required: true },
    summary: { type: String, required: true },
    segmentCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

// Compound index for userId + date + hour (unique per user per hour)
HourSummarySchema.index({ userId: 1, date: 1, hour: 1 }, { unique: true });

const MeetingSchema = new Schema<IMeeting>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "ended", "processing", "complete"],
      default: "active",
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    transcriptRange: {
      startIndex: { type: Number, required: true },
      endIndex: { type: Number },
    },
    attendees: [{ type: String }],
    topics: [{ type: String }],
    presetId: { type: String },
    isSensitive: { type: Boolean, default: false },
    sensitiveReason: { type: String },
    noteId: { type: String },
    actionItemIds: [{ type: String }],
    researchIds: [{ type: String }],
    confidence: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

MeetingSchema.index({ userId: 1, date: 1 });
MeetingSchema.index({ userId: 1, status: 1 });

const NoteSchema = new Schema<INote>(
  {
    userId: { type: String, required: true, index: true },
    meetingId: { type: String, index: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    keyPoints: [{ type: String }],
    decisions: [{ type: String }],
    content: { type: String, default: "" },
    detailLevel: {
      type: String,
      enum: ["brief", "standard", "detailed"],
      default: "standard",
    },
    isStarred: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

NoteSchema.index({ userId: 1, meetingId: 1 });

const ActionItemSchema = new Schema<IActionItem>(
  {
    userId: { type: String, required: true, index: true },
    meetingId: { type: String, index: true },
    noteId: { type: String },
    description: { type: String, required: true },
    assignee: { type: String },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    sourceText: { type: String },
  },
  {
    timestamps: true,
  },
);

ActionItemSchema.index({ userId: 1, status: 1 });
ActionItemSchema.index({ userId: 1, meetingId: 1 });

const ResearchResultSchema = new Schema<IResearchResult>(
  {
    userId: { type: String, required: true, index: true },
    meetingId: { type: String, index: true },
    query: { type: String, required: true },
    type: {
      type: String,
      enum: ["person", "company", "topic", "general"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "pending",
    },
    summary: { type: String, default: "" },
    keyFacts: [{ type: String }],
    sources: [
      {
        url: { type: String },
        title: { type: String },
        snippet: { type: String },
      },
    ],
    content: { type: String, default: "" },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

ResearchResultSchema.index({ userId: 1, meetingId: 1 });

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true },
    autonomyLevel: {
      type: String,
      enum: ["capture_only", "suggest", "act"],
      default: "suggest",
    },
    showTranscriptOnGlasses: { type: Boolean, default: true },
    showLiveTranscript: { type: Boolean, default: true },
    emailSummaries: { type: Boolean, default: false },
    emailAddress: { type: String },
    displayName: { type: String },
  },
  {
    timestamps: true,
  },
);

const MeetingPresetSchema = new Schema<IMeetingPreset>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    condition: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    userContext: { type: String },
    sensitive: { type: Boolean, default: false },
    sensitiveReason: { type: String },
    noteRules: {
      detailLevel: {
        type: String,
        enum: ["brief", "standard", "detailed"],
        default: "standard",
      },
      captureDecisions: { type: Boolean, default: true },
      captureActionItems: { type: Boolean, default: true },
      customInstructions: { type: String },
    },
    researchTriggers: {
      autoResearchAttendees: { type: Boolean, default: false },
      autoResearchCompanies: { type: Boolean, default: false },
      autoResearchTopics: { type: Boolean, default: false },
      customTriggers: [{ type: String }],
    },
  },
  {
    timestamps: true,
  },
);

MeetingPresetSchema.index({ userId: 1, isActive: 1 });

const SensitiveTopicSchema = new Schema<ISensitiveTopic>(
  {
    userId: { type: String, required: true, index: true },
    keyword: { type: String, required: true },
    action: {
      type: String,
      enum: ["pause", "flag"],
      default: "flag",
    },
    isSystem: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

SensitiveTopicSchema.index({ userId: 1, keyword: 1 }, { unique: true });

// =============================================================================
// Models
// =============================================================================

// Use existing models if they exist (for hot reloading)
export const DailyTranscript: Model<IDailyTranscript> =
  mongoose.models.DailyTranscript ||
  mongoose.model<IDailyTranscript>("DailyTranscript", DailyTranscriptSchema);

export const HourSummary: Model<IHourSummary> =
  mongoose.models.HourSummary ||
  mongoose.model<IHourSummary>("HourSummary", HourSummarySchema);

export const Meeting: Model<IMeeting> =
  mongoose.models.Meeting || mongoose.model<IMeeting>("Meeting", MeetingSchema);

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

export const ActionItem: Model<IActionItem> =
  mongoose.models.ActionItem ||
  mongoose.model<IActionItem>("ActionItem", ActionItemSchema);

export const ResearchResult: Model<IResearchResult> =
  mongoose.models.ResearchResult ||
  mongoose.model<IResearchResult>("ResearchResult", ResearchResultSchema);

export const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);

export const MeetingPreset: Model<IMeetingPreset> =
  mongoose.models.MeetingPreset ||
  mongoose.model<IMeetingPreset>("MeetingPreset", MeetingPresetSchema);

export const SensitiveTopic: Model<ISensitiveTopic> =
  mongoose.models.SensitiveTopic ||
  mongoose.model<ISensitiveTopic>("SensitiveTopic", SensitiveTopicSchema);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get or create daily transcript for a user and date
 */
export async function getOrCreateDailyTranscript(
  userId: string,
  date: string,
): Promise<IDailyTranscript> {
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
 * Append segments to daily transcript
 */
export async function appendTranscriptSegments(
  userId: string,
  date: string,
  segments: ITranscriptSegment[],
): Promise<void> {
  if (segments.length === 0) return;

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
 * Get user settings or create defaults
 */
export async function getOrCreateUserSettings(
  userId: string,
): Promise<IUserSettings> {
  let settings = await UserSettings.findOne({ userId });

  if (!settings) {
    settings = await UserSettings.create({
      userId,
      autonomyLevel: "suggest",
      showTranscriptOnGlasses: true,
      emailSummaries: false,
    });
  }

  return settings;
}

/**
 * Get meetings for a user by date
 */
export async function getMeetingsByDate(
  userId: string,
  date: string,
): Promise<IMeeting[]> {
  return Meeting.find({ userId, date }).sort({ startTime: -1 });
}

/**
 * Get recent meetings for a user
 */
export async function getRecentMeetings(
  userId: string,
  limit: number = 10,
): Promise<IMeeting[]> {
  return Meeting.find({ userId }).sort({ startTime: -1 }).limit(limit);
}

/**
 * Get notes for a user by date
 */
export async function getNotesByDate(
  userId: string,
  date: string,
): Promise<INote[]> {
  // Get meetings for the date, then get their notes
  const meetings = await Meeting.find({ userId, date });
  const noteIds = meetings
    .map((m) => m.noteId)
    .filter((id): id is string => id !== undefined && id !== null);

  if (noteIds.length === 0) return [];

  return Note.find({ _id: { $in: noteIds } });
}

/**
 * Get pending action items for a user
 */
export async function getPendingActionItems(
  userId: string,
): Promise<IActionItem[]> {
  return ActionItem.find({
    userId,
    status: { $in: ["pending", "in_progress"] },
  }).sort({ priority: -1, dueDate: 1 });
}

/**
 * Get research results for a meeting
 */
export async function getResearchByMeeting(
  userId: string,
  meetingId: string,
): Promise<IResearchResult[]> {
  return ResearchResult.find({ userId, meetingId });
}

/**
 * Get daily transcript for a specific date (returns null if not found)
 */
export async function getDailyTranscript(
  userId: string,
  date: string,
): Promise<IDailyTranscript | null> {
  return DailyTranscript.findOne({ userId, date });
}

/**
 * Get all dates that have transcripts for a user
 * Returns array of date strings (YYYY-MM-DD) sorted newest first
 */
export async function getAvailableDates(
  userId: string,
  limit: number = 90,
): Promise<string[]> {
  const transcripts = await DailyTranscript.find(
    { userId, totalSegments: { $gt: 0 } },
    { date: 1 },
  )
    .sort({ date: -1 })
    .limit(limit);

  return transcripts.map((t) => t.date);
}

/**
 * Get transcript dates with segment counts (for folder list)
 */
export async function getTranscriptSummaries(
  userId: string,
  limit: number = 90,
): Promise<Array<{ date: string; segmentCount: number }>> {
  const transcripts = await DailyTranscript.find(
    { userId, totalSegments: { $gt: 0 } },
    { date: 1, totalSegments: 1 },
  )
    .sort({ date: -1 })
    .limit(limit);

  return transcripts.map((t) => ({
    date: t.date,
    segmentCount: t.totalSegments,
  }));
}

/**
 * Save or update an hour summary
 */
export async function saveHourSummary(
  userId: string,
  date: string,
  hour: number,
  hourLabel: string,
  summary: string,
  segmentCount: number,
): Promise<IHourSummary> {
  const result = await HourSummary.findOneAndUpdate(
    { userId, date, hour },
    {
      $set: {
        hourLabel,
        summary,
        segmentCount,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        userId,
        date,
        hour,
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
  return result;
}

/**
 * Get all hour summaries for a specific date
 */
export async function getHourSummaries(
  userId: string,
  date: string,
): Promise<IHourSummary[]> {
  return HourSummary.find({ userId, date }).sort({ hour: 1 });
}

/**
 * Get hour summary for a specific hour
 */
export async function getHourSummary(
  userId: string,
  date: string,
  hour: number,
): Promise<IHourSummary | null> {
  return HourSummary.findOne({ userId, date, hour });
}
