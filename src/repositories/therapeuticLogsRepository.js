const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticLogsRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
    this.internalNoteEnsured = false;
  }

  async ensureInternalNoteColumn(client) {
    if (this.internalNoteEnsured) return;
    const runner = client || this.pool;
    await runner.query(
      'ALTER TABLE "therapeutic_logs" ADD COLUMN IF NOT EXISTS internal_note TEXT'
    );
    this.internalNoteEnsured = true;
  }

  async create(data) {
    await this.ensureInternalNoteColumn();
    const query = `
      INSERT INTO "therapeutic_logs" (
        trial_id, trial_changes_log, trial_added_date, last_modified_date, last_modified_user,
        full_review_user, next_review_date, internal_note, attachment
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.trial_changes_log || null,
      data.trial_added_date || null,
      data.last_modified_date || null,
      data.last_modified_user || null,
      data.full_review_user || null,
      data.next_review_date || null,
      data.internal_note ?? null,
      data.attachment ? (typeof data.attachment === 'string' ? data.attachment : JSON.stringify(data.attachment)) : null,
    ];
    const r = await this.pool.query(query, values);
    return r.rows[0];
  }

  async createWithClient(client, data) {
    await this.ensureInternalNoteColumn(client);
    const query = `
      INSERT INTO "therapeutic_logs" (
        trial_id, trial_changes_log, trial_added_date, last_modified_date, last_modified_user,
        full_review_user, next_review_date, internal_note, attachment
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `;
    const values = [
      data.trial_id,
      data.trial_changes_log || null,
      data.trial_added_date || null,
      data.last_modified_date || null,
      data.last_modified_user || null,
      data.full_review_user || null,
      data.next_review_date || null,
      data.internal_note ?? null,
      data.attachment ? (typeof data.attachment === 'string' ? data.attachment : JSON.stringify(data.attachment)) : null,
    ];
    const r = await client.query(query, values);
    return r.rows[0];
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_logs" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_logs" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_logs" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_logs" WHERE id = $1',
      [id]
    );
    return r.rows[0] || null;
  }

  async update(id, updates) {
    await this.ensureInternalNoteColumn();
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return null;
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_logs" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    await this.ensureInternalNoteColumn();
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_logs" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_logs" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_logs" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticLogsRepository };
