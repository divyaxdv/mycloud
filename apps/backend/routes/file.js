const express = require("express");
const multer = require("multer");
const s3 = require("../config/s3.js");
const File = require("../models/fileSchema.js");
const authenticate = require("../middleware/authenticate.js");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
      Bucket: process.env.S3_BUCKET || "my-bucket",
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

module.exports = router;
