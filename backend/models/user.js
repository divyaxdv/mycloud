import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true },
  email: String,
  name: String,
  avatar: String,
});

export default mongoose.model("User", userSchema);
