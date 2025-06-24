const express = require("express");
const router = express.Router();
const { createBooking } = require("../controllers/bookingController");
const { verifyJWT } = require("../middleware/auth");
router.post("/", verifyJWT, createBooking);

module.exports = router;
