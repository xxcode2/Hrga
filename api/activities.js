// api/activities.js - Vercel serverless: CRUD for activities
const { pool, initDb } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try { await initDb(); }
  catch (e) { return res.status(500).json({ error: 'DB init gagal: ' + e.message }); }

  // ── GET ─────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, department } = req.query;
      let query = 'SELECT * FROM activities';
      const params = [];
      const conditions = [];

      if (startDate && endDate) {
        conditions.push(`created_at >= $${params.length + 1} AND created_at <= $${params.length + 2}`);
        params.push(startDate, endDate + ' 23:59:59');
      }
      if (department && department !== 'all') {
        conditions.push(`department = $${params.length + 1}`);
        params.push(department);
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── POST ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { id, department, activity, category, status, notes, image, date } = req.body;
    if (!id || !department || !activity || !category || !status) {
      return res.status(400).json({ error: 'id, department, activity, category, status wajib diisi' });
    }
    try {
      await pool.query(`
        INSERT INTO activities (id, department, activity, category, status, notes, image, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          department = EXCLUDED.department,
          activity = EXCLUDED.activity,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          image = EXCLUDED.image
      `, [id, department, activity, category, status, notes || null, image || null, date || new Date()]);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── PUT (update) ────────────────────────────────────
  if (req.method === 'PUT') {
    // Get id from query string for Vercel (no dynamic routes without config)
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id wajib diisi (query param)' });

    const { status, category, activity, notes } = req.body;
    try {
      const sets = [];
      const params = [];
      let idx = 1;

      if (status) { sets.push(`status = $${idx++}`); params.push(status); }
      if (category) { sets.push(`category = $${idx++}`); params.push(category); }
      if (activity) { sets.push(`activity = $${idx++}`); params.push(activity); }
      if (notes !== undefined) { sets.push(`notes = $${idx++}`); params.push(notes); }

      if (sets.length === 0) return res.status(400).json({ error: 'Tidak ada field yang diupdate' });

      params.push(id);
      await pool.query(`UPDATE activities SET ${sets.join(', ')} WHERE id = $${idx}`, params);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── DELETE ──────────────────────────────────────────
  if (req.method === 'DELETE') {
    let id = req.query.id;
    if (!id) {
      const parts = (req.url || '').split('/').filter(Boolean);
      id = parts[parts.length - 1];
      if (id === 'activities') id = null;
    }
    if (!id) return res.status(400).json({ error: 'id wajib diisi' });
    try {
      await pool.query('DELETE FROM activities WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
