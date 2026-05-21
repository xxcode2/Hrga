// api/sync.js - Vercel serverless: bulk data pull
const { pool, initDb, DEPARTMENTS } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try { await initDb(); }
  catch (e) { return res.status(500).json({ error: 'DB init gagal: ' + e.message }); }

  try {
    const activitiesRes = await pool.query('SELECT * FROM activities ORDER BY created_at DESC');
    return res.status(200).json({
      activities: activitiesRes.rows,
      departments: DEPARTMENTS
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
