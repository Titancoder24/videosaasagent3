const express = require("express");
const router = express.Router();

const {
  // Raw SQL Query
  executeCustomQuery,

  // Pre-built Query Templates
  getDrugsByMultipleTherapeuticAreas,
  getTherapeuticTrialsByDateRange,
  getDrugsWithCompanyInfo,
  getTrialsWithParticipantCriteria,

  // Template Information
  getAvailableQueryTemplates,

  // Saved Queries
  createSavedQuery,
  getUserSavedQueries,
  getSavedQueryById,
  updateSavedQuery,
  deleteSavedQuery,
  getSavedQueriesByTrialId,
} = require("../controllers/queryController");

// ==================== CUSTOM SQL QUERIES ====================
router.post("/custom", executeCustomQuery);

// ==================== PRE-BUILT QUERY TEMPLATES ====================
router.post(
  "/templates/drugs-by-therapeutic-areas",
  getDrugsByMultipleTherapeuticAreas
);
router.post("/templates/trials-by-date-range", getTherapeuticTrialsByDateRange);
router.post("/templates/drugs-with-company-info", getDrugsWithCompanyInfo);
router.post(
  "/templates/trials-with-participant-criteria",
  getTrialsWithParticipantCriteria
);

// ==================== TEMPLATE INFORMATION ====================
router.get("/templates", getAvailableQueryTemplates);

// ==================== SAVED QUERIES ====================
// Create a new saved query
router.post("/saved", createSavedQuery);

// Get all saved queries for a user (supports pagination, search, and trial info)
router.get("/saved/user/:user_id", getUserSavedQueries);

// Get a specific saved query by ID
router.get("/saved/:id", getSavedQueryById);

// Update a saved query
router.put("/saved/:id", updateSavedQuery);

// Delete a saved query
router.delete("/saved/:id", deleteSavedQuery);

// Get saved queries for a specific trial
router.get("/saved/trial/:trial_id", getSavedQueriesByTrialId);

module.exports = router;
