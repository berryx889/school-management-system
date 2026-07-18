import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM subjects ORDER BY name');
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
  const { rows } = await pool.query(
    'INSERT INTO subjects (name, code) VALUES ($1,$2) RETURNING *',
    [name, code.toUpperCase()]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, code } = req.body;
  const { rows } = await pool.query(
    'UPDATE subjects SET name=COALESCE($1,name), code=COALESCE($2,code) WHERE id=$3 RETURNING *',
    [name, code?.toUpperCase(), req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM subjects WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
