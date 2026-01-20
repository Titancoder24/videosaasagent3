const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticSitesRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const r = await this.pool.query(
      'INSERT INTO "therapeutic_sites" (trial_id, total, notes, study_sites, principal_investigators, site_status, site_countries, site_regions, site_contact_info, site_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [
        data.trial_id, 
        data.total || null, 
        data.notes || null,
        data.study_sites || null,
        data.principal_investigators || null,
        data.site_status || null,
        data.site_countries || null,
        data.site_regions || null,
        data.site_contact_info || null,
        data.site_notes ? JSON.stringify(data.site_notes) : null
      ]
    );
    return r.rows[0];
  }

  async createWithClient(client, data) {
    const r = await client.query(
      'INSERT INTO "therapeutic_sites" (trial_id, total, notes, study_sites, principal_investigators, site_status, site_countries, site_regions, site_contact_info, site_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [
        data.trial_id, 
        data.total || null, 
        data.notes || null,
        data.study_sites || null,
        data.principal_investigators || null,
        data.site_status || null,
        data.site_countries || null,
        data.site_regions || null,
        data.site_contact_info || null,
        data.site_notes ? JSON.stringify(data.site_notes) : null
      ]
    );
    return r.rows[0];
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_sites" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_sites" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_sites" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_sites" WHERE id = $1',
      [id]
    );
    return r.rows[0] || null;
  }

  async update(id, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return null;
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_sites" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_sites" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_sites" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_sites" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticSitesRepository };
