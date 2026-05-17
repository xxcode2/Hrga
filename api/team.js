// api/teams.js
const { pool, initDb } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try { await initDb(); }
  catch (e) { return res.status(500).json({ error: 'DB init gagal: ' + e.message }); }

  // GET semua anggota tim
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM teams ORDER BY member_index');
      return res.status(200).json(result.rows);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST simpan / update satu anggota
  if (req.method === 'POST') {
    const { member_index, name, role, image } = req.body;
    if (member_index === undefined || !name) {
      return res.status(400).json({ error: 'member_index dan name wajib diisi' });
    }
    if (image && typeof image === 'string') {
      const maxImageBytes = 5 * 1024 * 1024;
      const imageSize = Buffer.byteLength(image, 'utf8');
      if (imageSize > maxImageBytes) {
        return res.status(413).json({ error: 'Image terlalu besar; maksimal 5MB.' });
      }
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
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};