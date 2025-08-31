const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String, // e.g., S3 key, local path, or Nextcloud ID
      required: true,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number, // in bytes
    },

    // AI metadata
    category: {
      type: String, // e.g., "Finance", "Personal", "Work"
    },
    tags: [
      {
        type: String,
      },
    ],
    summary: {
      type: String,
    },
    embeddings: {
      type: [Number], // store vector here (optional, usually put in vector DB)
      select: false, // don’t return by default
    },

    // Status tracking
    status: {
      type: String,
      enum: ["uploaded", "processing", "processed", "failed"],
      default: "uploaded",
    },
    error: {
      type: String, // store error if AI pipeline fails
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", FileSchema);
