const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getAll,
  getById,
  getByEmail,
  updateById,
  removeById,
} = require("../controllers/userController");

router.post("/registerUser", register);
router.post("/loginUser", login);
router.get("/getAllUsers", getAll);
router.get("/getUserById/:id", getById);
router.get("/getUserByEmail/:email", getByEmail);
router.patch("/updateUser/:id/:user_id", updateById);
router.delete("/deleteUser/:user_id", removeById);

module.exports = router;
