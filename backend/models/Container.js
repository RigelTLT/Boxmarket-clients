const mongoose = require("mongoose");

const containerSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  params: { type: mongoose.Mixed },
  photos: [String],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Container", containerSchema);
