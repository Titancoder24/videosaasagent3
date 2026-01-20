const express = require("express");
const router = express.Router();
const {
  assignRole,
  removeRole,
  getUserRoles,
  getUsersWithRole,
  getAllUserRoles,
} = require("../controllers/userRoleController");

router.post("/assignRole/:acting_user_id", assignRole);
router.delete("/removeRole/:acting_user_id", removeRole);
router.get("/getAllUserRoles", getAllUserRoles);
router.get("/getUserRoles/:user_id", getUserRoles);
router.get("/getUsersWithRole/:role_id", getUsersWithRole);

module.exports = router;
