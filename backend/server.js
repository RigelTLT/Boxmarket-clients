const express = require("express");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");
const CONFIG = require("./config");
const { fetchExcelAndSync } = require("./services/scraper");

const authRoutes = require("./routes/auth");
const containersRoutes = require("./routes/containers");
const bookingRoutes = require("./routes/booking");

(async () => {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  const app = express();
  app.use(express.json());
  // Статика для кеша фото
  app.use("/cache", express.static(path.resolve(CONFIG.CACHE_DIR)));

  app.use("/api/auth", authRoutes);
  app.use("/api/containers", containersRoutes);
  app.use("/api/booking", bookingRoutes);

  cron.schedule(
    "0 0 * * *",
    () => {
      console.log("Running daily sync");
      fetchExcelAndSync(mongoose.connection).catch(console.error);
    },
    { timezone: "Europe/Berlin" }
  );

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
})();
