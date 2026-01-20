const request = require("supertest");
const app = require("../app");
require("./setupTestDb");

describe("Roles API", () => {
  const roleName = `Role_${Date.now()}`;
  const testUserId = "00000000-0000-0000-0000-000000000001"; // Test user ID for activity logging
  let roleId;

  test("createRole creates a role", async () => {
    const res = await request(app)
      .post(`/api/v1/roles/createRole/${testUserId}`)
      .send({ role_name: roleName })
      .expect(201);
    expect(res.body.role.role_name).toBe(roleName);
    roleId = res.body.role.id;
  });

  test("getAllRoles returns array", async () => {
    const res = await request(app).get("/api/v1/roles/getAllRoles").expect(200);
    expect(Array.isArray(res.body.roles)).toBe(true);
  });

  test("getRoleById returns the role", async () => {
    const res = await request(app)
      .get(`/api/v1/roles/getRoleById/${roleId}`)
      .expect(200);
    expect(res.body.role.id).toBe(roleId);
  });

  test("updateRole updates role_name", async () => {
    const updatedName = roleName + "_Updated";
    const res = await request(app)
      .patch(`/api/v1/roles/updateRole/${roleId}/${testUserId}`)
      .send({ role_name: updatedName })
      .expect(200);
    expect(res.body.role.role_name).toBe(updatedName);
  });

  test("deleteRole removes the role", async () => {
    await request(app)
      .delete(`/api/v1/roles/deleteRole/${roleId}/${testUserId}`)
      .expect(200);
  });
});
