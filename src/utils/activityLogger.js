const {
  UserActivityRepository,
} = require("../repositories/userActivityRepository");

const activityRepo = new UserActivityRepository();

/**
 * Helper function to log user activities
 * @param {Object} params - Activity logging parameters
 * @param {string} params.user_id - ID of the user performing the action
 * @param {string} params.table_name - Name of the table being affected
 * @param {string} params.record_id - ID of the record being affected (null for INSERT)
 * @param {string} params.action_type - Type of action (INSERT, UPDATE, DELETE, APPROVE, REJECT)
 * @param {Object} params.change_details - Details of the changes made
 * @returns {Promise<Object>} The logged activity entry
 */
const logUserActivity = async ({
  user_id,
  table_name,
  record_id,
  action_type,
  change_details,
}) => {
  try {
    if (!user_id || !table_name || !action_type) {
      console.warn("Missing required fields for activity logging:", {
        user_id,
        table_name,
        action_type,
      });
      return null;
    }

    const activity = await activityRepo.log({
      user_id,
      table_name,
      record_id: record_id || null,
      action_type,
      change_details: change_details || null,
    });

    console.log(
      `Activity logged: ${action_type} on ${table_name} by user ${user_id}`
    );
    return activity;
  } catch (error) {
    console.error("Failed to log user activity:", error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

module.exports = { logUserActivity };
