const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticParticipationCriteriaRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const query = `
      INSERT INTO "therapeutic_participation_criteria" (
        trial_id, inclusion_criteria, exclusion_criteria, age_from, subject_type, age_to, sex,
        healthy_volunteers, target_no_volunteers, actual_enrolled_volunteers
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.inclusion_criteria || null,
      data.exclusion_criteria || null,
      data.age_from || null,
      data.subject_type || null,
      data.age_to || null,
      data.sex || null,
      data.healthy_volunteers || null,
      data.target_no_volunteers || null,
      data.actual_enrolled_volunteers || null,
    ];
    const r = await this.pool.query(query, values);
    return r.rows[0];
  }

  async createWithClient(client, data) {
    const query = `
      INSERT INTO "therapeutic_participation_criteria" (
        trial_id, inclusion_criteria, exclusion_criteria, age_from, subject_type, age_to, sex,
        healthy_volunteers, target_no_volunteers, actual_enrolled_volunteers
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.inclusion_criteria || null,
      data.exclusion_criteria || null,
      data.age_from || null,
      data.subject_type || null,
      data.age_to || null,
      data.sex || null,
      data.healthy_volunteers || null,
      data.target_no_volunteers || null,
      data.actual_enrolled_volunteers || null,
    ];
    const r = await client.query(query, values);
    return r.rows[0];
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_participation_criteria" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_participation_criteria" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_participation_criteria" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_participation_criteria" WHERE id = $1',
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
    const q = `UPDATE "therapeutic_participation_criteria" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_participation_criteria" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_participation_criteria" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_participation_criteria" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticParticipationCriteriaRepository };
