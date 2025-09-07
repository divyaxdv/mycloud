require("dotenv").config();
const { mongoClient } = require("@mycloud/lib"); // MongoDB connection helper
const {
  sqsClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommand,
} = require("@mycloud/lib");
const { File } = require("@mycloud/models");
const s3 = require("@mycloud/lib").s3Client;
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const {
  classifyAudio,
  classifyImage,
  classifyText,
  predictTags,
} = require("./models");
const pdf = require("pdf-parse");

const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;
const MAX_RETRIES = 3;

async function start() {
  try {
    await mongoClient.connectMongo(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    pollQueue();
  } catch (err) {
    console.error("❌ Failed to start:", err);
    process.exit(1);
  }
}

async function pollQueue() {
  while (true) {
    try {
      console.log("⏳ Polling for messages...");
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 10,
          MessageAttributeNames: ["All"], // Needed to read retry count
        })
      );

      const messages = response.Messages || [];
      if (messages.length === 0) continue;

      for (const msg of messages) {
        await handleMessage(msg);
      }
    } catch (err) {
      console.error("❌ Error polling queue:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function handleMessage(msg) {
  let retries = 0;
  if (msg.MessageAttributes && msg.MessageAttributes.retries) {
    retries = parseInt(msg.MessageAttributes.retries.StringValue, 10);
  }

  try {
    const body = JSON.parse(msg.Body);
    const fileId = body.fileId;
    console.log("📩 Received message for fileId:", fileId);

    console.log("🔍 searching", fileId);
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    console.log("🔍 classifying", file.storagePath);
    const s3Object = await s3
      .getObject({
        Bucket: process.env.S3_BUCKET || "my-bucket",
        Key: file.storagePath,
      })
      .promise();

    console.log("🔍 fetched from S3", file.storagePath);

    const fileBuffer = Buffer.isBuffer(s3Object.Body)
      ? s3Object.Body
      : Buffer.from(s3Object.Body);

    console.log("🔍 classifying buffer", fileBuffer.length);

    let category = "unknown";
    let tags = [];
    if (file.mimeType.startsWith("image/")) {
      const prediction = await classifyImage(fileBuffer);
      category = prediction.category;
      tags = prediction.tags;
    } else if (file.mimeType.startsWith("text/")) {
      category = await classifyText(fileBuffer.toString("utf-8"));
    } else if (file.mimeType === "application/pdf") {
      const text = await extractTextFromPDF(fileBuffer); // raw buffer
      tags = await predictTags(text);
      category = await classifyText(text);
    } else if (file.mimeType.startsWith("audio/")) {
      category = await classifyAudio("path/to/audio"); // same logic
    }

    console.log("🔍 File classified as:", category);
    console.log("🔍 Tags predicted:", tags);

    file.category = category;
    file.tags = Array.from(new Set([...(file.tags || []), ...tags]));
    await file.save();

    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
      })
    );

    console.log("✅ Processed file", fileId);
  } catch (err) {
    console.error("❌ Error processing message:", err.message);

    if (retries >= MAX_RETRIES) {
      console.log("⚠️ Max retries reached, deleting message from queue.");
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle,
        })
      );
    } else {
      console.log(`🔄 Retrying message (attempt ${retries + 1})`);

      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: msg.Body,
          MessageAttributes: {
            retries: {
              DataType: "Number",
              StringValue: (retries + 1).toString(),
            },
          },
        })
      );

      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle,
        })
      );
    }
  }
}

async function extractTextFromPDF(buffer) {
  const data = await pdf(buffer);
  return data.text;
}

start();
