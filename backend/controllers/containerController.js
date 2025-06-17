const Container = require("../models/Container");

async function listContainers(req, res) {
  const containers = await Container.find().sort({ updatedAt: -1 });
  res.json(containers);
}

module.exports = { listContainers };
