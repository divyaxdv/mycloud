const express = require("express");
const multer = require("multer");
const s3 = require("@mycloud/lib").s3Client;
const { File } = require("@mycloud/models");
const { sendMessage } = require("../queues/producer.js");
const authenticate = require("../middleware/authenticate.js");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const mongoose = require("mongoose");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;

// POST /upload (protected)
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const userId = req.user.id; // from JWT

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const key = `${userId}/${Date.now()}-${req.file.originalname}`;

      await s3
        .putObject({
          Bucket: process.env.S3_BUCKET || "my-bucket",
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
        .promise();

      const fileDoc = await File.create({
        userId,
        originalName: req.file.originalname,
        storagePath: key,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      await sendMessage(QUEUE_URL, { fileId: fileDoc._id.toString() });

      res.json({ message: "Uploaded successfully", file: fileDoc });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed", details: err.message });
    }
  }
);
router.get("/getAll", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const files = await File.find({ userId }).sort({ updatedAt: -1 });

    res.json(files);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to fetch files", details: err.message });
  }
});

router.get("/:id/open", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    // Find file in DB
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) return res.status(404).json({ error: "File not found" });

    // Generate signed URL using existing s3 client
    const url = s3.getSignedUrl("getObject", {
      Bucket: process.env.S3_BUCKET || "my-test-bucket",
      Key: file.storagePath,
      Expires: 60, // URL valid for 60 seconds
    });

    res.json({ url });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to open file", details: err.message });
  }
});

router.delete("/:id", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const fileId = req.params.id;

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) return res.status(404).json({ error: "File not found" });

    // Delete from S3
    await s3
      .deleteObject({
        Bucket: process.env.S3_BUCKET || "my-bucket",
        Key: file.storagePath,
      })
      .promise();

    // Delete from MongoDB
    await File.deleteOne({ _id: fileId });

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to delete file", details: err.message });
  }
});

router.patch("/:id/metadata", async (req, res) => {
  const { id } = req.params;
  const { key, value } = req.body;

  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }

  try {
    // Special handling for tags (array)
    let updateQuery = {};
    if (key === "tags" && Array.isArray(value)) {
      updateQuery = { $addToSet: { tags: { $each: value } } };
    } else {
      updateQuery = { $set: { [key]: value } };
    }

    const updatedFile = await File.findByIdAndUpdate(id, updateQuery, {
      new: true,
    });

    if (!updatedFile) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(updatedFile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update metadata" });
  }
});

router.get("/categories", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const summary = await File.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // ✅ use 'new'
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { category: "$_id", count: 1, _id: 0 } },
    ]);

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch category summary",
      details: err.message,
    });
  }
});

module.exports = router;
