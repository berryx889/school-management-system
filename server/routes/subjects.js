import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM subjects ORDER BY name');
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, code, type } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
  if (type && !['core', 'elective'].includes(type)) {
    return res.status(400).json({ error: "type must be 'core' or 'elective'" });
  }
  const { rows } = await pool.query(
    'INSERT INTO subjects (name, code, type) VALUES ($1,$2,COALESCE($3,\'core\')) RETURNING *',
    [name, code.toUpperCase(), type]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, code, type } = req.body;
  if (type && !['core', 'elective'].includes(type)) {
    return res.status(400).json({ error: "type must be 'core' or 'elective'" });
  }
  const { rows } = await pool.query(
    'UPDATE subjects SET name=COALESCE($1,name), code=COALESCE($2,code), type=COALESCE($3,type) WHERE id=$4 RETURNING *',
    [name, code?.toUpperCase(), type, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM subjects WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
