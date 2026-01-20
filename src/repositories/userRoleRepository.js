const { pool } = require("../infrastructure/PgDB/connect");

class UserRoleRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async assignRole(userId, roleId) {
    const query = `
      INSERT INTO "user_roles" (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [userId, roleId]);
    return result.rows[0] || null; // null if already exists
  }

  async removeRole(userId, roleId) {
    const query = `DELETE FROM "user_roles" WHERE user_id = $1 AND role_id = $2 RETURNING id`;
    const result = await this.pool.query(query, [userId, roleId]);
    return result.rowCount > 0;
  }

  async getUserRoles(userId) {
    const query = `
      SELECT ur.id, ur.user_id, ur.role_id, r.role_name
      FROM "user_roles" ur
      JOIN "roles" r ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.role_name
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getUsersWithRole(roleId) {
    const query = `
      SELECT ur.id, ur.user_id, ur.role_id
      FROM "user_roles" ur
      WHERE ur.role_id = $1
    `;
    const result = await this.pool.query(query, [roleId]);
    return result.rows;
  }

  async getAllUserRoles() {
    const query = `
      SELECT 
        ur.id, 
        ur.user_id, 
        ur.role_id,
        u.username,
        u.email,
        r.role_name
      FROM "user_roles" ur
      JOIN "users" u ON ur.user_id = u.id
      JOIN "roles" r ON ur.role_id = r.id
      ORDER BY u.username, r.role_name
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async deleteAllUserRoles(userId) {
    const query = `DELETE FROM "user_roles" WHERE user_id = $1 RETURNING *`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = { UserRoleRepository };
