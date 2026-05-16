// api/reports.js - Vercel serverless: GET laporan / POST kirim laporan
const { pool, initDb } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try { await initDb(); }
  catch (e) { return res.status(500).json({ error: 'DB init gagal: ' + e.message }); }

  // ── GET: ambil laporan dengan filter tanggal opsional ─
  if (req.method === 'GET') {
    try {
      const { startDate, endDate } = req.query;
      let query  = 'SELECT * FROM reports';
      const params = [];
      if (startDate && endDate) {
        query  += ' WHERE created_at >= $1 AND created_at <= $2';
        params.push(startDate, endDate + ' 23:59:59');
      }
      query += ' ORDER BY created_at DESC';
      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST: kirim laporan baru ──────────────────────────
  if (req.method === 'POST') {
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
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── DELETE: hapus laporan berdasarkan id di query ─────
  // Contoh: DELETE /api/reports?id=123456
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id wajib diisi' });
    try {
      await pool.query('DELETE FROM reports WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};