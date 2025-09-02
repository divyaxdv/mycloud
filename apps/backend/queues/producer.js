const { sqsClient, SendMessageCommand } = require("@mycloud/lib");

async function sendMessage(queueUrl, messageBody) {
  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
    });

    const result = await sqsClient.send(command);
    console.log("✅ Message sent:", result.MessageId);
    return result;
  } catch (err) {
    console.error("❌ Error sending message:", err);
    throw err;
  }
}

module.exports = { sendMessage };
