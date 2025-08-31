const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // for email/password login
  googleId: { type: String }, // for Google login
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
