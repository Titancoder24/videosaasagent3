const { pool } = require("../infrastructure/PgDB/connect");

class TherapeuticTimingRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(data) {
    const fields = [
      "trial_id",
      "start_date_actual",
      "start_date_benchmark",
      "start_date_estimated",
      "inclusion_period_actual",
      "inclusion_period_benchmark",
      "inclusion_period_estimated",
      "enrollment_closed_actual",
      "enrollment_closed_benchmark",
      "enrollment_closed_estimated",
      "primary_outcome_duration_actual",
      "primary_outcome_duration_benchmark",
      "primary_outcome_duration_estimated",
      "trial_end_date_actual",
      "trial_end_date_benchmark",
      "trial_end_date_estimated",
      "result_duration_actual",
      "result_duration_benchmark",
      "result_duration_estimated",
      "result_published_date_actual",
      "result_published_date_benchmark",
      "result_published_date_estimated",
      "overall_duration_complete",
      "overall_duration_publish",
      "timing_references",
    ];
    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(",");
    const query = `INSERT INTO "therapeutic_timing" (${fields.join(
      ","
    )}) VALUES (${placeholders}) RETURNING *`;
    const values = fields.map((f) => {
      if (f === "trial_id") return data[f];
      if (f === "timing_references" && data[f]) {
        return JSON.stringify(data[f]);
      }
      return data[f] || null;
    });
    const r = await this.pool.query(query, values);
    return r.rows[0];
  }

  async createWithClient(client, data) {
    const fields = [
      "trial_id",
      "start_date_actual",
      "start_date_benchmark",
      "start_date_estimated",
      "inclusion_period_actual",
      "inclusion_period_benchmark",
      "inclusion_period_estimated",
      "enrollment_closed_actual",
      "enrollment_closed_benchmark",
      "enrollment_closed_estimated",
      "primary_outcome_duration_actual",
      "primary_outcome_duration_benchmark",
      "primary_outcome_duration_estimated",
      "trial_end_date_actual",
      "trial_end_date_benchmark",
      "trial_end_date_estimated",
      "result_duration_actual",
      "result_duration_benchmark",
      "result_duration_estimated",
      "result_published_date_actual",
      "result_published_date_benchmark",
      "result_published_date_estimated",
      "overall_duration_complete",
      "overall_duration_publish",
      "timing_references",
    ];
    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(",");
    const query = `INSERT INTO "therapeutic_timing" (${fields.join(
      ","
    )}) VALUES (${placeholders}) RETURNING *`;
    const values = fields.map((f) => {
      if (f === "trial_id") return data[f];
      if (f === "timing_references" && data[f]) {
        return JSON.stringify(data[f]);
      }
      return data[f] || null;
    });
    const r = await client.query(query, values);
    return r.rows[0];
  }

  async findAll({ trial_id } = {}) {
    if (trial_id) {
      const r = await this.pool.query(
        'SELECT * FROM "therapeutic_timing" WHERE trial_id = $1 ORDER BY id',
        [trial_id]
      );
      return r.rows;
    }
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_timing" ORDER BY id'
    );
    return r.rows;
  }

  async findByTrialId(trialId) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_timing" WHERE trial_id = $1 ORDER BY id',
      [trialId]
    );
    return r.rows;
  }

  async findById(id) {
    const r = await this.pool.query(
      'SELECT * FROM "therapeutic_timing" WHERE id = $1',
      [id]
    );
    return r.rows[0] || null;
  }

  async update(id, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return null;
    const fields = entries.map(([k]) => k);
    const values = entries.map(([k, v]) => {
      if (k === 'timing_references' && v) {
        return JSON.stringify(v);
      }
      return v;
    });
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_timing" SET ${setClause} WHERE id = $1 RETURNING *`;
    const r = await this.pool.query(q, [id, ...values]);
    return r.rows[0] || null;
  }

  async updateByTrialId(trialId, updates) {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return [];
    const fields = entries.map(([k]) => k);
    const values = entries.map(([k, v]) => {
      if (k === 'timing_references' && v) {
        return JSON.stringify(v);
      }
      return v;
    });
    const setClause = fields.map((f, idx) => `${f} = $${idx + 2}`).join(", ");
    const q = `UPDATE "therapeutic_timing" SET ${setClause} WHERE trial_id = $1 RETURNING *`;
    const r = await this.pool.query(q, [trialId, ...values]);
    return r.rows;
  }

  async delete(id) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_timing" WHERE id = $1 RETURNING id',
      [id]
    );
    return r.rowCount > 0;
  }

  async deleteByTrialId(trialId) {
    const r = await this.pool.query(
      'DELETE FROM "therapeutic_timing" WHERE trial_id = $1 RETURNING id',
      [trialId]
    );
    return r.rowCount;
  }
}

module.exports = { TherapeuticTimingRepository };
