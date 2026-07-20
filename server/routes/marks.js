import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { assessment_id } = req.query;
  if (!assessment_id) return res.status(400).json({ error: 'assessment_id is required' });
  const { rows } = await pool.query(
    `SELECT m.*, u.full_name, s.student_code FROM marks m
     JOIN students s ON s.id = m.student_id
     JOIN users u ON u.id = s.user_id
     WHERE m.assessment_id=$1 ORDER BY u.full_name`,
    [assessment_id]
  );
  res.json(rows);
});

router.put('/bulk', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { assessment_id, entries } = req.body;
  if (!assessment_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'assessment_id and entries[] are required' });
  }

  const assessmentRes = await pool.query(
    `SELECT a.*, cs.teacher_id, cs.class_id, cs.subject_id FROM assessments a
     JOIN class_subjects cs ON cs.id = a.class_subject_id
     WHERE a.id=$1`,
    [assessment_id]
  );
  if (!assessmentRes.rows.length) return res.status(404).json({ error: 'Assessment not found' });
  const assessment = assessmentRes.rows[0];

  // Server-side enforcement: a teacher may only enter marks for a class-subject they own
  // OR one an admin has additionally granted them via staff_permissions — never instead of
  // the owning teacher's own right, only on top of it.
  if (req.user.role === 'teacher' && assessment.teacher_id !== req.user.id) {
    const grant = await pool.query(
      `SELECT 1 FROM staff_permissions
       WHERE user_id=$1 AND permission_type='marks_entry' AND class_id=$2 AND subject_id=$3`,
      [req.user.id, assessment.class_id, assessment.subject_id]
    );
    if (!grant.rows.length) return res.status(403).json({ error: 'You are not assigned to this class-subject' });
  }
  if (assessment.locked) {
    return res.status(423).json({ error: 'This assessment is locked for editing' });
  }

  const saved = [];
  for (const entry of entries) {
    const { student_id, score } = entry;
    if (score == null || score === '') continue;
    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > Number(assessment.max_score)) {
      return res.status(400).json({ error: `Score for student ${student_id} must be between 0 and ${assessment.max_score}` });
    }
    const { rows } = await pool.query(
      `INSERT INTO marks (assessment_id, student_id, score, entered_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (assessment_id, student_id) DO UPDATE SET score=$3, entered_by=$4, entered_at=now()
       RETURNING *`,
      [assessment_id, student_id, numericScore, req.user.id]
    );
    saved.push(rows[0]);
  }
  res.json(saved);
});

export default router;
