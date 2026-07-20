import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { class_id } = req.query;
  const values = [];
  let where = '';
  if (class_id) {
    values.push(class_id);
    where = `WHERE class_id IS NULL OR class_id=$${values.length}`;
  }
  const { rows } = await pool.query(`SELECT * FROM remark_templates ${where} ORDER BY remark_type, created_at`, values);
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { remark_type, remark_text, class_id } = req.body;
  if (!remark_type || !remark_text) {
    return res.status(400).json({ error: 'remark_type and remark_text are required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO remark_templates (remark_type, remark_text, class_id) VALUES ($1,$2,$3) RETURNING *',
    [remark_type, remark_text, class_id || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM remark_templates WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
