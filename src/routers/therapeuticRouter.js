const express = require("express");
const router = express.Router();

const {
  createWithAllData, // NEW endpoint
  fetchAllTherapeuticData, // NEW endpoint
  fetchAllTherapeuticTrials, // NEW endpoint
  deleteAllTherapeuticDataByTrial, // NEW endpoint
  deleteAllTherapeuticTrialsDevOnly,
  createOverview,
  listOverview,
  getOverview,
  updateOverview,
  deleteOverview,
  createOutcome,
  listOutcomes,
  listOutcomesByTrial,
  getOutcome,
  updateOutcome,
  updateOutcomeByTrial,
  deleteOutcome,
  deleteOutcomeByTrial,
  createCriteria,
  listCriteria,
  listCriteriaByTrial,
  getCriteria,
  updateCriteria,
  updateCriteriaByTrial,
  deleteCriteria,
  deleteCriteriaByTrial,
  createTiming,
  listTiming,
  listTimingByTrial,
  getTiming,
  updateTiming,
  updateTimingByTrial,
  deleteTiming,
  deleteTimingByTrial,
  createResults,
  listResults,
  listResultsByTrial,
  getResults,
  updateResults,
  updateResultsByTrial,
  deleteResults,
  deleteResultsByTrial,
  createSites,
  listSites,
  listSitesByTrial,
  getSites,
  updateSites,
  updateSitesByTrial,
  deleteSites,
  deleteSitesByTrial,
  createOther,
  listOther,
  listOtherByTrial,
  getOther,
  updateOther,
  updateOtherByTrial,
  deleteOther,
  deleteOtherByTrial,
  createLog,
  listLogs,
  listLogsByTrial,
  getLog,
  updateLog,
  updateLogsByTrial,
  deleteLog,
  deleteLogsByTrial,
  createNote,
  listNotes,
  listNotesByTrial,
  getNote,
  updateNote,
  updateNotesByTrial,
  deleteNote,
  deleteNotesByTrial,
} = require("../controllers/therapeuticController");

// NEW: Comprehensive create endpoint
router.post("/create-therapeutic", createWithAllData);

// NEW: Fetch all therapeutic data for a specific trial
router.get("/trial/:trial_id/all-data", fetchAllTherapeuticData);

// NEW: Fetch all therapeutic trials with their associated data
router.get("/all-trials-with-data", fetchAllTherapeuticTrials);

// NEW: Delete all therapeutic data for a specific trial
router.delete(
  "/trial/:trial_id/:user_id/delete-all",
  deleteAllTherapeuticDataByTrial
);

// NEW: Delete all trials (dev only)
router.delete("/all-trials/dev", deleteAllTherapeuticTrialsDevOnly);

// Overview
router.post("/overview", createOverview);
router.get("/overview", listOverview);
router.get("/overview/:id", getOverview);
router.patch("/overview/:id", updateOverview);
router.post("/overview/:id/update", updateOverview);
router.delete("/overview/:id", deleteOverview);

// Outcome measured
router.post("/outcome", createOutcome);
router.get("/outcome", listOutcomes);
router.get("/outcome/trial/:trial_id", listOutcomesByTrial);
router.get("/outcome/:id", getOutcome);
router.patch("/outcome/:id", updateOutcome);
router.patch("/outcome/trial/:trial_id", updateOutcomeByTrial);
router.post("/outcome/trial/:trial_id/update", updateOutcomeByTrial);
router.delete("/outcome/:id", deleteOutcome);
router.delete("/outcome/trial/:trial_id", deleteOutcomeByTrial);

// Participation criteria
router.post("/criteria", createCriteria);
router.get("/criteria", listCriteria);
router.get("/criteria/trial/:trial_id", listCriteriaByTrial);
router.get("/criteria/:id", getCriteria);
router.patch("/criteria/:id", updateCriteria);
router.patch("/criteria/trial/:trial_id", updateCriteriaByTrial);
router.post("/criteria/trial/:trial_id/update", updateCriteriaByTrial);
router.delete("/criteria/:id", deleteCriteria);
router.delete("/criteria/trial/:trial_id", deleteCriteriaByTrial);

// Timing
router.post("/timing", createTiming);
router.get("/timing", listTiming);
router.get("/timing/trial/:trial_id", listTimingByTrial);
router.get("/timing/:id", getTiming);
router.patch("/timing/:id", updateTiming);
router.patch("/timing/trial/:trial_id", updateTimingByTrial);
router.post("/timing/trial/:trial_id/update", updateTimingByTrial);
router.delete("/timing/:id", deleteTiming);
router.delete("/timing/trial/:trial_id", deleteTimingByTrial);

// Results
router.post("/results", createResults);
router.get("/results", listResults);
router.get("/results/trial/:trial_id", listResultsByTrial);
router.get("/results/:id", getResults);
router.patch("/results/:id", updateResults);
router.patch("/results/trial/:trial_id", updateResultsByTrial);
router.post("/results/trial/:trial_id/update", updateResultsByTrial);
router.delete("/results/:id", deleteResults);
router.delete("/results/trial/:trial_id", deleteResultsByTrial);

// Sites
router.post("/sites", createSites);
router.get("/sites", listSites);
router.get("/sites/trial/:trial_id", listSitesByTrial);
router.get("/sites/:id", getSites);
router.patch("/sites/:id", updateSites);
router.patch("/sites/trial/:trial_id", updateSitesByTrial);
router.post("/sites/trial/:trial_id/update", updateSitesByTrial);
router.delete("/sites/:id", deleteSites);
router.delete("/sites/trial/:trial_id", deleteSitesByTrial);

// Other sources
router.post("/other", createOther);
router.get("/other", listOther);
router.get("/other/trial/:trial_id", listOtherByTrial);
router.get("/other/:id", getOther);
router.patch("/other/:id", updateOther);
router.patch("/other/trial/:trial_id", updateOtherByTrial);
router.delete("/other/:id", deleteOther);
router.delete("/other/trial/:trial_id", deleteOtherByTrial);

// Logs
router.post("/logs", createLog);
router.get("/logs", listLogs);
router.get("/logs/trial/:trial_id", listLogsByTrial);
router.get("/logs/:id", getLog);
router.patch("/logs/:id", updateLog);
router.patch("/logs/trial/:trial_id", updateLogsByTrial);
router.post("/logs/trial/:trial_id/update", updateLogsByTrial);
router.delete("/logs/:id", deleteLog);
router.delete("/logs/trial/:trial_id", deleteLogsByTrial);

// Notes
router.post("/notes", createNote);
router.get("/notes", listNotes);
router.get("/notes/trial/:trial_id", listNotesByTrial);
router.get("/notes/:id", getNote);
router.patch("/notes/:id", updateNote);
router.patch("/notes/trial/:trial_id", updateNotesByTrial);
router.delete("/notes/:id", deleteNote);
router.delete("/notes/trial/:trial_id", deleteNotesByTrial);

module.exports = router;
