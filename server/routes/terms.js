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

export default router;
