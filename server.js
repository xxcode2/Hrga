const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initializeDatabase, DEPARTMENTS } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static(path.join(__dirname)));

// ─── Init DB ─────────────────────────────────────────────
initializeDatabase()
  .then(() => console.log('✅ Database siap'))
  .catch(err => console.error('❌ DB error:', err));

// ─── API: Health ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', time: new Date() });
});

// ─── API: Departments (static) ───────────────────────────
app.get('/api/departments', (req, res) => {
  res.json(DEPARTMENTS);
});

// ─── API: Activities ─────────────────────────────────────
// GET activities with optional date & department filter
app.get('/api/activities', async (req, res) => {
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
    res.json(result.rows);
  } catch (e) {
    console.error('GET /api/activities error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST new activity
app.post('/api/activities', async (req, res) => {
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
    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/activities error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT update activity status
app.put('/api/activities/:id', async (req, res) => {
  const { id } = req.params;
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
    res.json({ success: true });
  } catch (e) {
    console.error('PUT /api/activities error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE activity
app.delete('/api/activities/:id', (req, res) => handleDeleteActivity(req.params.id, res));
app.delete('/api/activities', (req, res) => handleDeleteActivity(req.query.id, res));

async function handleDeleteActivity(id, res) {
  if (!id) return res.status(400).json({ error: 'id wajib diisi' });
  try {
    await pool.query('DELETE FROM activities WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/activities error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─── API: Summary & Analysis ─────────────────────────────
app.get('/api/analysis', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT 
        department,
        category,
        status,
        COUNT(*) as count
      FROM activities
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY department, category, status
      ORDER BY department, category
    `, [targetDate, targetDate + ' 23:59:59']);

    // Build summary
    const summary = {
      date: targetDate,
      total: 0,
      byCategory: { reguler: 0, additional: 0, project: 0 },
      byStatus: { open: 0, close: 0, pending: 0 },
      byDepartment: {}
    };

    DEPARTMENTS.forEach(d => {
      summary.byDepartment[d.id] = { total: 0, reguler: 0, additional: 0, project: 0, open: 0, close: 0, pending: 0 };
    });

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      summary.total += count;
      summary.byCategory[row.category] = (summary.byCategory[row.category] || 0) + count;
      summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + count;
      
      if (summary.byDepartment[row.department]) {
        summary.byDepartment[row.department].total += count;
        summary.byDepartment[row.department][row.category] = (summary.byDepartment[row.department][row.category] || 0) + count;
        summary.byDepartment[row.department][row.status] = (summary.byDepartment[row.department][row.status] || 0) + count;
      }
    });

    // Generate analysis text
    const analysis = generateAnalysis(summary);
    const conclusion = generateConclusion(summary);

    res.json({ summary, analysis, conclusion });
  } catch (e) {
    console.error('GET /api/analysis error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

function generateAnalysis(summary) {
  const analyses = [];
  
  if (summary.total === 0) {
    return ['Belum ada aktivitas yang tercatat untuk tanggal ini.'];
  }

  // Category dominance
  const categories = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = categories[0];
  if (topCategory[1] > 0) {
    const pct = Math.round((topCategory[1] / summary.total) * 100);
    const catNames = { reguler: 'Reguler', additional: 'Additional', project: 'Project' };
    analyses.push(`Aktivitas ${catNames[topCategory[0]]} mendominasi dengan ${topCategory[1]} kegiatan (${pct}%), menunjukkan ${topCategory[0] === 'reguler' ? 'operasional rutin berjalan stabil' : topCategory[0] === 'additional' ? 'tingginya kebutuhan corrective & support non-rutin' : 'fokus pada improvement & pengembangan'}.`);
  }

  // Department performance
  const depts = Object.entries(summary.byDepartment).sort((a, b) => b[1].total - a[1].total);
  const topDept = depts.find(d => d[1].total > 0);
  if (topDept) {
    const deptInfo = DEPARTMENTS.find(d => d.id === topDept[0]);
    analyses.push(`Departemen ${deptInfo ? deptInfo.name : topDept[0]} paling aktif dengan ${topDept[1].total} aktivitas tercatat.`);
  }

  // Status overview
  const openPct = summary.total > 0 ? Math.round((summary.byStatus.open / summary.total) * 100) : 0;
  const closePct = summary.total > 0 ? Math.round((summary.byStatus.close / summary.total) * 100) : 0;
  if (closePct >= 70) {
    analyses.push(`Tingkat penyelesaian sangat baik: ${closePct}% aktivitas sudah ditutup (Close).`);
  } else if (openPct >= 50) {
    analyses.push(`Terdapat ${openPct}% aktivitas masih berstatus Open — perlu monitoring lanjutan.`);
  }

  if (summary.byStatus.pending > 0) {
    analyses.push(`${summary.byStatus.pending} aktivitas berstatus Pending — perlu tindak lanjut segera.`);
  }

  return analyses;
}

function generateConclusion(summary) {
  if (summary.total === 0) {
    return 'Belum ada data aktivitas untuk menghasilkan kesimpulan.';
  }

  const closePct = Math.round((summary.byStatus.close / summary.total) * 100);
  const activeDepts = Object.entries(summary.byDepartment).filter(d => d[1].total > 0).length;

  let conclusion = `Daily Activity GA pada tanggal ini menunjukkan performa kerja `;
  
  if (closePct >= 80) {
    conclusion += `sangat produktif dengan total ${summary.total} aktivitas dan tingkat penyelesaian ${closePct}%. `;
  } else if (closePct >= 50) {
    conclusion += `cukup baik dengan total ${summary.total} aktivitas dan ${closePct}% sudah selesai. `;
  } else {
    conclusion += `yang perlu ditingkatkan — dari ${summary.total} aktivitas, baru ${closePct}% yang selesai. `;
  }

  conclusion += `Tim mampu menjaga stabilitas pekerjaan rutin`;
  if (summary.byCategory.additional > 0) {
    conclusion += `, menangani pekerjaan tambahan secara responsif`;
  }
  if (summary.byCategory.project > 0) {
    conclusion += `, serta menjalankan project improvement secara bersamaan`;
  }
  conclusion += '.';

  return conclusion;
}

// ─── API: Sync (backward compat) ─────────────────────────
app.get('/api/sync', async (req, res) => {
  try {
    const activitiesRes = await pool.query('SELECT * FROM activities ORDER BY created_at DESC');
    res.json({ activities: activitiesRes.rows, departments: DEPARTMENTS });
  } catch (e) {
    console.error('GET /api/sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Legacy API (keep old endpoints working) ─────────────
app.get('/api/teams', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM teams ORDER BY member_index');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
