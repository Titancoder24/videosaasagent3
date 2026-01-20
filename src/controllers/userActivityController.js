const { StatusCodes } = require("http-status-codes");
const {
  UserActivityRepository,
} = require("../repositories/userActivityRepository");

const activityRepo = new UserActivityRepository();

const logActivity = async (req, res) => {
  const { user_id, table_name, record_id, action_type, change_details } =
    req.body || {};
  if (!user_id || !table_name || !action_type) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id, table_name, action_type are required" });
  }
  const entry = await activityRepo.log({
    user_id,
    table_name,
    record_id,
    action_type,
    change_details,
  });
  return res.status(StatusCodes.CREATED).json({ activity: entry });
};

const listUserActivity = async (req, res) => {
  const { user_id } = req.params;
  const items = await activityRepo.findAllByUser(user_id);
  return res.status(StatusCodes.OK).json({ activity: items });
};

const listActivity = async (req, res) => {
  const { table_name, action_type } = req.query;
  const items = await activityRepo.findAll({ table_name, action_type });
  return res.status(StatusCodes.OK).json({ activity: items });
};

module.exports = { logActivity, listUserActivity, listActivity };
