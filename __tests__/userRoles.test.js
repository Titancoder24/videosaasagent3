const request = require("supertest");
const app = require("../app");
require("./setupTestDb");

describe("User Roles API", () => {
  const unique = Date.now();
  const baseUser = {
    username: `ur_user_${unique}`,
    email: `ur_user_${unique}@example.com`,
    password: "Secret123!",
  };
  const actingUser = {
    username: `acting_user_${unique}`,
    email: `acting_user_${unique}@example.com`,
    password: "Secret123!",
  };
  const roleName = `URole_${unique}`;

  let userId;
  let actingUserId;
  let roleId;

  test("setup: create user", async () => {
    const res = await request(app)
      .post("/api/v1/users/registerUser")
      .send(baseUser)
      .expect(201);
    userId = res.body.user.id;
  });

  test("setup: create acting user", async () => {
    const res = await request(app)
      .post("/api/v1/users/registerUser")
      .send(actingUser)
      .expect(201);
    actingUserId = res.body.user.id;
  });

  test("setup: create role", async () => {
    const res = await request(app)
      .post(`/api/v1/roles/createRole/${actingUserId}`)
      .send({ role_name: roleName })
      .expect(201);
    roleId = res.body.role.id;
  });

  test("assignRole assigns a role to user", async () => {
    const res = await request(app)
      .post(`/api/v1/user-roles/assignRole/${actingUserId}`)
      .send({ user_id: userId, role_id: roleId })
      .expect(201);
    expect(res.body.assignment).toBeDefined();
  });

  test("getUserRoles returns assigned roles", async () => {
    const res = await request(app)
      .get(`/api/v1/user-roles/getUserRoles/${userId}`)
      .expect(200);
    expect(Array.isArray(res.body.roles)).toBe(true);
  });

  test("getUsersWithRole returns users", async () => {
    const res = await request(app)
      .get(`/api/v1/user-roles/getUsersWithRole/${roleId}`)
      .expect(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  test("removeRole removes assignment", async () => {
    await request(app)
      .delete(`/api/v1/user-roles/removeRole/${actingUserId}`)
      .send({ user_id: userId, role_id: roleId })
      .expect(200);
  });
});
