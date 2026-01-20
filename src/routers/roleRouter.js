const express = require("express");
const router = express.Router();
const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

router.post("/createRole/:user_id", createRole);
router.get("/getAllRoles", getRoles);
router.get("/getRoleById/:id", getRoleById);
router.patch("/updateRole/:id/:user_id", updateRole);
router.delete("/deleteRole/:id/:user_id", deleteRole);

module.exports = router;
