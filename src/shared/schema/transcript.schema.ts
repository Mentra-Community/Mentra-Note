import { Schema, model } from "mongoose";
import { getFormatedDate } from "./util";

const transcriptChunkSchema = new Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
  },

  directionizationId: {
    type: String,
    required: true,
  },

  content: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  date: {
    type: String,
    default: () => getFormatedDate(),
  },
});

export const Transcript = model("Transcript", transcriptChunkSchema);
