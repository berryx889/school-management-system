import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { class_id, teacher_id } = req.query;
  const conditions = [];
  const values = [];
  if (class_id) { values.push(class_id); conditions.push(`cs.class_id=$${values.length}`); }
  if (teacher_id) { values.push(teacher_id); conditions.push(`cs.teacher_id=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT cs.*, c.name AS class_name, s.name AS subject_name, s.code AS subject_code,
            u.full_name AS teacher_name
     FROM class_subjects cs
     JOIN classes c ON c.id = cs.class_id
     JOIN subjects s ON s.id = cs.subject_id
     LEFT JOIN users u ON u.id = cs.teacher_id
     ${where}
     ORDER BY c.name, s.name`,
    values
  );
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { class_id, subject_id, teacher_id } = req.body;
  if (!class_id || !subject_id) return res.status(400).json({ error: 'class_id and subject_id are required' });
  const { rows } = await pool.query(
    `INSERT INTO class_subjects (class_id, subject_id, teacher_id) VALUES ($1,$2,$3)
     ON CONFLICT (class_id, subject_id) DO UPDATE SET teacher_id=$3 RETURNING *`,
    [class_id, subject_id, teacher_id || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM class_subjects WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
