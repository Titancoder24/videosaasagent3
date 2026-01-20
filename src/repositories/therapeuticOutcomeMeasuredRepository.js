const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticOutcomeMeasuredRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const query = `
      INSERT INTO "therapeutic_outcome_measured" (
        trial_id, purpose_of_trial, summary, primary_outcome_measure, other_outcome_measure,
        study_design_keywords, study_design, treatment_regimen, number_of_arms
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.purpose_of_trial || null,
      data.summary || null,
      data.primary_outcome_measure || null,
      data.other_outcome_measure || null,
      data.study_design_keywords || null,
      data.study_design || null,
      data.treatment_regimen || null,
      data.number_of_arms || null,
    ];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async createWithClient(client, data) {
    const query = `
      INSERT INTO "therapeutic_outcome_measured" (
        trial_id, purpose_of_trial, summary, primary_outcome_measure, other_outcome_measure,
        study_design_keywords, study_design, treatment_regimen, number_of_arms
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.purpose_of_trial || null,
      data.summary || null,
      data.primary_outcome_measure || null,
      data.other_outcome_measure || null,
      data.study_design_keywords || null,
      data.study_design || null,
      data.treatment_regimen || null,
      data.number_of_arms || null,
    ];
    const result = await client.query(query, values);
    return result.rows[0];
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_outcome_measured" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_outcome_measured" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_outcome_measured" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_outcome_measured" WHERE id = $1',
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
    const q = `UPDATE "therapeutic_outcome_measured" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_outcome_measured" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_outcome_measured" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_outcome_measured" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticOutcomeMeasuredRepository };
