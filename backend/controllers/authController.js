const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const CONFIG = require("../config");

async function register(req, res) {
  const { fullName, email, phone, password } = req.body;
  if (!fullName || !email || !phone || !password)
    return res.status(400).json({ message: "Missing fields" });
  const existing = await User.findOne({ email });
  if (existing)
    return res.status(400).json({ message: "Email already in use" });

  const hashed = bcrypt.hashSync(password, 8);
  const user = new User({ fullName, email, phone, password: hashed });
  await user.save();
  res.status(201).json({ message: "User registered" });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id }, CONFIG.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    },
  });
}
async function getCurrentUser(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Не авторизован" });
    }

    res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    });
  } catch (err) {
    console.error("Ошибка получения данных пользователя:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
}

module.exports = { register, login, getCurrentUser };
