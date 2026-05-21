// api/_db.js - shared database connection untuk Vercel serverless functions
const { Pool } = require('pg');

const DEPARTMENTS = [
  { id: 'ts', name: 'Technical Support', icon: '🔧', color: '#2563eb' },
  { id: 'utility', name: 'Utility', icon: '⚡', color: '#10b981' },
  { id: 'cleaning', name: 'Cleaning Service', icon: '🧹', color: '#f59e0b' },
  { id: 'nrm', name: 'NRM', icon: '📦', color: '#8b5cf6' },
  { id: 'ga_internal', name: 'GA Internal', icon: '🏢', color: '#ec4899' }
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
    // Keep legacy tables
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

    // New activities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id           BIGINT       PRIMARY KEY,
        department   VARCHAR(50)  NOT NULL,
        activity     TEXT         NOT NULL,
        category     VARCHAR(20)  NOT NULL DEFAULT 'reguler',
        status       VARCHAR(20)  NOT NULL DEFAULT 'open',
        notes        TEXT,
        image        TEXT,
        created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_dept ON activities(department);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_member ON reports(member_index);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(created_at);`);
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb, DEPARTMENTS };
