// api/_db.js - shared database connection untuk Vercel serverless functions
const { Pool } = require('pg');

const DEFAULT_TEAMS = [
  { member_index: 0, name: 'fajar gumilar',          role: 'staff utility' },
  { member_index: 1, name: 'deri agustin',          role: 'staff ts' },
  { member_index: 2, name: 'candra warisman',       role: 'staff cs' },
  { member_index: 3, name: 'ajeng kusumaningtias',  role: 'admin GA' },
  { member_index: 4, name: 'muhamad rieza pratama', role: 'staff NRM' },
  { member_index: 5, name: 'ibnu fadilah',          role: 'NRM' },
  { member_index: 6, name: 'muhamad rizal',         role: 'teknisi utility' },
  { member_index: 7, name: 'dadi heryana',          role: 'teknisi utility' }
];

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

    await client.query(`
      INSERT INTO teams (member_index, name, role, image, updated_at)
      VALUES ${DEFAULT_TEAMS.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, CURRENT_TIMESTAMP)`).join(', ')}
      ON CONFLICT (member_index) DO UPDATE SET
        name       = EXCLUDED.name,
        role       = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
    `, DEFAULT_TEAMS.flatMap(t => [t.member_index, t.name, t.role, null]));
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };