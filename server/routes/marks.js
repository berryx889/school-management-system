import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// Loads the assessment plus its owning class-subject, or null.
async function loadAssessment(assessmentId) {
  const { rows } = await pool.query(
    `SELECT a.*, cs.teacher_id, cs.class_id, cs.subject_id FROM assessments a
     JOIN class_subjects cs ON cs.id = a.class_subject_id
     WHERE a.id=$1 AND a.deleted_at IS NULL`,
    [assessmentId]
  );
  return rows[0] || null;
}

// A teacher may enter marks for a class-subject they own OR one an admin has additionally
// granted them via staff_permissions — additive, never in place of the owner's own right.
async function canEnterMarks(user, assessment) {
  if (['super_admin', 'admin'].includes(user.role)) return true;
  if (user.role !== 'teacher') return false;
  if (assessment.teacher_id === user.id) return true;
  const grant = await pool.query(
    `SELECT 1 FROM staff_permissions
     WHERE user_id=$1 AND permission_type='marks_entry' AND class_id=$2 AND subject_id=$3`,
    [user.id, assessment.class_id, assessment.subject_id]
  );
  return grant.rows.length > 0;
}

// The class roster for an assessment, with any score already recorded. Shared by the grid,
// the Excel template, and to validate uploads.
async function rosterWithScores(assessment) {
  const { rows } = await pool.query(
    `SELECT s.id AS student_id, s.student_code, u.full_name, m.score
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN marks m ON m.student_id = s.id AND m.assessment_id = $1
     WHERE s.class_id = $2 AND s.status = 'active'
     ORDER BY u.full_name`,
    [assessment.id, assessment.class_id]
  );
  return rows;
}

// Validates + upserts a list of {student_id, score}. Returns { saved } or throws {status,message}.
async function saveScores(assessment, entries, userId) {
  const saved = [];
  for (const entry of entries) {
    const { student_id, score } = entry;
    if (score == null || score === '') continue;
    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > Number(assessment.max_score)) {
      const err = new Error(`Score for student ${student_id} must be between 0 and ${assessment.max_score}`);
      err.status = 400;
      throw err;
    }
    const { rows } = await pool.query(
      `INSERT INTO marks (assessment_id, student_id, score, entered_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (assessment_id, student_id) DO UPDATE SET score=$3, entered_by=$4, entered_at=now()
       RETURNING *`,
      [assessment.id, student_id, numericScore, userId]
    );
    saved.push(rows[0]);
  }
  return saved;
}

router.get('/', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { assessment_id } = req.query;
  if (!assessment_id) return res.status(400).json({ error: 'assessment_id is required' });
  const assessment = await loadAssessment(assessment_id);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
  if (!(await canEnterMarks(req.user, assessment))) return res.status(403).json({ error: 'You are not assigned to this class-subject' });
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
  const assessment = await loadAssessment(assessment_id);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
  if (!(await canEnterMarks(req.user, assessment))) {
    return res.status(403).json({ error: 'You are not assigned to this class-subject' });
  }
  if (assessment.locked) return res.status(423).json({ error: 'This assessment is locked for editing' });

  let saved;
  try {
    saved = await saveScores(assessment, entries, req.user.id);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  await auditFromReq(req, {
    action: 'marks.update',
    entityType: 'assessment',
    entityId: assessment_id,
    summary: `Saved ${saved.length} mark(s) for "${assessment.title}"`,
    metadata: { assessment_id, scores: saved.map((m) => ({ student_id: m.student_id, score: Number(m.score) })) },
  });
  res.json(saved);
});

// Excel template pre-filled with the class roster (index no + name + any existing score) so a
// teacher can enter a whole class offline and re-upload. Mirrors the students import template.
router.get('/template', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { assessment_id } = req.query;
  if (!assessment_id) return res.status(400).json({ error: 'assessment_id is required' });
  const assessment = await loadAssessment(assessment_id);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
  if (!(await canEnterMarks(req.user, assessment))) {
    return res.status(403).json({ error: 'You are not assigned to this class-subject' });
  }
  const roster = await rosterWithScores(assessment);
  // student_id is included (hidden reference) so uploads match exactly even if names repeat.
  const ws = XLSX.utils.json_to_sheet(
    roster.map((r) => ({
      student_id: r.student_id,
      index_no: r.student_code,
      full_name: r.full_name,
      score: r.score ?? '',
    }))
  );
  ws['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scores');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const safe = String(assessment.title).replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
  res.setHeader('Content-Disposition', `attachment; filename="scores_${safe}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// Bulk score upload from the filled template. Matches rows by student_id (fallback index_no),
// skips blanks, validates against max_score, then upserts in one shot.
router.post('/import', requireAuth, requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { assessment_id } = req.body;
  if (!assessment_id) return res.status(400).json({ error: 'assessment_id is required' });
  if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });
  const assessment = await loadAssessment(assessment_id);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
  if (!(await canEnterMarks(req.user, assessment))) {
    return res.status(403).json({ error: 'You are not assigned to this class-subject' });
  }
  if (assessment.locked) return res.status(423).json({ error: 'This assessment is locked for editing' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  // Map index_no -> student_id for rows that only carry the index number.
  const roster = await rosterWithScores(assessment);
  const idByCode = Object.fromEntries(roster.map((r) => [String(r.student_code).toLowerCase(), r.student_id]));
  const validIds = new Set(roster.map((r) => r.student_id));

  const entries = [];
  const errors = [];
  for (const [i, row] of rows.entries()) {
    const rawScore = row.score ?? row.Score ?? row.SCORE;
    if (rawScore === '' || rawScore == null) continue; // blank = leave as-is
    let sid = row.student_id ? Number(row.student_id) : null;
    if (!sid) {
      const code = String(row.index_no ?? row['Index No'] ?? row.student_code ?? '').toLowerCase();
      sid = idByCode[code] ?? null;
    }
    if (!sid || !validIds.has(sid)) {
      errors.push({ row: i + 2, error: 'Student not found in this class' });
      continue;
    }
    entries.push({ student_id: sid, score: rawScore });
  }

  let saved;
  try {
    saved = await saveScores(assessment, entries, req.user.id);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  await auditFromReq(req, {
    action: 'marks.update',
    entityType: 'assessment',
    entityId: assessment_id,
    summary: `Uploaded ${saved.length} mark(s) for "${assessment.title}"`,
    metadata: { assessment_id, source: 'bulk_upload', count: saved.length },
  });
  res.json({ updated: saved.length, errors });
});

export default router;
