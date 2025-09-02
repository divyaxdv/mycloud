require("dotenv").config();
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");

console.log("Aws region:", process.env.AWS_REGION);
console.log("Aws SQS Endpoint:", process.env.AWS_SQS_ENDPOINT);
console.log(
  "Aws Access Key:",
  process.env.AWS_ACCESS_KEY_ID ? "defined" : "not defined"
);

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_SQS_ENDPOINT || undefined, // LocalStack when defined
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

module.exports = {
  sqsClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
};
