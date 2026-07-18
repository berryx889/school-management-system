import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.full_name AS class_teacher_name,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status='active') AS student_count
    FROM classes c
    LEFT JOIN users u ON u.id = c.class_teacher_id
    ORDER BY c.name
  `);
  res.json(rows);
});

router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM classes WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, level, class_teacher_id } = req.body;
  if (!name || !level) return res.status(400).json({ error: 'name and level are required' });
  const { rows } = await pool.query(
    'INSERT INTO classes (name, level, class_teacher_id) VALUES ($1,$2,$3) RETURNING *',
    [name, level, class_teacher_id || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, level, class_teacher_id } = req.body;
  const { rows } = await pool.query(
    'UPDATE classes SET name=COALESCE($1,name), level=COALESCE($2,level), class_teacher_id=$3 WHERE id=$4 RETURNING *',
    [name, level, class_teacher_id || null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await pool.query('DELETE FROM classes WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

export default router;
