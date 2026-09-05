import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { typeForMode } from '../config/assessmentModes.js';

const router = Router();

// A user may act on a class-subject if they are admin, its assigned teacher, or a staff member
// an admin has additionally granted marks_entry for that class+subject.
async function canAccessClassSubject(user, classSubjectId) {
  if (['super_admin', 'admin'].includes(user.role)) return true;
  const { rows } = await pool.query('SELECT class_id, subject_id, teacher_id FROM class_subjects WHERE id=$1', [classSubjectId]);
  if (!rows.length) return false;
  if (rows[0].teacher_id === user.id) return true;
  const grant = await pool.query(
    `SELECT 1 FROM staff_permissions
     WHERE user_id=$1 AND permission_type='marks_entry' AND class_id=$2 AND subject_id=$3`,
    [user.id, rows[0].class_id, rows[0].subject_id]
  );
  return grant.rows.length > 0;
}

router.get('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { class_subject_id, term_id } = req.query;
  if (req.user.role === 'teacher') {
    if (!class_subject_id) return res.status(400).json({ error: 'class_subject_id is required for teachers' });
    if (!(await canAccessClassSubject(req.user, class_subject_id))) {
      return res.status(403).json({ error: 'Not assigned to this class-subject' });
    }
  }
  const values = [];
  const conditions = ['a.deleted_at IS NULL'];
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
  const { class_subject_id, term_id, title, max_score, weight } = req.body;
  // Prefer the WAEC-style `mode`, which maps to a grading `type`; still accept a raw `type`
  // for backward compatibility with the older class_score/exam picker.
  const mode = req.body.mode || null;
  const type = mode ? typeForMode(mode) : req.body.type;
  if (!class_subject_id || !term_id || !type || !title || !max_score || !weight) {
    return res.status(400).json({ error: 'class_subject_id, term_id, a valid mode (or type), title, max_score, weight are required' });
  }
  if (!Number.isFinite(Number(max_score)) || Number(max_score) <= 0 ||
      !Number.isFinite(Number(weight)) || Number(weight) <= 0 || Number(weight) > 100) {
    return res.status(400).json({ error: 'max_score must be positive and weight must be between 1 and 100' });
  }
  if (!(await canAccessClassSubject(req.user, class_subject_id))) {
    return res.status(403).json({ error: 'Not assigned to this class-subject' });
  }
  const { rows } = await pool.query(
    `INSERT INTO assessments (class_subject_id, term_id, type, mode, title, max_score, weight)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [class_subject_id, term_id, type, mode, title, max_score, weight]
  );
  res.status(201).json(rows[0]);
});

// Edit an assessment's max score / title / weight (WAEC's "change over-all score"). Blocked
// once locked; access-checked like creation.
router.put('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const a = await pool.query('SELECT class_subject_id, locked FROM assessments WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
  if (!a.rows.length) return res.status(404).json({ error: 'Not found' });
  if (a.rows[0].locked) return res.status(423).json({ error: 'Assessment is locked' });
  if (!(await canAccessClassSubject(req.user, a.rows[0].class_subject_id))) {
    return res.status(403).json({ error: 'Not assigned to this class-subject' });
  }
  const { title, max_score, weight } = req.body;
  if (max_score != null && (!Number.isFinite(Number(max_score)) || Number(max_score) <= 0)) {
    return res.status(400).json({ error: 'max_score must be positive' });
  }
  if (weight != null && (!Number.isFinite(Number(weight)) || Number(weight) <= 0 || Number(weight) > 100)) {
    return res.status(400).json({ error: 'weight must be between 1 and 100' });
  }
  const { rows } = await pool.query(
    `UPDATE assessments SET title=COALESCE($1,title), max_score=COALESCE($2,max_score),
     weight=COALESCE($3,weight) WHERE id=$4 RETURNING *`,
    [title ?? null, max_score ?? null, weight ?? null, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const a = await pool.query('SELECT class_subject_id, locked FROM assessments WHERE id=$1', [req.params.id]);
  if (!a.rows.length) return res.status(404).json({ error: 'Not found' });
  if (a.rows[0].locked) return res.status(423).json({ error: 'Assessment is locked' });
  if (!(await canAccessClassSubject(req.user, a.rows[0].class_subject_id))) {
    return res.status(403).json({ error: 'Not assigned to this class-subject' });
  }
  await pool.query('UPDATE assessments SET deleted_at=now() WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// Submit Complete / reopen. Locking (submit) is allowed for admin and the assigned/granted
// teacher; unlocking (reopening for edits) is admin-only so a submitted assessment can't be
// quietly altered by whoever entered it.
router.put('/:id/lock', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const locked = Boolean(req.body.locked);
  const a = await pool.query('SELECT class_subject_id FROM assessments WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
  if (!a.rows.length) return res.status(404).json({ error: 'Not found' });
  if (!locked && !['super_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only an admin can reopen a submitted assessment' });
  }
  if (!(await canAccessClassSubject(req.user, a.rows[0].class_subject_id))) {
    return res.status(403).json({ error: 'Not assigned to this class-subject' });
  }
  const { rows } = await pool.query('UPDATE assessments SET locked=$1 WHERE id=$2 RETURNING *', [locked, req.params.id]);
  res.json(rows[0]);
});

export default router;
