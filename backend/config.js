require("dotenv").config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  BITRIX_WEBHOOK_URL: process.env.BITRIX_WEBHOOK_URL,
  SCRAPER: {
    URL: process.env.URL,
    LOGIN: process.env.LOGIN,
    PASS: process.env.PASS,
  },
  CACHE_DIR: "./cache",
};
