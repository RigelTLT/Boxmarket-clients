const express = require("express");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");
const open = require("open");
const CONFIG = require("./config");
const { fetchExcelAndSync } = require("./services/scraper");
const fs = require("fs");
const authRoutes = require("./routes/auth");
const containersRoutes = require("./routes/containers");
const bookingRoutes = require("./routes/booking");

(async () => {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI);
    console.log("Connected to MongoDB");
    // Initial sync on startup
    fetchExcelAndSync(mongoose.connection).catch(console.error);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  const app = express();
  app.use(express.json());
  // Serve frontend static files
  app.use("/", express.static(path.resolve(__dirname, "../frontend")));
  // Serve cached photos from backend/cache
  const cachePath = path.resolve(__dirname, "cache");
  if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
  app.use("/cache", express.static(cachePath));

  app.use("/api/auth", authRoutes);
  app.use("/api/containers", containersRoutes);
  app.use("/api/booking", bookingRoutes);
  app.use("/api/booking", bookingRoutes);

  // Schedule daily sync at midnight Berlin time
  cron.schedule(
    "0 0 * * *",
    () => {
      console.log("Running daily sync");
      fetchExcelAndSync(mongoose.connection).catch(console.error);
    },
    { timezone: "Europe/Berlin" }
  );

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    // Open frontend automatically
    open(`http://localhost:${PORT}`);
  });
})();
