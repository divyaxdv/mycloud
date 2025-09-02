const AWS = require("aws-sdk");
require("dotenv").config();
const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:4566", // LocalStack or MinIO
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  s3ForcePathStyle: true, // needed for local S3
  signatureVersion: "v4",
  region: process.env.AWS_REGION || "us-east-1",
});

module.exports = s3;
