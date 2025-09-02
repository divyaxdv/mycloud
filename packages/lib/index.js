module.exports = {
  mongoClient: require("./src/mongoClient"),
  ...require("./src/sqsClient"),
  s3Client: require("./src/s3Client"),
};
