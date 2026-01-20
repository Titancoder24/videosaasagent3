const request = require("supertest");
const app = require("../app");
require("./setupTestDb");

describe("Therapeutic API", () => {
  let overviewId;

  test("create overview", async () => {
    const payload = {
      therapeutic_area: "Oncology",
      trial_identifier: ["NCT12345"],
      trial_phase: "Phase II",
      status: "Recruiting",
      title: "A trial title",
      region: "NA",
    };
    const res = await request(app)
      .post("/api/v1/therapeutic/overview")
      .send(payload)
      .expect(201);
    overviewId = res.body.overview.id;
  });

  test("list overview", async () => {
    const res = await request(app)
      .get("/api/v1/therapeutic/overview")
      .expect(200);
    expect(Array.isArray(res.body.overviews)).toBe(true);
  });

  test("get overview", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/overview/${overviewId}`)
      .expect(200);
    expect(res.body.overview.id).toBe(overviewId);
  });

  test("update overview", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/overview/${overviewId}`)
      .send({ status: "Completed" })
      .expect(200);
    expect(res.body.overview.status).toBe("Completed");
  });

  // Outcome measured
  let outcomeId;
  test("create outcome", async () => {
    const payload = {
      trial_id: overviewId,
      purpose_of_trial: "Test purpose",
      primary_outcome_measure: "Response rate",
      number_of_arms: 2,
    };
    const res = await request(app)
      .post("/api/v1/therapeutic/outcome")
      .send(payload)
      .expect(201);
    outcomeId = res.body.outcome.id;
  });

  test("list outcomes", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/outcome?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.outcomes)).toBe(true);
  });

  test("get outcome", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/outcome/${outcomeId}`)
      .expect(200);
    expect(res.body.outcome.id).toBe(outcomeId);
  });

  test("update outcome", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/outcome/${outcomeId}`)
      .send({ summary: "Updated" })
      .expect(200);
    expect(res.body.outcome.summary).toBe("Updated");
  });

  // Participation criteria
  let criteriaId;
  test("create criteria", async () => {
    const payload = {
      trial_id: overviewId,
      inclusion_criteria: "Adults 18+",
      target_no_volunteers: 100,
    };
    const res = await request(app)
      .post("/api/v1/therapeutic/criteria")
      .send(payload)
      .expect(201);
    criteriaId = res.body.criteria.id;
  });

  test("list criteria", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/criteria?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.criteria)).toBe(true);
  });

  test("get criteria", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/criteria/${criteriaId}`)
      .expect(200);
    expect(res.body.criteria.id).toBe(criteriaId);
  });

  test("update criteria", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/criteria/${criteriaId}`)
      .send({ exclusion_criteria: "Pregnant" })
      .expect(200);
    expect(res.body.criteria.exclusion_criteria).toBe("Pregnant");
  });

  // Timing
  let timingId;
  test("create timing", async () => {
    const payload = {
      trial_id: overviewId,
      start_date_actual: "2024-01-01",
      start_date_benchmark: "2023-12-01",
    };
    const res = await request(app)
      .post("/api/v1/therapeutic/timing")
      .send(payload)
      .expect(201);
    timingId = res.body.timing.id;
  });

  test("list timing", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/timing?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.timings)).toBe(true);
  });

  test("get timing", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/timing/${timingId}`)
      .expect(200);
    expect(res.body.timing.id).toBe(timingId);
  });

  test("update timing", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/timing/${timingId}`)
      .send({ trial_end_date_estimated: "2026-06-01" })
      .expect(200);
    // Check if the date field was updated (handle timezone issues)
    const returnedDate = res.body.timing.trial_end_date_estimated;
    expect(returnedDate).toBeDefined();
    expect(
      returnedDate.includes("2026-06-01") || returnedDate.includes("2026-05-31")
    ).toBe(true);
  });

  // Results
  let resultsId;
  test("create results", async () => {
    const payload = {
      trial_id: overviewId,
      trial_outcome: "Positive",
      trial_results: ["metric1", "metric2"],
    };
    const res = await request(app)
      .post("/api/v1/therapeutic/results")
      .send(payload)
      .expect(201);
    resultsId = res.body.results.id;
  });

  test("list results", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/results?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test("get results", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/results/${resultsId}`)
      .expect(200);
    expect(res.body.results.id).toBe(resultsId);
  });

  test("update results", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/results/${resultsId}`)
      .send({ trial_outcome: "Neutral" })
      .expect(200);
    expect(res.body.results.trial_outcome).toBe("Neutral");
  });

  // Sites
  let sitesId;
  test("create sites", async () => {
    const payload = { trial_id: overviewId, total: 5 };
    const res = await request(app)
      .post("/api/v1/therapeutic/sites")
      .send(payload)
      .expect(201);
    sitesId = res.body.sites.id;
  });

  test("list sites", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/sites?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.sites)).toBe(true);
  });

  test("get sites", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/sites/${sitesId}`)
      .expect(200);
    expect(res.body.sites.id).toBe(sitesId);
  });

  test("update sites", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/sites/${sitesId}`)
      .send({ notes: "Updated" })
      .expect(200);
    expect(res.body.sites.notes).toBe("Updated");
  });

  // Other sources
  let otherId;
  test("create other source", async () => {
    const payload = { trial_id: overviewId, data: "Source text" };
    const res = await request(app)
      .post("/api/v1/therapeutic/other")
      .send(payload)
      .expect(201);
    otherId = res.body.other.id;
  });

  test("list other sources", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/other?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.other_sources)).toBe(true);
  });

  test("get other source", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/other/${otherId}`)
      .expect(200);
    expect(res.body.other.id).toBe(otherId);
  });

  test("update other source", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/other/${otherId}`)
      .send({ data: "Updated data" })
      .expect(200);
    expect(res.body.other.data).toBe("Updated data");
  });

  // Logs
  let logId;
  test("create log", async () => {
    const payload = { trial_id: overviewId, trial_changes_log: "Initial log" };
    const res = await request(app)
      .post("/api/v1/therapeutic/logs")
      .send(payload)
      .expect(201);
    logId = res.body.log.id;
  });

  test("list logs", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/logs?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  test("get log", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/logs/${logId}`)
      .expect(200);
    expect(res.body.log.id).toBe(logId);
  });

  test("update log", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/logs/${logId}`)
      .send({ last_modified_user: "tester" })
      .expect(200);
    expect(res.body.log.last_modified_user).toBe("tester");
  });

  // Notes
  let noteId;
  test("create note", async () => {
    const payload = { trial_id: overviewId, notes: "Note 1" };
    const res = await request(app)
      .post("/api/v1/therapeutic/notes")
      .send(payload)
      .expect(201);
    noteId = res.body.note.id;
  });

  test("list notes", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/notes?trial_id=${overviewId}`)
      .expect(200);
    expect(Array.isArray(res.body.notes)).toBe(true);
  });

  test("get note", async () => {
    const res = await request(app)
      .get(`/api/v1/therapeutic/notes/${noteId}`)
      .expect(200);
    expect(res.body.note.id).toBe(noteId);
  });

  test("update note", async () => {
    const res = await request(app)
      .patch(`/api/v1/therapeutic/notes/${noteId}`)
      .send({ link: "https://example.com" })
      .expect(200);
    expect(res.body.note.link).toBe("https://example.com");
  });
});
