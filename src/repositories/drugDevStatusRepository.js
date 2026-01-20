const { pool } = require("../infrastructure/PgDB/connect");

class DrugDevStatusRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const fields = [
      "drug_over_id",
      "disease_type",
      "therapeutic_class",
      "company",
      "company_type",
      "status",
      "reference",
    ];

    const values = fields.map((field) => data[field] || null);
    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(", ");
    const fieldsList = fields.map((field) => `"${field}"`).join(", ");

    const query = `
      INSERT INTO "drug_dev_status" (${fieldsList})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAll(filters = {}) {
    let query = 'SELECT * FROM "drug_dev_status"';
    const values = [];

    if (filters.drug_over_id) {
      query += " WHERE drug_over_id = $1";
      values.push(filters.drug_over_id);
    }

    query += " ORDER BY id";
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // NEW: Batch query for multiple drug IDs
  async findByDrugIds(drugIds) {
    if (!drugIds || drugIds.length === 0) return [];

    const placeholders = drugIds.map((_, index) => `$${index + 1}`).join(",");
    const query = `
      SELECT * FROM "drug_dev_status" 
      WHERE drug_over_id IN (${placeholders})
      ORDER BY drug_over_id, id
    `;
    const result = await this.pool.query(query, drugIds);
    return result.rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM "drug_dev_status" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByDrugId(drugId) {
    const query =
      'SELECT * FROM "drug_dev_status" WHERE drug_over_id = $1 ORDER BY id';
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
      UPDATE "drug_dev_status"
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
      UPDATE "drug_dev_status"
      SET ${setClause}
      WHERE drug_over_id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [drugId, ...values]);
    return result.rows;
  }

  async delete(id) {
    const query = 'DELETE FROM "drug_dev_status" WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteByDrugId(drugId) {
    const query =
      'DELETE FROM "drug_dev_status" WHERE drug_over_id = $1 RETURNING id';
    const result = await this.pool.query(query, [drugId]);
    return result.rowCount;
  }
}

module.exports = { DrugDevStatusRepository };
