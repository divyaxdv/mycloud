const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { mongoClient } = require("@mycloud/lib");

require("dotenv").config();
require("./middleware/passport"); // load passport config

const authRoutes = require("./routes/auth");
const fileRoute = require("./routes/file");

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: "mysessionsecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/file", fileRoute);

(async () => {
  try {
    await mongoClient.connectMongo(process.env.MONGO_URI);
    app.listen(5001, () => {
      console.log("🚀 Server running on http://localhost:5001");
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
