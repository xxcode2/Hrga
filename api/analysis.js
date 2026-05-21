// api/analysis.js - Vercel serverless: generate analysis & conclusion
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

    // Generate analysis
    const analysis = generateAnalysis(summary);
    const conclusion = generateConclusion(summary);

    return res.status(200).json({ summary, analysis, conclusion });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

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

  // Additional insights per department
  const activeDepts = depts.filter(d => d[1].total > 0);
  if (activeDepts.length > 1) {
    analyses.push(`${activeDepts.length} dari ${DEPARTMENTS.length} departemen aktif hari ini, menunjukkan koordinasi lintas divisi yang baik.`);
  }

  return analyses;
}

function generateConclusion(summary) {
  if (summary.total === 0) {
    return 'Belum ada data aktivitas untuk menghasilkan kesimpulan.';
  }

  const closePct = Math.round((summary.byStatus.close / summary.total) * 100);

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
