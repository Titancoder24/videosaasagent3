const { pool } = require("../infrastructure/PgDB/connect");

class DrugOverviewRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const fields = [
      "drug_name",
      "generic_name",
      "other_name",
      "primary_name",
      "global_status",
      "development_status",
      "drug_summary",
      "originator",
      "other_active_companies",
      "therapeutic_area",
      "disease_type",
      "regulator_designations",
      "source_link",
      "drug_record_status",
      "is_approved",
    ];

    const values = fields.map((field) => data[field] || null);
    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(", ");
    const fieldsList = fields.map((field) => `"${field}"`).join(", ");

    const query = `
      INSERT INTO "drug_overview" (${fieldsList})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAll() {
    const query = 'SELECT * FROM "drug_overview" ORDER BY created_at DESC';
    const result = await this.pool.query(query);
    return result.rows;
  }

  // NEW: Paginated findAll method
  async findAllPaginated(offset, limit) {
    const query = `
      SELECT * FROM "drug_overview" 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  // NEW: Get total count for pagination
  async getTotalCount() {
    const query = 'SELECT COUNT(*) as count FROM "drug_overview"';
    const result = await this.pool.query(query, []);
    return parseInt(result.rows[0]?.count || 0);
  }

  // NEW: Generic query method for complex queries
  async query(sql, params = []) {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  // NEW: Find by therapeutic area
  async findByTherapeuticArea(therapeuticArea) {
    const query = `
      SELECT * FROM "drug_overview" 
      WHERE therapeutic_area ILIKE $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [`%${therapeuticArea}%`]);
    return result.rows;
  }

  // NEW: Find by approval status
  async findByApprovalStatus(isApproved) {
    const query = `
      SELECT * FROM "drug_overview" 
      WHERE is_approved = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [isApproved]);
    return result.rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM "drug_overview" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
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
      UPDATE "drug_overview"
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = 'DELETE FROM "drug_overview" WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteByDrugId(drugId) {
    const query = 'DELETE FROM "drug_overview" WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [drugId]);
    return result.rowCount;
  }
}

module.exports = { DrugOverviewRepository };
