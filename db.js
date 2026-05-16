const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL
});

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing database schema...');

    // Create teams table
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
    console.log('✅ Teams table ready');

    // Create reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT PRIMARY KEY,
        member_index INT NOT NULL,
        task TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status VARCHAR(50),
        notes TEXT,
        image TEXT,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (member_index) REFERENCES teams(member_index) ON DELETE SET NULL
      );
    `);
    console.log('✅ Reports table ready');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_member ON reports(member_index);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(created_at);
    `);
    
    console.log('✅ Indexes created');
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

module.exports = {
  pool,
  initializeDatabase
};
