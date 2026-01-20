const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");
const { UserRepository } = require("../repositories/userRepository");
const { UserRoleRepository } = require("../repositories/userRoleRepository");
const { RoleRepository } = require("../repositories/roleRepository");
const {
  UserActivityRepository,
} = require("../repositories/userActivityRepository");
const { logUserActivity } = require("../utils/activityLogger");

// Create instances of repositories
const userRepository = new UserRepository();
const userRoleRepository = new UserRoleRepository();
const roleRepository = new RoleRepository();
const userActivityRepository = new UserActivityRepository();

const register = async (req, res) => {
  const {
    username,
    email,
    password,
    company,
    designation,
    phone,
    country,
    region,
    sex,
    age,
    plan,
    ipAuthority,
  } = req.body || {};

  if (!username || !email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "username, email, and password are required" });
  }

  const existingByEmail = await userRepository.findByEmail(email);
  if (existingByEmail) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Email already registered" });
  }

  const existingByUsername = await userRepository.findByUsername(username);
  if (existingByUsername) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Username already taken" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  // Map ipAuthority to plan if provided (since database uses plan field for IP Authority)
  const planValue = ipAuthority || plan;
  const created = await userRepository.create({
    username,
    email,
    password: hashedPassword,
    company,
    designation,
    phone,
    country,
    region,
    sex,
    age,
    plan: planValue,
  });
  // Assign default "User" role
  const UserRoleId = await roleRepository.findByName("User");
  if (!UserRoleId) {
    console.error("Default 'User' role not found in database");
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "System configuration error: Default user role not found",
    });
  }

  const assignUserRole = await userRoleRepository.assignRole(
    created.id,
    UserRoleId.id
  );

  // Log user registration activity using the newly created user's own ID
  const userId = created.id;

  await logUserActivity({
    user_id: userId,
    table_name: "users",
    record_id: userId, // Same as user_id for self-registration
    action_type: "INSERT",
    change_details: {
      username,
      email,
      company,
      designation,
      phone,
      country,
      region,
      sex,
      age,
      plan,
      self_registration: true, // Flag to indicate this is a self-registration
    },
  });

  // Log role assignment activity
  await logUserActivity({
    user_id: userId,
    table_name: "user_roles",
    record_id: assignUserRole.id, // Use the role assignment record ID
    action_type: "INSERT",
    change_details: {
      assigned_to_user_id: userId,
      assigned_role_id: assignUserRole.id,
      role_name: "User",
    },
  });

  const { password: _, ...safeUser } = created;
  return res.status(StatusCodes.CREATED).json({ user: safeUser });
};

const login = async (req, res) => {
  try {
    console.log("🔐 Login attempt started");
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "email and password are required" });
    }

    console.log(`🔍 Looking up user with email: ${email}`);
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      console.log(`❌ User not found for email: ${email}`);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
    }

    console.log(`✅ User found: ${user.username} (${user.id})`);
    console.log(`🔐 Comparing password...`);
    
    const isValid = await bcrypt.compare(password, user.password || "");
    
    if (!isValid) {
      console.log(`❌ Password comparison failed for user: ${user.username}`);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
    }

    console.log(`✅ Password verified for user: ${user.username}`);
    console.log(`📋 Fetching user roles...`);

    // Fetch user roles
    const userRoles = await userRoleRepository.getUserRoles(user.id);
    console.log(`✅ User roles fetched:`, userRoles.map(r => r.role_name).join(", "));

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    console.log(`✅ Login successful for user: ${user.username}`);
    
    const { password: _, ...safeUser } = user;
    return res.status(StatusCodes.OK).json({
      token,
      user: safeUser,
      roles: userRoles,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error", error: error.message });
  }
};

const getAll = async (req, res) => {
  const users = await userRepository.findAll();
  const safeUsers = users.map(({ password, ...u }) => u);
  return res.status(StatusCodes.OK).json({ users: safeUsers });
};

const getById = async (req, res) => {
  const { id } = req.params;
  const user = await userRepository.findById(id);
  if (!user)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "User not found" });
  const { password, ...safeUser } = user;
  return res.status(StatusCodes.OK).json({ user: safeUser });
};

const getByEmail = async (req, res) => {
  const { email } = req.params;
  const user = await userRepository.findByEmail(email);
  const { password, ...safeUser } = user;
  return res.status(StatusCodes.OK).json({ user: safeUser });
};

const updateById = async (req, res) => {
  const { user_id } = req.params; // Get user_id from URL parameters
  const updateData = req.body;

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id parameter is required" });
  }

  const updates = { ...updateData };
  const originalUpdates = { ...updateData }; // Keep original for logging
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
    originalUpdates.password = "[REDACTED]"; // Don't log actual password
  }
  const updated = await userRepository.update(user_id, updates);
  if (!updated)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "User not found or no changes" });

  // Log user update activity
  await logUserActivity({
    user_id: user_id, // WHO: The user performing the update
    table_name: "users",
    record_id: user_id, // WHICH: The user being updated
    action_type: "UPDATE",
    change_details: originalUpdates,
  });

  const { password, ...safeUser } = updated;
  return res.status(StatusCodes.OK).json({ user: safeUser });
};

const removeById = async (req, res) => {
  const { user_id } = req.params; // Get user_id from URL parameters

  if (!user_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id parameter is required" });
  }

  // Get user info before deletion for logging
  const userToDelete = await userRepository.findById(user_id);
  if (!userToDelete)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "User not found" });

  try {
    // Delete user activity logs first to avoid foreign key constraint violation
    const deletedLogs = await userActivityRepository.deleteByUserId(user_id);
    console.log(
      `Deleted ${deletedLogs.length} activity logs for user ${user_id}`
    );

    // Delete user roles to avoid foreign key constraint violation
    const deletedRoles = await userRoleRepository.deleteAllUserRoles(user_id);
    console.log(
      `Deleted ${deletedRoles.length} role assignments for user ${user_id}`
    );

    // Now delete the user
    const deleted = await userRepository.delete(user_id);
    if (!deleted)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });

    // Log user deletion activity (this will be the last log for this user)
    await logUserActivity({
      user_id: user_id, // WHO: The user performing the deletion
      table_name: "users",
      record_id: user_id, // WHICH: The user being deleted
      action_type: "DELETE",
      change_details: {
        deleted_user: {
          id: userToDelete.id,
          username: userToDelete.username,
          email: userToDelete.email,
        },
        deleted_activity_logs_count: deletedLogs.length,
        deleted_role_assignments_count: deletedRoles.length,
      },
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: `User deleted successfully. Removed ${deletedLogs.length} activity logs and ${deletedRoles.length} role assignments.`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getAll,
  getById,
  getByEmail,
  updateById,
  removeById,
};
