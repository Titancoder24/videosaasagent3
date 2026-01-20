const { StatusCodes } = require("http-status-codes");
const { UserRoleRepository } = require("../repositories/userRoleRepository");
const { RoleRepository } = require("../repositories/roleRepository");
const { logUserActivity } = require("../utils/activityLogger");

const userRoleRepo = new UserRoleRepository();
const roleRepo = new RoleRepository();

const assignRole = async (req, res) => {
  const { acting_user_id } = req.params; // Get acting_user_id from URL parameters
  const { user_id, role_id, role_name } = req.body || {};

  if (!user_id || (!role_id && !role_name)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "user_id and role_id or role_name are required",
    });
  }

  if (!acting_user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "acting_user_id parameter is required" });
  }

  let finalRoleId = role_id;
  if (!finalRoleId && role_name) {
    const role = await roleRepo.findByName(role_name);
    if (!role)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "role_name not found" });
    finalRoleId = role.id;
  }

  try {
    // Check if user already has any existing role assignments
    const existingRoles = await userRoleRepo.getUserRoles(user_id);

    if (existingRoles && existingRoles.length > 0) {
      console.log(
        `User ${user_id} has ${existingRoles.length} existing role(s). Removing them...`
      );

      // Remove all existing role assignments
      for (const existingRole of existingRoles) {
        const removed = await userRoleRepo.removeRole(
          user_id,
          existingRole.role_id
        );
        if (removed) {
          console.log(
            `Removed role ${existingRole.role_name} (ID: ${existingRole.role_id}) from user ${user_id}`
          );

          // Log the role removal activity
          await logUserActivity({
            user_id: acting_user_id,
            table_name: "user_roles",
            record_id: existingRole.id,
            action_type: "DELETE",
            change_details: {
              removed_from_user_id: user_id,
              removed_role_id: existingRole.role_id,
              removed_role_name: existingRole.role_name,
              reason: "Replaced by new role assignment",
            },
          });
        }
      }
    }

    // Now assign the new role
    const assigned = await userRoleRepo.assignRole(user_id, finalRoleId);

    // Log the new role assignment activity
    await logUserActivity({
      user_id: acting_user_id, // Use the user who is performing the action
      table_name: "user_roles",
      record_id: assigned.id,
      action_type: "INSERT",
      change_details: {
        assigned_to_user_id: user_id,
        assigned_role_id: finalRoleId,
        role_name: role_name || `Role ID: ${finalRoleId}`,
        replaced_existing_roles: existingRoles ? existingRoles.length : 0,
      },
    });

    return res.status(StatusCodes.CREATED).json({
      assignment: assigned,
      message: `Role assigned successfully. ${
        existingRoles && existingRoles.length > 0
          ? `Replaced ${existingRoles.length} existing role(s).`
          : "No existing roles to replace."
      }`,
      replaced_roles_count: existingRoles ? existingRoles.length : 0,
    });
  } catch (error) {
    console.error("Error in role assignment:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to assign role",
      error: error.message,
    });
  }
};

const removeRole = async (req, res) => {
  const { acting_user_id } = req.params; // Get acting_user_id from URL parameters
  const { user_id, role_id } = req.body || {};

  if (!user_id || !role_id)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id and role_id are required" });

  if (!acting_user_id)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "acting_user_id parameter is required" });

  // Get role info before removal for logging
  const roleInfo = await roleRepo.findById(role_id);

  const ok = await userRoleRepo.removeRole(user_id, role_id);
  if (!ok)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Assignment not found" });

  // Log role removal activity
  await logUserActivity({
    user_id: acting_user_id, // Use the user who is performing the action
    table_name: "user_roles",
    record_id: null, // Assignment is deleted so no record_id
    action_type: "DELETE",
    change_details: {
      removed_from_user_id: user_id,
      removed_role_id: role_id,
      role_name: roleInfo?.role_name,
    },
  });

  return res.status(StatusCodes.OK).json({ success: true });
};

const getUserRoles = async (req, res) => {
  const { user_id } = req.params;
  const roles = await userRoleRepo.getUserRoles(user_id);
  return res.status(StatusCodes.OK).json({ roles });
};

const getUsersWithRole = async (req, res) => {
  const { role_id } = req.params;
  const users = await userRoleRepo.getUsersWithRole(role_id);
  return res.status(StatusCodes.OK).json({ users });
};

const getAllUserRoles = async (req, res) => {
  const userRoles = await userRoleRepo.getAllUserRoles();
  return res.status(StatusCodes.OK).json({ userRoles });
};

module.exports = {
  assignRole,
  removeRole,
  getUserRoles,
  getUsersWithRole,
  getAllUserRoles,
};
