import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

async function canAccessClassSubject(user, classSubjectId) {
  if (user.role === 'admin') return true;
  const { rows } = await pool.query('SELECT teacher_id FROM class_subjects WHERE id=$1', [classSubjectId]);
  return rows.length && rows[0].teacher_id === user.id;
}

router.get('/', requireAuth, async (req, res) => {
  const { class_subject_id, term_id } = req.query;
  const values = [];
  const conditions = [];
  if (class_subject_id) { values.push(class_subject_id); conditions.push(`a.class_subject_id=$${values.length}`); }
  if (term_id) { values.push(term_id); conditions.push(`a.term_id=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT a.* FROM assessments a ${where} ORDER BY a.id`,
    values
  );
  res.json(rows);
});

router.post('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { class_subject_id, term_id, type, title, max_score, weight } = req.body;
  if (!class_subject_id || !term_id || !type || !title || !max_score || !weight) {
    return res.status(400).json({ error: 'class_subject_id, term_id, type, title, max_score, weight are required' });
  }
  if (!(await canAccessClassSubject(req.user, class_subject_id))) {
    return res.status(403).json({ error: 'Not assigned to this class-subject' });
  }
  const { rows } = await pool.query(
    `INSERT INTO assessments (class_subject_id, term_id, type, title, max_score, weight)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [class_subject_id, term_id, type, title, max_score, weight]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const a = await pool.query('SELECT class_subject_id, locked FROM assessments WHERE id=$1', [req.params.id]);
  if (!a.rows.length) return res.status(404).json({ error: 'Not found' });
  if (a.rows[0].locked) return res.status(423).json({ error: 'Assessment is locked' });
  if (!(await canAccessClassSubject(req.user, a.rows[0].class_subject_id))) {
    return res.status(403).json({ error: 'Not assigned to this class-subject' });
  }
  await pool.query('DELETE FROM assessments WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

router.put('/:id/lock', requireAuth, requireRole('admin'), async (req, res) => {
  const { locked } = req.body;
  const { rows } = await pool.query('UPDATE assessments SET locked=$1 WHERE id=$2 RETURNING *', [Boolean(locked), req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

export default router;
