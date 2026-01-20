const { pool } = require("../infrastructure/PgDB/connect");

class UserActivityRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async log({ user_id, table_name, record_id, action_type, change_details }) {
    const query = `
      INSERT INTO "user_activity" (user_id, table_name, record_id, action_type, change_details)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      user_id,
      table_name,
      record_id || null,
      action_type,
      change_details || null,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAllByUser(userId) {
    const query = `SELECT * FROM "user_activity" WHERE user_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async findAll({ table_name, action_type } = {}) {
    const where = [];
    const values = [];
    if (table_name) {
      values.push(table_name);
      where.push(`table_name = $${values.length}`);
    }
    if (action_type) {
      values.push(action_type);
      where.push(`action_type = $${values.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const query = `SELECT * FROM "user_activity" ${whereClause} ORDER BY created_at DESC`;
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async deleteByUserId(userId) {
    const query = `DELETE FROM "user_activity" WHERE user_id = $1 RETURNING *`;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }
}

module.exports = { UserActivityRepository };
