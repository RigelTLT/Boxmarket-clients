const mongoose = require("mongoose");
const { Schema } = mongoose;

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    container: {
      type: Schema.Types.ObjectId,
      ref: "Container",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
