const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticResultsRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const query = `
      INSERT INTO "therapeutic_results" (
        trial_id, trial_outcome, reference, trial_results, adverse_event_reported,
        adverse_event_type, treatment_for_adverse_events, results_available, endpoints_met,
        trial_outcome_content, trial_outcome_link, trial_outcome_attachment, site_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.trial_outcome || null,
      data.reference || null,
      data.trial_results || null,
      data.adverse_event_reported || null,
      data.adverse_event_type || null,
      data.treatment_for_adverse_events || null,
      data.results_available || null,
      data.endpoints_met || null,
      data.trial_outcome_content || null,
      data.trial_outcome_link || null,
      data.trial_outcome_attachment || null,
      data.site_notes ? JSON.stringify(data.site_notes) : null,
    ];
    const r = await this.pool.query(query, values);
    return r.rows[0];
  }

  async createWithClient(client, data) {
    const query = `
      INSERT INTO "therapeutic_results" (
        trial_id, trial_outcome, reference, trial_results, adverse_event_reported,
        adverse_event_type, treatment_for_adverse_events, results_available, endpoints_met,
        trial_outcome_content, trial_outcome_link, trial_outcome_attachment, site_notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.trial_outcome || null,
      data.reference || null,
      data.trial_results || null,
      data.adverse_event_reported || null,
      data.adverse_event_type || null,
      data.treatment_for_adverse_events || null,
      data.results_available || null,
      data.endpoints_met || null,
      data.trial_outcome_content || null,
      data.trial_outcome_link || null,
      data.trial_outcome_attachment || null,
      data.site_notes ? JSON.stringify(data.site_notes) : null,
    ];
    const r = await client.query(query, values);
    return r.rows[0];
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_results" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_results" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_results" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_results" WHERE id = $1',
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
    const q = `UPDATE "therapeutic_results" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_results" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_results" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_results" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticResultsRepository };
