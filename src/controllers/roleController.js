const { StatusCodes } = require("http-status-codes");
const { RoleRepository } = require("../repositories/roleRepository");
const { logUserActivity } = require("../utils/activityLogger");

const roleRepo = new RoleRepository();

const createRole = async (req, res) => {
  const { user_id } = req.params; // Get user_id from URL parameters
  const { role_name } = req.body || {};

  if (!role_name)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "role_name is required" });

  if (!user_id)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id parameter is required" });

  const exists = await roleRepo.findByName(role_name);
  if (exists)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "role_name already exists" });
  const role = await roleRepo.create(role_name);

  // Log role creation activity
  await logUserActivity({
    user_id: user_id, // Use the provided user_id from URL parameters
    table_name: "roles",
    record_id: role.id,
    action_type: "INSERT",
    change_details: { role_name },
  });

  res.status(StatusCodes.CREATED).json({ role });
};

const getRoles = async (_req, res) => {
  const roles = await roleRepo.findAll();
  res.status(StatusCodes.OK).json({ roles });
};

const getRoleById = async (req, res) => {
  const role = await roleRepo.findById(req.params.id);
  if (!role)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Role not found" });
  res.status(StatusCodes.OK).json({ role });
};

const updateRole = async (req, res) => {
  const { id, user_id } = req.params; // Get both id and user_id from URL parameters
  const { role_name } = req.body || {};

  if (!role_name)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "role_name is required" });

  if (!user_id)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id parameter is required" });

  const updated = await roleRepo.update(id, role_name);
  if (!updated)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Role not found" });

  // Log role update activity
  await logUserActivity({
    user_id: user_id, // Use the provided user_id from URL parameters
    table_name: "roles",
    record_id: updated.id,
    action_type: "UPDATE",
    change_details: { role_name },
  });

  res.status(StatusCodes.OK).json({ role: updated });
};

const deleteRole = async (req, res) => {
  const { id, user_id } = req.params; // Get both id and user_id from URL parameters

  if (!user_id)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id parameter is required" });

  // Get role info before deletion for logging
  const roleToDelete = await roleRepo.findById(id);
  if (!roleToDelete)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Role not found" });

  // Check if role is a protected system role
  const protectedRoles = ["User", "Admin", "Manager"];
  if (protectedRoles.includes(roleToDelete.role_name)) {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: `Cannot delete protected system role: ${roleToDelete.role_name}`,
      error: "Protected role deletion is not allowed",
      protected_roles: protectedRoles,
    });
  }

  const ok = await roleRepo.delete(id);
  if (!ok)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Role not found" });

  // Log role deletion activity
  await logUserActivity({
    user_id: user_id, // Use the provided user_id from URL parameters
    table_name: "roles",
    record_id: roleToDelete.id,
    action_type: "DELETE",
    change_details: {
      deleted_role: { id: roleToDelete.id, role_name: roleToDelete.role_name },
    },
  });

  res.status(StatusCodes.OK).json({ success: true });
};

module.exports = { createRole, getRoles, getRoleById, updateRole, deleteRole };
