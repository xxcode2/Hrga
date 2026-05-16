const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// ==================== DATABASE INITIALIZATION ====================
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database ready!');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();

// ==================== TEAMS ENDPOINTS ====================

// GET all teams
app.get('/api/teams', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY member_index ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST/UPDATE team member
app.post('/api/teams', async (req, res) => {
  const { member_index, name, role, image } = req.body;
  
  if (member_index === undefined || !name) {
    return res.status(400).json({ error: 'member_index and name are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO teams (member_index, name, role, image) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (member_index) 
       DO UPDATE SET name = $2, role = $3, image = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [member_index, name, role, image || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving team:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTS ENDPOINTS ====================

// GET reports with optional date range filter
app.get('/api/reports', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM reports';
    let params = [];

    if (startDate && endDate) {
      query += ' WHERE created_at::date BETWEEN $1::date AND $2::date';
      params = [startDate, endDate];
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new report
app.post('/api/reports', async (req, res) => {
  const { id, member_index, task, location, status, notes, image } = req.body;

  if (!id || member_index === undefined || !task || !location) {
    return res.status(400).json({ 
      error: 'id, member_index, task, and location are required' 
    });
  }

  try {
    const createdAt = new Date(id).toISOString(); // Convert timestamp to ISO string
    
    const result = await pool.query(
      `INSERT INTO reports (id, member_index, task, location, status, notes, image, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET 
         task = $3, location = $4, status = $5, notes = $6, image = $7
       RETURNING *`,
      [id, member_index, task, location, status || null, notes || null, image || null, createdAt]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE report
app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM reports WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYNC ENDPOINT ====================

// GET all data (teams + reports) for full sync
app.get('/api/sync', async (req, res) => {
  try {
    const teamsResult = await pool.query('SELECT * FROM teams ORDER BY member_index ASC');
    const reportsResult = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');

    res.json({
      teams: teamsResult.rows,
      reports: reportsResult.rows
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST bulk sync (update multiple records)
app.post('/api/sync', async (req, res) => {
  const { teams, reports } = req.body;

  try {
    // Insert/update teams
    for (const team of teams || []) {
      await pool.query(
        `INSERT INTO teams (member_index, name, role, image)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (member_index)
         DO UPDATE SET name = $2, role = $3, image = $4, updated_at = CURRENT_TIMESTAMP`,
        [team.member_index, team.name, team.role, team.image || null]
      );
    }

    // Insert/update reports
    for (const report of reports || []) {
      const createdAt = new Date(report.date || report.created_at).toISOString();
      await pool.query(
        `INSERT INTO reports (id, member_index, task, location, status, notes, image, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET 
           task = $3, location = $4, status = $5, notes = $6, image = $7`,
        [
          report.id,
          report.member_index,
          report.task,
          report.location,
          report.status || null,
          report.notes || null,
          report.image || null,
          createdAt
        ]
      );
    }

    res.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// ==================== SERVE FRONTEND ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api\n`);
});
