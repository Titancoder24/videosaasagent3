const { pool } = require("../infrastructure/PgDB/connect");

class UserRepository {
  constructor(dbPool = pool) {
    this.pool = dbPool;
  }

  async create(userData) {
    const query = `
      INSERT INTO "users" (username, email, password, company, designation, phone, country, region, sex, age, plan)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      userData.username,
      userData.email,
      userData.password,
      userData.company || null,
      userData.designation || null,
      userData.phone || null,
      userData.country || null,
      userData.region || null,
      userData.sex || null,
      userData.age || null,
      userData.plan || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findAll() {
    const query = 'SELECT * FROM "users" ORDER BY username';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM "users" WHERE email = $1 LIMIT 1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async findByUsername(username) {
    const query = 'SELECT * FROM "users" WHERE username = $1 LIMIT 1';
    const result = await this.pool.query(query, [username]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const query = 'SELECT * FROM "users" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async update(id, userData) {
    const entries = Object.entries(userData).filter(
      ([, value]) => value !== undefined
    );
    if (entries.length === 0) return null;

    const fields = entries.map(([field]) => field);
    const values = entries.map(([, value]) => value);
    const setClause = fields
      .map((field, idx) => `${field} = $${idx + 2}`)
      .join(", ");

    const query = `
      UPDATE "users"
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = 'DELETE FROM "users" WHERE id = $1 RETURNING id';
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

module.exports = {
  UserRepository,
};
