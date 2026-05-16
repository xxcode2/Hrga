// api/sync.js - Vercel serverless: bulk pull teams + reports
const { pool, initDb } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try { await initDb(); }
  catch (e) { return res.status(500).json({ error: 'DB init gagal: ' + e.message }); }

  try {
    const teamsRes   = await pool.query('SELECT * FROM teams ORDER BY member_index');
    const reportsRes = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
    return res.status(200).json({ teams: teamsRes.rows, reports: reportsRes.rows });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};