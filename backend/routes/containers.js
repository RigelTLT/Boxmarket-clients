const router = require("express").Router();
const { verifyJWT } = require("../middleware/auth");
const { listContainers } = require("../controllers/containerController");

router.get("/", verifyJWT, listContainers);

module.exports = router;
