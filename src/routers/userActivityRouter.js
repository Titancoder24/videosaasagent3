const express = require("express");
const router = express.Router();
const {
  logActivity,
  listUserActivity,
  listActivity,
} = require("../controllers/userActivityController");

router.post("/logActivity", logActivity);
router.get("/listUserActivity/:user_id", listUserActivity);
router.get("/listActivity", listActivity);

module.exports = router;
