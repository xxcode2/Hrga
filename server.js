const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initializeDatabase } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' }));   // butuh besar untuk base64 foto
app.use(express.static(path.join(__dirname)));  // serve index.html & static files

// ─── Init DB ─────────────────────────────────────────────
initializeDatabase()
  .then(() => console.log('✅ Database siap'))
  .catch(err => console.error('❌ DB error:', err));

// ─── API: Health ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', time: new Date() });
});

// ─── API: Teams ──────────────────────────────────────────
// GET semua anggota tim
app.get('/api/teams', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY member_index');
    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/teams error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST simpan / update satu anggota
app.post('/api/teams', async (req, res) => {
  const { member_index, name, role, image } = req.body;
  if (member_index === undefined || !name) {
    return res.status(400).json({ error: 'member_index dan name wajib diisi' });
  }
  try {
    await pool.query(`
      INSERT INTO teams (member_index, name, role, image, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (member_index) DO UPDATE SET
        name       = EXCLUDED.name,
        role       = EXCLUDED.role,
        image      = EXCLUDED.image,
        updated_at = CURRENT_TIMESTAMP
    `, [member_index, name, role || '', image || null]);
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/teams error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── API: Reports ─────────────────────────────────────────
// GET laporan dengan filter tanggal opsional
app.get('/api/reports', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM reports';
    const params = [];

    if (startDate && endDate) {
      query += ' WHERE created_at >= $1 AND created_at < $2';
      params.push(startDate, endDate + ' 23:59:59');
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/reports error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST kirim laporan baru
app.post('/api/reports', async (req, res) => {
  const { id, member_index, task, location, status, notes, image, date } = req.body;
  if (!id || member_index === undefined || !task || !location) {
    return res.status(400).json({ error: 'id, member_index, task, location wajib diisi' });
  }
  try {
    await pool.query(`
      INSERT INTO reports (id, member_index, task, location, status, notes, image, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [id, member_index, task, location, status || null, notes || null, image || null, date || new Date()]);
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/reports error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE hapus laporan - support /api/reports/:id dan /api/reports?id=xxx
async function handleDeleteReport(id, res) {
  if (!id) return res.status(400).json({ error: 'id wajib diisi' });
  try {
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/reports error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
app.delete('/api/reports/:id', (req, res) => handleDeleteReport(req.params.id, res));
app.delete('/api/reports',    (req, res) => handleDeleteReport(req.query.id, res));

// ─── API: Sync (bulk pull semua data) ────────────────────
app.get('/api/sync', async (req, res) => {
  try {
    const teamsRes   = await pool.query('SELECT * FROM teams ORDER BY member_index');
    const reportsRes = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
    res.json({ teams: teamsRes.rows, reports: reportsRes.rows });
  } catch (e) {
    console.error('GET /api/sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Catch-all: serve index.html ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start ───────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
  console.log(`📱 Untuk HP: http://IP-LAPTOP:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});