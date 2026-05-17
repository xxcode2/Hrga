// api/_db.js - shared database connection untuk Vercel serverless functions
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id           SERIAL PRIMARY KEY,
        member_index INT          NOT NULL UNIQUE,
        name         VARCHAR(255) NOT NULL,
        role         VARCHAR(255),
        image        TEXT,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id           BIGINT       PRIMARY KEY,
        member_index INT          NOT NULL,
        task         TEXT         NOT NULL,
        location     VARCHAR(255) NOT NULL,
        status       VARCHAR(50),
        notes        TEXT,
        image        TEXT,
        created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_member ON reports(member_index);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_date   ON reports(created_at);`);
  } catch (e) {
    // Abaikan error "already exists"
    if (!e.message.includes('already exists')) throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };