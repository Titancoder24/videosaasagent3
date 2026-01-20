const { pool } = require("../infrastructure/PgDB/connect");

class RoleRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(roleName) {
    const query = `INSERT INTO "roles" (role_name) VALUES ($1) RETURNING *`;
    const result = await this.pool.query(query, [roleName]);
    return result.rows[0];
  }

  async findAll() {
    const query = `SELECT * FROM "roles" ORDER BY role_name`;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async findById(id) {
    const query = `SELECT * FROM "roles" WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByName(roleName) {
    const query = `SELECT * FROM "roles" WHERE role_name = $1 LIMIT 1`;
    const result = await this.pool.query(query, [roleName]);
    return result.rows[0] || null;
  }

  async update(id, roleName) {
    const query = `UPDATE "roles" SET role_name = $2 WHERE id = $1 RETURNING *`;
    const result = await this.pool.query(query, [id, roleName]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = `DELETE FROM "roles" WHERE id = $1 RETURNING id`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

module.exports = { RoleRepository };
