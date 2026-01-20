const { StatusCodes } = require("http-status-codes");
const {
  PendingChangeRepository,
} = require("../repositories/pendingChangeRepository");
const { logUserActivity } = require("../utils/activityLogger");

const pendingRepo = new PendingChangeRepository();

const submitChange = async (req, res) => {
  const {
    target_table,
    target_record_id,
    proposed_data,
    change_type,
    submitted_by,
  } = req.body || {};
  if (!target_table || !proposed_data || !change_type || !submitted_by) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message:
        "target_table, proposed_data, change_type, submitted_by are required",
    });
  }
  const created = await pendingRepo.submit({
    target_table,
    target_record_id,
    proposed_data,
    change_type,
    submitted_by,
  });

  // Log pending change submission activity
  await logUserActivity({
    user_id: submitted_by,
    table_name: "pending_changes",
    record_id: created.id,
    action_type: "INSERT",
    change_details: { target_table, change_type, proposed_data },
  });

  return res.status(StatusCodes.CREATED).json({ change: created });
};

const listChanges = async (req, res) => {
  const { is_approved, rejected } = req.query;
  const changes = await pendingRepo.findAll({
    is_approved:
      typeof is_approved === "string" ? is_approved === "true" : undefined,
    rejected: typeof rejected === "string" ? rejected === "true" : undefined,
  });
  return res.status(StatusCodes.OK).json({ changes });
};

const getChangeById = async (req, res) => {
  const change = await pendingRepo.findById(req.params.id);
  if (!change)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Change not found" });
  return res.status(StatusCodes.OK).json({ change });
};

const approveChange = async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body || {};
  if (!approved_by)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "approved_by is required" });
  const updated = await pendingRepo.approve(id, approved_by);
  if (!updated)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Change not found" });

  // Log change approval activity
  await logUserActivity({
    user_id: approved_by,
    table_name: "pending_changes",
    record_id: updated.id,
    action_type: "APPROVE",
    change_details: {
      target_table: updated.target_table,
      change_type: updated.change_type,
    },
  });

  return res.status(StatusCodes.OK).json({ change: updated });
};

const rejectChange = async (req, res) => {
  const { id } = req.params;
  const { approved_by, rejection_reason } = req.body || {};
  if (!approved_by)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "approved_by is required" });
  const updated = await pendingRepo.reject(id, approved_by, rejection_reason);
  if (!updated)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Change not found" });

  // Log change rejection activity
  await logUserActivity({
    user_id: approved_by,
    table_name: "pending_changes",
    record_id: updated.id,
    action_type: "REJECT",
    change_details: {
      target_table: updated.target_table,
      change_type: updated.change_type,
      rejection_reason,
    },
  });

  return res.status(StatusCodes.OK).json({ change: updated });
};

const deleteChange = async (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "user_id is required for activity logging" });

  // Get change info before deletion for logging
  const changeToDelete = await pendingRepo.findById(req.params.id);
  if (!changeToDelete)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Change not found" });

  const ok = await pendingRepo.delete(req.params.id);
  if (!ok)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Change not found" });

  // Log change deletion activity
  await logUserActivity({
    user_id: user_id, // Use the provided user_id from request
    table_name: "pending_changes",
    record_id: changeToDelete.id,
    action_type: "DELETE",
    change_details: {
      deleted_change: {
        id: changeToDelete.id,
        target_table: changeToDelete.target_table,
        change_type: changeToDelete.change_type,
        originally_submitted_by: changeToDelete.submitted_by,
      },
    },
  });

  return res.status(StatusCodes.OK).json({ success: true });
};

module.exports = {
  submitChange,
  listChanges,
  getChangeById,
  approveChange,
  rejectChange,
  deleteChange,
};
