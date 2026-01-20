const express = require("express");
const router = express.Router();

const {
  // Comprehensive Drug Operations
  createDrugWithAllData,
  fetchAllDrugData,
  fetchAllDrugs,
  fetchDrugsPaginated,
  updateDrugWithAllData,
  deleteAllDrugDataByDrugId, // NEW endpoint
  searchDrugs,
  getDrugsByTherapeuticAreaWithData,
  getDrugsByApprovalStatusWithData,
  getDrugsByTherapeuticArea,
  getDrugsByApprovalStatus,

  // Overview
  createOverview,
  listOverview,
  getOverview,
  updateOverview,
  deleteOverview,

  // Dev Status
  createDevStatus,
  listDevStatus,
  listDevStatusByDrug,
  getDevStatus,
  updateDevStatus,
  updateDevStatusByDrug,
  deleteDevStatus,
  deleteDevStatusByDrug,

  // Activity
  createActivity,
  listActivity,
  listActivityByDrug,
  getActivity,
  updateActivity,
  updateActivityByDrug,
  deleteActivity,
  deleteActivityByDrug,

  // Development
  createDevelopment,
  listDevelopment,
  listDevelopmentByDrug,
  getDevelopment,
  updateDevelopment,
  updateDevelopmentByDrug,
  deleteDevelopment,
  deleteDevelopmentByDrug,

  // Other Sources
  createOtherSources,
  listOtherSources,
  listOtherSourcesByDrug,
  getOtherSources,
  updateOtherSources,
  updateOtherSourcesByDrug,
  deleteOtherSources,
  deleteOtherSourcesByDrug,

  // Licences Marketing
  createLicencesMarketing,
  listLicencesMarketing,
  listLicencesMarketingByDrug,
  getLicencesMarketing,
  updateLicencesMarketing,
  updateLicencesMarketingByDrug,
  deleteLicencesMarketing,
  deleteLicencesMarketingByDrug,

  // Logs
  createLogs,
  listLogs,
  listLogsByDrug,
  getLogs,
  updateLogs,
  updateLogsByDrug,
  deleteLogs,
  deleteLogsByDrug,
} = require("../controllers/drugController");

// ==================== COMPREHENSIVE DRUG OPERATIONS ====================
router.post("/create-drug", createDrugWithAllData);
router.get("/drug/:drug_over_id/all-data", fetchAllDrugData);
router.get("/all-drugs-with-data", fetchAllDrugs);
router.get("/paginated", fetchDrugsPaginated);
router.put("/drug/:drug_over_id/update-all-data", updateDrugWithAllData);
router.delete("/:drug_over_id/:user_id/delete-all", deleteAllDrugDataByDrugId);

// ==================== SEARCH & FILTER ROUTES ====================
router.get("/search", searchDrugs);
router.get(
  "/therapeutic-area/:therapeutic_area/with-data",
  getDrugsByTherapeuticAreaWithData
);
router.get(
  "/approval-status/:status/with-data",
  getDrugsByApprovalStatusWithData
);
// Backward compatibility routes (simple data only)
router.get("/therapeutic-area/:therapeutic_area", getDrugsByTherapeuticArea);
router.get("/approval-status/:status", getDrugsByApprovalStatus);

// ==================== DRUG OVERVIEW ====================
router.post("/overview", createOverview);
router.get("/overview", listOverview);
router.get("/overview/:id", getOverview);
router.patch("/overview/:id", updateOverview);
router.delete("/overview/:id", deleteOverview);

// ==================== DEV STATUS ====================
router.post("/dev-status", createDevStatus);
router.get("/dev-status", listDevStatus);
router.get("/dev-status/drug/:drug_id", listDevStatusByDrug);
router.get("/dev-status/:id", getDevStatus);
router.patch("/dev-status/:id", updateDevStatus);
router.patch("/dev-status/drug/:drug_id", updateDevStatusByDrug);
router.delete("/dev-status/:id", deleteDevStatus);
router.delete("/dev-status/drug/:drug_id", deleteDevStatusByDrug);

// ==================== ACTIVITY ====================
router.post("/activity", createActivity);
router.get("/activity", listActivity);
router.get("/activity/drug/:drug_id", listActivityByDrug);
router.get("/activity/:id", getActivity);
router.patch("/activity/:id", updateActivity);
router.patch("/activity/drug/:drug_id", updateActivityByDrug);
router.delete("/activity/:id", deleteActivity);
router.delete("/activity/drug/:drug_id", deleteActivityByDrug);

// ==================== DEVELOPMENT ====================
router.post("/development", createDevelopment);
router.get("/development", listDevelopment);
router.get("/development/drug/:drug_id", listDevelopmentByDrug);
router.get("/development/:id", getDevelopment);
router.patch("/development/:id", updateDevelopment);
router.patch("/development/drug/:drug_id", updateDevelopmentByDrug);
router.delete("/development/:id", deleteDevelopment);
router.delete("/development/drug/:drug_id", deleteDevelopmentByDrug);

// ==================== OTHER SOURCES ====================
router.post("/other-sources", createOtherSources);
router.get("/other-sources", listOtherSources);
router.get("/other-sources/drug/:drug_id", listOtherSourcesByDrug);
router.get("/other-sources/:id", getOtherSources);
router.patch("/other-sources/:id", updateOtherSources);
router.patch("/other-sources/drug/:drug_id", updateOtherSourcesByDrug);
router.delete("/other-sources/:id", deleteOtherSources);
router.delete("/other-sources/drug/:drug_id", deleteOtherSourcesByDrug);

// ==================== LICENCES & MARKETING ====================
router.post("/licences-marketing", createLicencesMarketing);
router.get("/licences-marketing", listLicencesMarketing);
router.get("/licences-marketing/drug/:drug_id", listLicencesMarketingByDrug);
router.get("/licences-marketing/:id", getLicencesMarketing);
router.patch("/licences-marketing/:id", updateLicencesMarketing);
router.patch(
  "/licences-marketing/drug/:drug_id",
  updateLicencesMarketingByDrug
);
router.delete("/licences-marketing/:id", deleteLicencesMarketing);
router.delete(
  "/licences-marketing/drug/:drug_id",
  deleteLicencesMarketingByDrug
);

// ==================== LOGS ====================
router.post("/logs", createLogs);
router.get("/logs", listLogs);
router.get("/logs/drug/:drug_id", listLogsByDrug);
router.get("/logs/:id", getLogs);
router.patch("/logs/:id", updateLogs);
router.patch("/logs/drug/:drug_id", updateLogsByDrug);
router.delete("/logs/:id", deleteLogs);
router.delete("/logs/drug/:drug_id", deleteLogsByDrug);

module.exports = router;
