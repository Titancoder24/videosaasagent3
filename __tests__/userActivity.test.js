const request = require("supertest");
const app = require("../app");
require("./setupTestDb");

describe("User Activity API", () => {
  const unique = Date.now();
  const baseUser = {
    username: `ua_user_${unique}`,
    email: `ua_user_${unique}@example.com`,
    password: "Secret123!",
  };

  let userId;

  test("setup: create user", async () => {
    const res = await request(app)
      .post("/api/v1/users/registerUser")
      .send(baseUser)
      .expect(201);
    userId = res.body.user.id;
  });

  test("logActivity creates entry", async () => {
    const payload = {
      user_id: userId,
      table_name: "users",
      record_id: userId,
      action_type: "INSERT",
      change_details: { example: true },
    };
    const res = await request(app)
      .post("/api/v1/user-activity/logActivity")
      .send(payload)
      .expect(201);
    expect(res.body.activity).toBeDefined();
  });

  test("listUserActivity returns entries", async () => {
    const res = await request(app)
      .get(`/api/v1/user-activity/listUserActivity/${userId}`)
      .expect(200);
    expect(Array.isArray(res.body.activity)).toBe(true);
  });

  test("listActivity filters by table_name", async () => {
    const res = await request(app)
      .get("/api/v1/user-activity/listActivity?table_name=users")
      .expect(200);
    expect(Array.isArray(res.body.activity)).toBe(true);
  });
});
