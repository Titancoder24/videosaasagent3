const express = require("express");
const router = express.Router();
const {
  submitChange,
  listChanges,
  getChangeById,
  approveChange,
  rejectChange,
  deleteChange,
} = require("../controllers/pendingChangeController");

router.post("/submitChange", submitChange);
router.get("/listChanges", listChanges);
router.get("/getChangeById/:id", getChangeById);
router.post("/approveChange/:id", approveChange);
router.post("/rejectChange/:id", rejectChange);
router.delete("/deleteChange/:id", deleteChange);

module.exports = router;
