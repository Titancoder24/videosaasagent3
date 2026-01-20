const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticNotesRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    console.log('[TherapeuticNotesRepository] Creating note with data:', { trial_id: data.trial_id, notes: typeof data.notes });
    const r = await this.pool.query(
      'INSERT INTO "therapeutic_notes" (trial_id, notes) VALUES ($1, $2::jsonb) RETURNING *',
      [
        data.trial_id,
        this.#coerceJson(data.notes),
      ]
    );
    console.log('[TherapeuticNotesRepository] Created note:', r.rows[0]?.id);
    return r.rows[0];
  }

  async createWithClient(client, data) {
    console.log('[TherapeuticNotesRepository] Creating note with client:', { trial_id: data.trial_id, notes: typeof data.notes });
    const r = await client.query(
      'INSERT INTO "therapeutic_notes" (trial_id, notes) VALUES ($1, $2::jsonb) RETURNING *',
      [
        data.trial_id,
        this.#coerceJson(data.notes),
      ]
    );
    console.log('[TherapeuticNotesRepository] Created note with client:', r.rows[0]?.id);
    return r.rows[0];
  }

  #coerceJson(value) {
    if (value === undefined || value === null) {
      return JSON.stringify([]);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return JSON.stringify([]);
      }
      // already JSON array/object string
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return trimmed;
      }
      // treat as plain value, wrap in array
      return JSON.stringify([trimmed]);
    }
    // If it's already an object/array, stringify it
    return JSON.stringify(value);
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_notes" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_notes" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_notes" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_notes" WHERE id = $1',
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
    const q = `UPDATE "therapeutic_notes" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_notes" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_notes" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_notes" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticNotesRepository };
