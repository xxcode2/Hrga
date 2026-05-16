// server.js
const express = require('express');
const path = require('path');
const { pool, initializeDatabase } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));        // penting untuk base64 foto
app.use(express.static(path.join(__dirname)));   // serve index.html

// Inisialisasi database
initializeDatabase().then(() => {
  console.log('✅ Database siap');
}).catch(err => console.error('❌ DB error:', err));

// ======================= API ROUTES =======================
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Simpan / update tim (8 anggota)
app.post('/api/teams', async (req, res) => {
  const { member_index, name, role, image } = req.body;
  try {
    await pool.query(`
      INSERT INTO teams (member_index, name, role, image)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (member_index) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        image = EXCLUDED.image,
        updated_at = CURRENT_TIMESTAMP
    `, [member_index, name, role, image || null]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Ambil semua data (sync)
app.get('/api/sync', async (req, res) => {
  try {
    const teamsRes = await pool.query('SELECT * FROM teams ORDER BY member_index');
    const reportsRes = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');

    res.json({
      teams: teamsRes.rows,
      reports: reportsRes.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Kirim laporan
app.post('/api/reports', async (req, res) => {
  const { id, member_index, task, location, status, notes, image, date } = req.body;
  try {
    await pool.query(`
      INSERT INTO reports (id, member_index, task, location, status, notes, image, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [id, member_index, task, location, status, notes, image || null, date || new Date()]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Hapus laporan
app.delete('/api/reports/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ======================= START SERVER =======================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
  console.log(`📱 Untuk HP gunakan: http://IP-LAPTOP-KAMU:${PORT}`);
});