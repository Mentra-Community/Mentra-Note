import { Schema, model } from "mongoose";

const userStateSchema = new Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },

  endOfDateBatchTranscriptions: {
    type: Date,
    required: true,
    description: "Date and time when transcriptions are batched and sent to R2 Cloudflare",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const UserState = model("UserState", userStateSchema);
