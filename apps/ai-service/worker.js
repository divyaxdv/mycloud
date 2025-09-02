require("dotenv").config();
const {
  sqsClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@mycloud/lib");

const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;

if (!QUEUE_URL) {
  console.error("❌ AWS_SQS_QUEUE_URL is not defined in environment");
  process.exit(1);
}

async function pollQueue() {
  while (true) {
    try {
      // 1️⃣ Receive messages
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 10,
        })
      );

      const messages = response.Messages || [];

      if (messages.length === 0) {
        continue; // no messages, keep polling
      }

      for (const msg of messages) {
        try {
          // 2️⃣ Parse and log message
          const body = JSON.parse(msg.Body);
          console.log("📩 Received message:", body);

          // 3️⃣ Your business logic
          console.log(
            `🔮 AI classification would run on fileId=${body.fileId}`
          );
          console.log(`💾 Updating DB for fileId=${body.fileId}`);

          // 4️⃣ Delete after success
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            })
          );

          console.log(`✅ Processed and deleted message ${msg.MessageId}`);
        } catch (err) {
          console.error("❌ Error processing message:", err);
          // Stop consumer immediately
          process.exit(1);
        }
      }
    } catch (err) {
      console.error("❌ Error polling queue:", err);
      // Stop consumer immediately
      process.exit(1);
    }
  }
}

// start consumer
pollQueue();
