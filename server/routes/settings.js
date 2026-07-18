import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const settings = await pool.query('SELECT * FROM school_settings LIMIT 1');
  const bands = await pool.query('SELECT * FROM grade_bands ORDER BY min_score DESC');
  res.json({ ...settings.rows[0], grade_bands: bands.rows });
});

router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  const fields = [
    'name', 'short_name', 'logo_url', 'address', 'phone', 'motto',
    'current_academic_year', 'current_term', 'primary_color',
    'class_score_weight', 'exam_score_weight', 'late_threshold',
    'attendance_edit_cutoff', 'announcement_requires_approval',
  ];
  const current = await pool.query('SELECT id FROM school_settings LIMIT 1');
  const id = current.rows[0].id;

  const updates = fields.filter((f) => f in req.body);
  if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

  const setClause = updates.map((f, i) => `${f}=$${i + 1}`).join(', ');
  const values = updates.map((f) => req.body[f]);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE school_settings SET ${setClause} WHERE id=$${values.length} RETURNING *`,
    values
  );
  res.json(rows[0]);
});

export default router;
