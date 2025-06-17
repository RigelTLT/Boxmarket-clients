const router = require("express").Router();
const { verifyJWT } = require("../middleware/auth");
const { bookContainer } = require("../controllers/bookingController");

router.post("/", verifyJWT, bookContainer);

module.exports = router;
