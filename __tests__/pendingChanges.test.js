const request = require("supertest");
const app = require("../app");
require("./setupTestDb");

describe("Pending Changes API", () => {
  const unique = Date.now();
  const baseUser = {
    username: `pc_user_${unique}`,
    email: `pc_user_${unique}@example.com`,
    password: "Secret123!",
  };

  let submitterId;
  let changeId;

  test("setup: create submitter user", async () => {
    const res = await request(app)
      .post("/api/v1/users/registerUser")
      .send(baseUser)
      .expect(201);
    submitterId = res.body.user.id;
  });

  test("submitChange creates a pending change", async () => {
    const payload = {
      target_table: "users",
      target_record_id: null,
      proposed_data: { username: "new_user_x" },
      change_type: "INSERT",
      submitted_by: submitterId,
    };
    const res = await request(app)
      .post("/api/v1/pending-changes/submitChange")
      .send(payload)
      .expect(201);
    changeId = res.body.change.id;
  });

  test("listChanges returns items", async () => {
    const res = await request(app)
      .get("/api/v1/pending-changes/listChanges")
      .expect(200);
    expect(Array.isArray(res.body.changes)).toBe(true);
  });

  test("getChangeById returns the change", async () => {
    const res = await request(app)
      .get(`/api/v1/pending-changes/getChangeById/${changeId}`)
      .expect(200);
    expect(res.body.change.id).toBe(changeId);
  });

  test("approveChange marks as approved", async () => {
    const res = await request(app)
      .post(`/api/v1/pending-changes/approveChange/${changeId}`)
      .send({ approved_by: submitterId })
      .expect(200);
    expect(res.body.change.is_approved).toBe(true);
  });

  test("rejectChange marks as rejected", async () => {
    // create another change for rejection
    const payload = {
      target_table: "users",
      target_record_id: null,
      proposed_data: { username: "another_user_x" },
      change_type: "INSERT",
      submitted_by: submitterId,
    };
    const created = await request(app)
      .post("/api/v1/pending-changes/submitChange")
      .send(payload)
      .expect(201);
    const newId = created.body.change.id;
    const res = await request(app)
      .post(`/api/v1/pending-changes/rejectChange/${newId}`)
      .send({ approved_by: submitterId, rejection_reason: "test" })
      .expect(200);
    expect(res.body.change.rejected).toBe(true);
  });

  test("deleteChange removes the change", async () => {
    await request(app)
      .delete(`/api/v1/pending-changes/deleteChange/${changeId}`)
      .expect(200);
  });
});
