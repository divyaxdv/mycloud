const mongoose = require("mongoose");

let isConnected = false;

async function connectMongo(uri) {
  if (isConnected) return mongoose.connection;

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log("✅ MongoDB connected");
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}

module.exports = { connectMongo };
