const request = require("supertest");
const app = require("../app");
require("./setupTestDb");

describe("Users API", () => {
  const unique = Date.now();
  const baseUser = {
    username: `user_${unique}`,
    email: `user_${unique}@example.com`,
    password: "Secret123!",
  };

  let userId;
  let token;

  test("registerUser creates a user", async () => {
    const res = await request(app)
      .post("/api/v1/users/registerUser")
      .send(baseUser)
      .expect(201);
    expect(res.body.user).toBeDefined();
    userId = res.body.user.id;
  });

  test("loginUser returns token", async () => {
    const res = await request(app)
      .post("/api/v1/users/loginUser")
      .send({ email: baseUser.email, password: baseUser.password })
      .expect(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test("getAllUsers returns array", async () => {
    const res = await request(app).get("/api/v1/users/getAllUsers").expect(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  test("getUserById returns the user", async () => {
    const res = await request(app)
      .get(`/api/v1/users/getUserById/${userId}`)
      .expect(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(userId);
  });

  test("getUserByEmail returns the user", async () => {
    const res = await request(app)
      .get(`/api/v1/users/getUserByEmail/${encodeURIComponent(baseUser.email)}`)
      .expect(200);
    expect(res.body.user.email).toBe(baseUser.email);
  });

  test("updateUser updates user fields", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/updateUser/${userId}`)
      .send({ company: "Acme Inc." })
      .expect(200);
    expect(res.body.user.company).toBe("Acme Inc.");
  });

  test("deleteUser removes the user", async () => {
    await request(app).delete(`/api/v1/users/deleteUser/${userId}`).expect(200);
  });
});
