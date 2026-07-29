import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM academic_terms ORDER BY start_date DESC');
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { year, term, start_date, end_date, is_current } = req.body;
  if (!year || !term || !start_date || !end_date) {
    return res.status(400).json({ error: 'year, term, start_date, end_date are required' });
  }
  if (is_current) await pool.query('UPDATE academic_terms SET is_current=false');
  const { rows } = await pool.query(
    `INSERT INTO academic_terms (year, term, start_date, end_date, is_current)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [year, term, start_date, end_date, Boolean(is_current)]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id/set-current', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('UPDATE academic_terms SET is_current=false');
  const { rows } = await pool.query('UPDATE academic_terms SET is_current=true WHERE id=$1 RETURNING *', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  await pool.query('UPDATE school_settings SET current_academic_year=$1, current_term=$2', [rows[0].year, rows[0].term]);
  res.json(rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { year, term, start_date, end_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE academic_terms SET year=COALESCE($1,year), term=COALESCE($2,term),
       start_date=COALESCE($3,start_date), end_date=COALESCE($4,end_date)
     WHERE id=$5 RETURNING *`,
    [year ?? null, term ?? null, start_date ?? null, end_date ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  // Keep the settings label in sync if this happens to be the current term.
  if (rows[0].is_current) {
    await pool.query('UPDATE school_settings SET current_academic_year=$1, current_term=$2', [rows[0].year, rows[0].term]);
  }
  res.json(rows[0]);
});

// Refuses if anything references the term (assessments/fees/remarks) — those FKs cascade, so a
// blind delete would take real records with it. The admin must clear dependents first.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const refs = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM assessments WHERE term_id=$1) +
       (SELECT COUNT(*) FROM fee_structures WHERE term_id=$1) +
       (SELECT COUNT(*) FROM fee_invoices WHERE term_id=$1) +
       (SELECT COUNT(*) FROM remarks WHERE term_id=$1) AS n`,
    [req.params.id]
  );
  if (Number(refs.rows[0].n) > 0) {
    return res.status(409).json({ error: 'This term has assessments, fees or remarks attached and can’t be deleted.' });
  }
  const { rows } = await pool.query('DELETE FROM academic_terms WHERE id=$1 RETURNING id', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

// One-click academic-year setup: generates every term/semester for a year with sensible,
// back-to-back date ranges, so an admin never has to hand-enter them. Idempotent per
// (year, term) — re-running updates the dates rather than duplicating. Marks the period
// containing today as current (falls back to the first).
router.post('/generate', requireAuth, requireRole('admin'), async (req, res) => {
  const { year, system = '3-term', start_date } = req.body;
  if (!year || !start_date) return res.status(400).json({ error: 'year and start_date are required' });

  const plans = {
    '3-term': { count: 3, label: (i) => `Term ${i + 1}`, months: 4 },
    '2-semester': { count: 2, label: (i) => `Semester ${i + 1}`, months: 6 },
  };
  const plan = plans[system];
  if (!plan) return res.status(400).json({ error: "system must be '3-term' or '2-semester'" });

  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = iso(new Date());

  const periods = [];
  let cursor = new Date(start_date);
  for (let i = 0; i < plan.count; i++) {
    const start = new Date(cursor);
    const end = addDays(addMonths(start, plan.months), -1);
    periods.push({ term: plan.label(i), start: iso(start), end: iso(end) });
    cursor = addDays(end, 1);
  }
  const currentIdx = Math.max(0, periods.findIndex((p) => today >= p.start && today <= p.end));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE academic_terms SET is_current=false');
    const saved = [];
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const isCurrent = i === currentIdx;
      const { rows } = await client.query(
        `INSERT INTO academic_terms (year, term, start_date, end_date, is_current)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (school_id, year, term)
         DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, is_current=EXCLUDED.is_current
         RETURNING *`,
        [year, p.term, p.start, p.end, isCurrent]
      );
      saved.push(rows[0]);
    }
    const cur = saved[currentIdx];
    await client.query('UPDATE school_settings SET current_academic_year=$1, current_term=$2', [cur.year, cur.term]);
    await client.query('COMMIT');
    res.status(201).json(saved);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export default router;
