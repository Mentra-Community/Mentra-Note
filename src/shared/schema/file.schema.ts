import { Schema, model } from "mongoose";
import { getFormatedDate } from "./util";

const fileSchema = new Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
  },

  fileName: {
    type: String,
    default: () => getFormatedDate(),
  },

  starred: {
    type: Boolean,
    default: false,
  },

  trashed: {
    type: Boolean,
    default: false,
  },

  trashedAt: {
    type: Date,
    default: null,
  },

  trashExpiresAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const File = model("File", fileSchema);
