const Container = require("../models/Container");
const { sendLead } = require("../services/bitrix24");

async function bookContainer(req, res) {
  const { number, phone, email } = req.body;
  if (!number || !phone || !email)
    return res.status(400).json({ message: "Missing fields" });

  const container = await Container.findOne({ number });
  if (!container)
    return res.status(404).json({ message: "Container not found" });

  await sendLead(container, { phone, email });
  res.json({ message: "Booking sent" });
}

module.exports = { bookContainer };
