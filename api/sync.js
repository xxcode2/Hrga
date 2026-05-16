import { pool } from '../../db.js';

export default async function handler(req, res) {
  try {
    const teamsRes = await pool.query('SELECT * FROM teams ORDER BY member_index');
    const reportsRes = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');

    res.status(200).json({
      teams: teamsRes.rows,
      reports: reportsRes.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}