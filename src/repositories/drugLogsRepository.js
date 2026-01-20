const { pool } = require("../infrastructure/PgDB/connect");

class DrugLogsRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const fields = [
      "drug_over_id",
      "drug_changes_log",
      "created_date",
      "last_modified_user",
      "full_review_user",
      "next_review_date",
      "notes",
    ];

    const values = fields.map((field) => data[field] || null);
    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(", ");
    const fieldsList = fields.map((field) => `"${field}"`).join(", ");

    const query = `
      INSERT INTO "drug_logs" (${fieldsList})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAll(filters = {}) {
    let query = 'SELECT * FROM "drug_logs"';
    const values = [];

    if (filters.drug_over_id) {
      query += " WHERE drug_over_id = $1";
      values.push(filters.drug_over_id);
    }

    query += " ORDER BY id";
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM "drug_logs" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByDrugId(drugId) {
    const query =
      'SELECT * FROM "drug_logs" WHERE drug_over_id = $1 ORDER BY id';
    const result = await this.pool.query(query, [drugId]);
    return result.rows;
  }

  async update(id, data) {
    const entries = Object.entries(data).filter(
      ([, value]) => value !== undefined
    );
    if (entries.length === 0) return null;

    const fields = entries.map(([field]) => field);
    const values = entries.map(([, value]) => value);
    const setClause = fields
      .map((field, idx) => `"${field}" = $${idx + 2}`)
      .join(", ");

    const query = `
      UPDATE "drug_logs"
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async updateByDrugId(drugId, data) {
    const entries = Object.entries(data).filter(
      ([, value]) => value !== undefined
    );
    if (entries.length === 0) return null;

    const fields = entries.map(([field]) => field);
    const values = entries.map(([, value]) => value);
    const setClause = fields
      .map((field, idx) => `"${field}" = $${idx + 2}`)
      .join(", ");

    const query = `
      UPDATE "drug_logs"
      SET ${setClause}
      WHERE drug_over_id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [drugId, ...values]);
    return result.rows;
  }

  async delete(id) {
    const query = 'DELETE FROM "drug_logs" WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteByDrugId(drugId) {
    const query =
      'DELETE FROM "drug_logs" WHERE drug_over_id = $1 RETURNING id';
    const result = await this.pool.query(query, [drugId]);
    return result.rowCount;
  }
}

module.exports = { DrugLogsRepository };
