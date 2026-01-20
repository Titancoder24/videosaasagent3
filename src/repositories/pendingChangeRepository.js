const { pool } = require("../infrastructure/PgDB/connect");

class PendingChangeRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async submit({
    target_table,
    target_record_id,
    proposed_data,
    change_type,
    submitted_by,
  }) {
    const query = `
      INSERT INTO "pending_changes" (target_table, target_record_id, proposed_data, change_type, submitted_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      target_table,
      target_record_id || null,
      proposed_data,
      change_type,
      submitted_by,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAll({ is_approved, rejected } = {}) {
    const where = [];
    const values = [];
    if (typeof is_approved === "boolean") {
      values.push(is_approved);
      where.push(`is_approved = $${values.length}`);
    }
    if (typeof rejected === "boolean") {
      values.push(rejected);
      where.push(`rejected = $${values.length}`);
    }
    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const query = `SELECT * FROM "pending_changes" ${whereClause} ORDER BY submitted_at DESC`;
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async findById(id) {
    const query = `SELECT * FROM "pending_changes" WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async approve(id, approved_by) {
    const query = `
      UPDATE "pending_changes"
      SET is_approved = TRUE, approved_by = $2, approved_at = NOW(), rejected = FALSE, rejection_reason = NULL
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [id, approved_by]);
    return result.rows[0] || null;
  }

  async reject(id, approved_by, rejection_reason) {
    const query = `
      UPDATE "pending_changes"
      SET is_approved = FALSE, approved_by = $2, approved_at = NOW(), rejected = TRUE, rejection_reason = $3
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      id,
      approved_by,
      rejection_reason || null,
    ]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = `DELETE FROM "pending_changes" WHERE id = $1 RETURNING id`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

module.exports = { PendingChangeRepository };
