const { Pool } = require('pg');
require('dotenv').config();

const DEPARTMENTS = [
  { id: 'ts', name: 'Technical Support', icon: '🔧', color: '#2d7bf4' },
  { id: 'utility', name: 'Utility', icon: '⚡', color: '#10d88a' },
  { id: 'cleaning', name: 'Cleaning Service', icon: '🧹', color: '#f5a623' },
  { id: 'nrm', name: 'NRM', icon: '📦', color: '#9b6eff' },
  { id: 'ga_internal', name: 'GA Internal', icon: '🏢', color: '#f04590' }
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing database schema...');

    // Keep teams table for backward compat
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        member_index INT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // New activities table for Daily Activity Report
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id BIGINT PRIMARY KEY,
        department VARCHAR(50) NOT NULL,
        activity TEXT NOT NULL,
        category VARCHAR(20) NOT NULL DEFAULT 'reguler',
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        notes TEXT,
        image TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_dept ON activities(department);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);`);

    // Keep old reports table for migration
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT PRIMARY KEY,
        member_index INT NOT NULL,
        task TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status VARCHAR(50),
        notes TEXT,
        image TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_member ON reports(member_index);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(created_at);`);

    console.log('✅ Database initialization complete!');
  } catch (error) {
    if (error.code === '42P07' || error.message.includes('already exists')) {
      console.log('✅ Tables already exist');
    } else {
      console.error('❌ Database initialization error:', error.message);
      throw error;
    }
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase, DEPARTMENTS };
