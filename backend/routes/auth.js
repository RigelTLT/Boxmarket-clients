const router = require("express").Router();
const {
  register,
  login,
  getCurrentUser,
} = require("../controllers/authController");
const { verifyJWT } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyJWT, getCurrentUser);
module.exports = router;
