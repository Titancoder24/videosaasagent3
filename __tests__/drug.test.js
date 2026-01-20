const request = require("supertest");
const app = require("../app");

describe("Drug Management API", () => {
  let userId;
  let overviewId;
  let devStatusId;
  let activityId;
  let developmentId;
  let otherSourcesId;
  let licencesMarketingId;
  let logsId;

  const baseUser = {
    username: "drugtest_user",
    email: "drugtest@example.com",
    password: "TestPassword123!",
    company: "PharmaCorp",
    designation: "Researcher",
    phone: "+1234567890",
    country: "US",
    region: "CA",
    sex: "M",
    age: 35,
    plan: "Premium",
  };

  const baseDrugOverview = {
    drug_name: "Test Drug Alpha",
    generic_name: "alpha-compound",
    other_name: "Alpha-123",
    primary_name: "Test Drug Alpha",
    global_status: "In Development",
    development_status: "Phase II",
    drug_summary: "A novel therapeutic compound for testing",
    originator: "PharmaCorp",
    other_active_companies: "BioTech Inc, MedCorp",
    therapeutic_area: "Oncology",
    disease_type: "Cancer",
    regulator_designations: "Fast Track",
    source_link: "https://example.com/drug-alpha",
    drug_record_status: "Active",
    is_approved: false,
  };

  // Setup: Create a test user
  beforeAll(async () => {
    // First create a user without activity logging
    const res = await request(app)
      .post("/api/v1/users/registerUser")
      .send(baseUser);

    if (res.status !== 201) {
      console.error("Failed to create test user:", res.body);
      throw new Error("Test user creation failed");
    }

    userId = res.body.user.id;
    console.log("Test user created with ID:", userId);
  });

  // ==================== DRUG OVERVIEW TESTS ====================
  describe("Drug Overview", () => {
    test("createOverview creates a drug overview", async () => {
      const res = await request(app)
        .post("/api/v1/drug/overview")
        .send({
          user_id: userId,
          ...baseDrugOverview,
        });

      if (res.status !== 201) {
        console.error("Failed to create drug overview:", res.body);
        console.error("Request data:", {
          user_id: userId,
          ...baseDrugOverview,
        });
      }

      expect(res.status).toBe(201);
      expect(res.body.overview).toBeDefined();
      expect(res.body.overview.drug_name).toBe(baseDrugOverview.drug_name);
      expect(res.body.overview.is_approved).toBe(false);
      overviewId = res.body.overview.id;
      console.log("Drug overview created with ID:", overviewId);
    });

    test("createOverview requires user_id", async () => {
      await request(app)
        .post("/api/v1/drug/overview")
        .send(baseDrugOverview)
        .expect(400);
    });

    test("listOverview returns array", async () => {
      const res = await request(app).get("/api/v1/drug/overview").expect(200);
      expect(Array.isArray(res.body.overviews)).toBe(true);
      expect(res.body.overviews.length).toBeGreaterThan(0);
    });

    test("getOverview returns the overview", async () => {
      const res = await request(app)
        .get(`/api/v1/drug/overview/${overviewId}`)
        .expect(200);
      expect(res.body.overview.id).toBe(overviewId);
      expect(res.body.overview.drug_name).toBe(baseDrugOverview.drug_name);
    });

    test("updateOverview updates drug overview", async () => {
      const updateData = {
        user_id: userId,
        development_status: "Phase III",
        global_status: "Advanced Development",
      };

      const res = await request(app)
        .patch(`/api/v1/drug/overview/${overviewId}`)
        .send(updateData)
        .expect(200);

      expect(res.body.overview.development_status).toBe("Phase III");
      expect(res.body.overview.global_status).toBe("Advanced Development");
    });

    test("updateOverview requires user_id", async () => {
      await request(app)
        .patch(`/api/v1/drug/overview/${overviewId}`)
        .send({ development_status: "Phase IV" })
        .expect(400);
    });

    test("deleteOverview removes the overview", async () => {
      // Create a new overview for deletion test
      const createRes = await request(app)
        .post("/api/v1/drug/overview")
        .send({
          user_id: userId,
          drug_name: "Delete Test Drug",
          development_status: "Preclinical",
        })
        .expect(201);

      const deleteId = createRes.body.overview.id;

      await request(app)
        .delete(`/api/v1/drug/overview/${deleteId}`)
        .send({ user_id: userId })
        .expect(200);
    });

    test("deleteOverview requires user_id", async () => {
      await request(app)
        .delete(`/api/v1/drug/overview/${overviewId}`)
        .send({})
        .expect(400);
    });
  });

  // ==================== DEV STATUS TESTS ====================
  describe("Drug Dev Status", () => {
    const baseDevStatus = {
      disease_type: "Solid Tumors",
      therapeutic_class: "Kinase Inhibitor",
      company: "PharmaCorp",
      company_type: "Pharmaceutical",
      status: "Phase II",
      reference: { study_id: "PHC-2024-001", protocol: "v2.1" },
    };

    test("createDevStatus creates dev status", async () => {
      const res = await request(app)
        .post("/api/v1/drug/dev-status")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          ...baseDevStatus,
        })
        .expect(201);

      expect(res.body.devStatus).toBeDefined();
      expect(res.body.devStatus.disease_type).toBe(baseDevStatus.disease_type);
      devStatusId = res.body.devStatus.id;
    });

    test("listDevStatus returns array", async () => {
      const res = await request(app).get("/api/v1/drug/dev-status").expect(200);
      expect(Array.isArray(res.body.devStatus)).toBe(true);
    });

    test("listDevStatusByDrug returns dev status for drug", async () => {
      if (!overviewId) {
        console.log("Skipping test - overviewId is undefined");
        return;
      }

      const res = await request(app)
        .get(`/api/v1/drug/dev-status/drug/${overviewId}`)
        .expect(200);
      expect(Array.isArray(res.body.devStatus)).toBe(true);
      expect(res.body.devStatus.length).toBeGreaterThan(0);
    });

    test("getDevStatus returns the dev status", async () => {
      const res = await request(app)
        .get(`/api/v1/drug/dev-status/${devStatusId}`)
        .expect(200);
      expect(res.body.devStatus.id).toBe(devStatusId);
    });

    test("updateDevStatus updates status", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/dev-status/${devStatusId}`)
        .send({
          user_id: userId,
          status: "Phase III",
        })
        .expect(200);

      expect(res.body.devStatus.status).toBe("Phase III");
    });

    test("updateDevStatusByDrug updates by drug ID", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/dev-status/drug/${overviewId}`)
        .send({
          user_id: userId,
          company_type: "Biotech",
        })
        .expect(200);

      expect(Array.isArray(res.body.devStatus)).toBe(true);
    });
  });

  // ==================== DRUG ACTIVITY TESTS ====================
  describe("Drug Activity", () => {
    const baseActivity = {
      mechanism_of_action: "Inhibits target protein kinase",
      biological_target: "EGFR, HER2",
      drug_technology: "Small molecule",
      delivery_route: "Oral",
      delivery_medium: "Tablet",
    };

    test("createActivity creates drug activity", async () => {
      const res = await request(app)
        .post("/api/v1/drug/activity")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          ...baseActivity,
        })
        .expect(201);

      expect(res.body.activity).toBeDefined();
      expect(res.body.activity.mechanism_of_action).toBe(
        baseActivity.mechanism_of_action
      );
      activityId = res.body.activity.id;
    });

    test("listActivity returns array", async () => {
      const res = await request(app).get("/api/v1/drug/activity").expect(200);
      expect(Array.isArray(res.body.activities)).toBe(true);
    });

    test("listActivityByDrug returns activities for drug", async () => {
      const res = await request(app)
        .get(`/api/v1/drug/activity/drug/${overviewId}`)
        .expect(200);
      expect(Array.isArray(res.body.activities)).toBe(true);
    });

    test("updateActivity updates activity", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/activity/${activityId}`)
        .send({
          user_id: userId,
          delivery_route: "Intravenous",
        })
        .expect(200);

      expect(res.body.activity.delivery_route).toBe("Intravenous");
    });
  });

  // ==================== DEVELOPMENT TESTS ====================
  describe("Drug Development", () => {
    const baseDevelopment = {
      preclinical: "Completed Q1 2023",
      trial_id: "NCT12345678",
      title: "Phase II Study of Test Drug Alpha",
      primary_drugs: "Test Drug Alpha",
      status: "Recruiting",
      sponsor: "PharmaCorp",
    };

    test("createDevelopment creates development record", async () => {
      const res = await request(app)
        .post("/api/v1/drug/development")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          ...baseDevelopment,
        })
        .expect(201);

      expect(res.body.development).toBeDefined();
      expect(res.body.development.trial_id).toBe(baseDevelopment.trial_id);
      developmentId = res.body.development.id;
    });

    test("listDevelopment returns array", async () => {
      const res = await request(app)
        .get("/api/v1/drug/development")
        .expect(200);
      expect(Array.isArray(res.body.developments)).toBe(true);
    });

    test("updateDevelopment updates development", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/development/${developmentId}`)
        .send({
          user_id: userId,
          status: "Active",
        })
        .expect(200);

      expect(res.body.development.status).toBe("Active");
    });
  });

  // ==================== OTHER SOURCES TESTS ====================
  describe("Drug Other Sources", () => {
    test("createOtherSources creates other sources record", async () => {
      const res = await request(app)
        .post("/api/v1/drug/other-sources")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          data: "Additional data from external sources",
        })
        .expect(201);

      expect(res.body.otherSources).toBeDefined();
      expect(res.body.otherSources.data).toBe(
        "Additional data from external sources"
      );
      otherSourcesId = res.body.otherSources.id;
    });

    test("listOtherSources returns array", async () => {
      const res = await request(app)
        .get("/api/v1/drug/other-sources")
        .expect(200);
      expect(Array.isArray(res.body.otherSources)).toBe(true);
    });

    test("updateOtherSources updates data", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/other-sources/${otherSourcesId}`)
        .send({
          user_id: userId,
          data: "Updated external data",
        })
        .expect(200);

      expect(res.body.otherSources.data).toBe("Updated external data");
    });
  });

  // ==================== LICENCES MARKETING TESTS ====================
  describe("Drug Licences Marketing", () => {
    const baseLicences = {
      agreement: "Exclusive licensing agreement",
      licensing_availability: "Available in EU, US",
      marketing_approvals: "FDA approved, EMA pending",
    };

    test("createLicencesMarketing creates licences record", async () => {
      const res = await request(app)
        .post("/api/v1/drug/licences-marketing")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          ...baseLicences,
        })
        .expect(201);

      expect(res.body.licencesMarketing).toBeDefined();
      expect(res.body.licencesMarketing.agreement).toBe(baseLicences.agreement);
      licencesMarketingId = res.body.licencesMarketing.id;
    });

    test("listLicencesMarketing returns array", async () => {
      const res = await request(app)
        .get("/api/v1/drug/licences-marketing")
        .expect(200);
      expect(Array.isArray(res.body.licencesMarketing)).toBe(true);
    });

    test("updateLicencesMarketing updates licences", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/licences-marketing/${licencesMarketingId}`)
        .send({
          user_id: userId,
          marketing_approvals: "FDA approved, EMA approved",
        })
        .expect(200);

      expect(res.body.licencesMarketing.marketing_approvals).toBe(
        "FDA approved, EMA approved"
      );
    });
  });

  // ==================== LOGS TESTS ====================
  describe("Drug Logs", () => {
    const baseLogs = {
      drug_changes_log: "Initial drug record created",
      created_date: "2024-01-15",
      last_modified_user: "researcher@pharmacorp.com",
      full_review_user: "reviewer@pharmacorp.com",
      next_review_date: "2024-07-15",
      notes: "First comprehensive review completed",
    };

    test("createLogs creates logs record", async () => {
      const res = await request(app)
        .post("/api/v1/drug/logs")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          ...baseLogs,
        })
        .expect(201);

      expect(res.body.logs).toBeDefined();
      expect(res.body.logs.drug_changes_log).toBe(baseLogs.drug_changes_log);
      logsId = res.body.logs.id;
    });

    test("listLogs returns array", async () => {
      const res = await request(app).get("/api/v1/drug/logs").expect(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    test("listLogsByDrug returns logs for drug", async () => {
      const res = await request(app)
        .get(`/api/v1/drug/logs/drug/${overviewId}`)
        .expect(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    test("updateLogs updates logs", async () => {
      const res = await request(app)
        .patch(`/api/v1/drug/logs/${logsId}`)
        .send({
          user_id: userId,
          notes: "Updated review notes with additional findings",
        })
        .expect(200);

      expect(res.body.logs.notes).toBe(
        "Updated review notes with additional findings"
      );
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe("Error Handling", () => {
    test("returns 404 for non-existent overview", async () => {
      await request(app)
        .get("/api/v1/drug/overview/00000000-0000-0000-0000-000000000999")
        .expect(404);
    });

    test("returns 404 for non-existent dev status", async () => {
      await request(app)
        .get("/api/v1/drug/dev-status/00000000-0000-0000-0000-000000000999")
        .expect(404);
    });

    test("requires user_id for all CUD operations", async () => {
      // Test create without user_id
      await request(app)
        .post("/api/v1/drug/activity")
        .send({ drug_over_id: overviewId, mechanism_of_action: "Test" })
        .expect(400);

      // Test update without user_id
      await request(app)
        .patch(`/api/v1/drug/activity/${activityId}`)
        .send({ mechanism_of_action: "Updated" })
        .expect(400);

      // Test delete without user_id
      await request(app)
        .delete(`/api/v1/drug/activity/${activityId}`)
        .send({})
        .expect(400);
    });
  });

  // ==================== BULK OPERATIONS BY DRUG ID ====================
  describe("Bulk Operations by Drug ID", () => {
    test("deleteByDrugId operations work correctly", async () => {
      // Delete all dev status records for the drug
      const res = await request(app)
        .delete(`/api/v1/drug/dev-status/drug/${overviewId}`)
        .send({ user_id: userId })
        .expect(200);

      expect(res.body.deleted).toBeGreaterThanOrEqual(0);
    });

    test("updateByDrugId operations work correctly", async () => {
      // Create a new activity for bulk update test
      await request(app)
        .post("/api/v1/drug/activity")
        .send({
          user_id: userId,
          drug_over_id: overviewId,
          mechanism_of_action: "Bulk test",
        })
        .expect(201);

      // Update all activities for the drug
      const res = await request(app)
        .patch(`/api/v1/drug/activity/drug/${overviewId}`)
        .send({
          user_id: userId,
          delivery_route: "Bulk Updated Route",
        })
        .expect(200);

      expect(Array.isArray(res.body.activities)).toBe(true);
    });
  });

  // ==================== CLEANUP ====================
  describe("Cleanup", () => {
    test("delete all created records", async () => {
      // Delete individual records
      const recordsToDelete = [
        { endpoint: "activity", id: activityId },
        { endpoint: "development", id: developmentId },
        { endpoint: "other-sources", id: otherSourcesId },
        { endpoint: "licences-marketing", id: licencesMarketingId },
        { endpoint: "logs", id: logsId },
      ];

      for (const record of recordsToDelete) {
        if (record.id) {
          await request(app)
            .delete(`/api/v1/drug/${record.endpoint}/${record.id}`)
            .send({ user_id: userId })
            .expect(200);
        }
      }

      // Finally delete the overview (this will cascade delete related records)
      await request(app)
        .delete(`/api/v1/drug/overview/${overviewId}`)
        .send({ user_id: userId })
        .expect(200);
    });
  });
});
