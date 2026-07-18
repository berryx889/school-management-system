import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { class_id, teacher_id } = req.query;
  const values = [];
  const conditions = [];
  if (class_id) { values.push(class_id); conditions.push(`t.class_id=$${values.length}`); }
  if (teacher_id) { values.push(teacher_id); conditions.push(`t.teacher_id=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT t.*, s.name AS subject_name, u.full_name AS teacher_name, c.name AS class_name
     FROM timetable t
     LEFT JOIN subjects s ON s.id = t.subject_id
     LEFT JOIN users u ON u.id = t.teacher_id
     JOIN classes c ON c.id = t.class_id
     ${where}
     ORDER BY t.day_of_week, t.period_no`,
    values
  );
  res.json(rows);
});

router.put('/cell', requireAuth, requireRole('admin'), async (req, res) => {
  const { class_id, day_of_week, period_no, start_time, end_time, subject_id, teacher_id } = req.body;
  if (!class_id || day_of_week == null || !period_no || !start_time || !end_time) {
    return res.status(400).json({ error: 'class_id, day_of_week, period_no, start_time, end_time are required' });
  }
  const { rows } = await pool.query(
    `INSERT INTO timetable (class_id, day_of_week, period_no, start_time, end_time, subject_id, teacher_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (class_id, day_of_week, period_no)
     DO UPDATE SET start_time=$4, end_time=$5, subject_id=$6, teacher_id=$7
     RETURNING *`,
    [class_id, day_of_week, period_no, start_time, end_time, subject_id || null, teacher_id || null]
  );
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM timetable WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
