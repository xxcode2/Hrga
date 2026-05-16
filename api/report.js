import { pool } from '../../db.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { id, member_index, task, location, status, notes, image, date } = req.body;
    try {
      await pool.query(`
        INSERT INTO reports (id, member_index, task, location, status, notes, image, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [id, member_index, task, location, status, notes, image || null, date || new Date()]);

      res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === 'DELETE') {
    // untuk delete per id
    const id = req.query.id;
    try {
      await pool.query('DELETE FROM reports WHERE id = $1', [id]);
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).end();
  }
}