const jwt = require("jsonwebtoken");
const CONFIG = require("../config");
const User = require("../models/User");

async function verifyJWT(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ message: "No token provided" });
  const [bearer, token] = header.split(" ");
  if (bearer !== "Bearer" || !token)
    return res.status(401).json({ message: "Invalid token" });
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: "User not found" });
    next();
  } catch (err) {
    return res.status(401).json({ message: "Failed to authenticate token" });
  }
}

module.exports = { verifyJWT };
