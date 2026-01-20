const { pool } = require("../infrastructure/PgDB/connect");

class SaveQueryActivityRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const query = `
      INSERT INTO "saved_queries" (
        title, description, trial_id, user_id, query_type, query_data, filters
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;
    
    const values = [
      data.title,
      data.description || null,
      data.trial_id || null,
      data.user_id || null,
      data.query_type || 'trial',
      data.query_data || null,
      data.filters || null
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAll() {
    const query = `
      SELECT * FROM "saved_queries" 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async findByUserId(userId) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async findById(id) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE id = $1
    `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByTrialId(trialId) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE trial_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [trialId]);
    return result.rows;
  }

  async findByUserAndTrialId(userId, trialId) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE user_id = $1 AND trial_id = $2 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId, trialId]);
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
      UPDATE "saved_queries"
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = `
      DELETE FROM "saved_queries" 
      WHERE id = $1 
      RETURNING id
    `;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteByUserId(userId) {
    const query = `
      DELETE FROM "saved_queries" 
      WHERE user_id = $1 
      RETURNING id
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rowCount;
  }

  async deleteByTrialId(trialId) {
    const query = `
      DELETE FROM "saved_queries" 
      WHERE trial_id = $1 
      RETURNING id
    `;
    const result = await this.pool.query(query, [trialId]);
    return result.rowCount;
  }

  // Get saved queries with trial information
  async findWithTrialInfo(userId) {
    const query = `
      SELECT 
        sq.*,
        tto.title as trial_title,
        tto.status as trial_status,
        tto.trial_phase,
        tto.therapeutic_area,
        tto.primary_drugs
      FROM "saved_queries" sq
      LEFT JOIN "therapeutic_trial_overview" tto ON sq.trial_id = tto.id
      WHERE sq.user_id = $1
      ORDER BY sq.created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  // Search saved queries by title or description
  async searchByText(userId, searchText) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE user_id = $1 
      AND (
        title ILIKE $2 
        OR description ILIKE $2
      )
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId, `%${searchText}%`]);
    return result.rows;
  }

  // Get paginated results
  async findPaginated(userId, offset, limit) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE user_id = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  // Get total count for pagination
  async getTotalCount(userId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM "saved_queries" 
      WHERE user_id = $1
    `;
    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0]?.count || 0);
  }

  // Get dashboard queries (queries with null user_id)
  async findDashboardQueries() {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE user_id IS NULL AND query_type = 'dashboard'
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  // Search dashboard queries by title or description
  async searchDashboardQueries(searchText) {
    const query = `
      SELECT * FROM "saved_queries" 
      WHERE user_id IS NULL 
      AND query_type = 'dashboard'
      AND (
        title ILIKE $1 
        OR description ILIKE $1
      )
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [`%${searchText}%`]);
    return result.rows;
  }
}

module.exports = { SaveQueryActivityRepository };
