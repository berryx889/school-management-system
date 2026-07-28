import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function assertParticipant(req, studentId) {
  const student = await pool.query('SELECT parent_id, class_id FROM students WHERE id=$1', [studentId]);
  if (!student.rows.length) return false;
  if (req.user.role === 'parent') return student.rows[0].parent_id === req.user.id;
  if (req.user.role === 'teacher') {
    const cls = await pool.query('SELECT class_teacher_id FROM classes WHERE id=$1', [student.rows[0].class_id]);
    return cls.rows[0]?.class_teacher_id === req.user.id;
  }
  return req.user.role === 'admin';
}

router.get('/', requireAuth, async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) return res.status(400).json({ error: 'student_id is required' });
  if (!(await assertParticipant(req, student_id))) return res.status(403).json({ error: 'Forbidden' });

  const { rows } = await pool.query(
    `SELECT m.*, u.full_name AS sender_name, u.role AS sender_role FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.student_id=$1 ORDER BY m.created_at ASC`,
    [student_id]
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { student_id, body } = req.body;
  if (!student_id || !body) return res.status(400).json({ error: 'student_id and body are required' });
  if (!(await assertParticipant(req, student_id))) return res.status(403).json({ error: 'Forbidden' });

  const student = await pool.query(
    `SELECT s.parent_id, c.class_teacher_id FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id=$1`,
    [student_id]
  );
  const { parent_id, class_teacher_id } = student.rows[0];
  const receiver_id = req.user.role === 'parent' ? class_teacher_id : parent_id;
  if (!receiver_id) return res.status(400).json({ error: 'No counterpart to message (class teacher or parent not set)' });

  const { rows } = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, student_id, body) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, receiver_id, student_id, body]
  );
  res.status(201).json(rows[0]);
});

export default router;
