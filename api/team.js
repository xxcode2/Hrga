import { pool } from '../../db.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { member_index, name, role, image } = req.body;
    try {
      await pool.query(`
        INSERT INTO teams (member_index, name, role, image, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (member_index) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          image = EXCLUDED.image,
          updated_at = CURRENT_TIMESTAMP
      `, [member_index, name, role, image || null]);

      res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(405).end();
  }
}