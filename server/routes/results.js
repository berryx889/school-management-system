import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { auditFromReq } from '../utils/audit.js';

const router = Router();

async function getGradeBands() {
  const { rows } = await pool.query('SELECT * FROM grade_bands ORDER BY min_score DESC');
  return rows;
}

function gradeFor(total, bands) {
  const band = bands.find((b) => total >= b.min_score && total <= b.max_score);
  return band ? { grade: band.grade, remark: band.remark } : { grade: '-', remark: '-' };
}

// Builds the full subject-by-subject result matrix for every active student in a class,
// for a given term. Used by both the broadsheet (all students) and single-student views.
async function computeClassResults(classId, termId) {
  const bands = await getGradeBands();

  const students = (
    await pool.query(
      `SELECT s.id, u.full_name, s.student_code FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.class_id=$1 AND s.status='active' ORDER BY u.full_name`,
      [classId]
    )
  ).rows;

  const classSubjects = (
    await pool.query(
      `SELECT cs.id, sub.name AS subject_name, sub.type AS subject_type FROM class_subjects cs
       JOIN subjects sub ON sub.id = cs.subject_id
       WHERE cs.class_id=$1 ORDER BY sub.name`,
      [classId]
    )
  ).rows;

  const assessments = (
    await pool.query(
      `SELECT a.* FROM assessments a WHERE a.term_id=$1 AND a.class_subject_id = ANY($2::int[]) AND a.deleted_at IS NULL`,
      [termId, classSubjects.map((c) => c.id)]
    )
  ).rows;

  const assessmentIds = assessments.map((a) => a.id);
  const marks = assessmentIds.length
    ? (
        await pool.query(`SELECT * FROM marks WHERE assessment_id = ANY($1::int[])`, [assessmentIds])
      ).rows
    : [];

  const marksByAssessment = new Map();
  for (const m of marks) {
    if (!marksByAssessment.has(m.assessment_id)) marksByAssessment.set(m.assessment_id, new Map());
    marksByAssessment.get(m.assessment_id).set(m.student_id, Number(m.score));
  }

  // studentId -> classSubjectId -> { class_score, exam_score, total, grade, remark }
  const matrix = new Map();
  for (const student of students) matrix.set(student.id, new Map());

  for (const cs of classSubjects) {
    const csAssessments = assessments.filter((a) => a.class_subject_id === cs.id);
    for (const student of students) {
      let classScore = 0;
      let examScore = 0;
      for (const a of csAssessments) {
        const score = marksByAssessment.get(a.id)?.get(student.id);
        if (score == null) continue;
        const scaled = (score / Number(a.max_score)) * Number(a.weight);
        if (a.type === 'class_score') classScore += scaled;
        else examScore += scaled;
      }
      const total = Math.round((classScore + examScore) * 100) / 100;
      const { grade, remark } = gradeFor(total, bands);
      matrix.get(student.id).set(cs.id, { class_score: Math.round(classScore * 100) / 100, exam_score: Math.round(examScore * 100) / 100, total, grade, remark });
    }

    // subject position: rank students within this subject by total, descending
    const ranked = students
      .map((s) => ({ id: s.id, total: matrix.get(s.id).get(cs.id).total }))
      .sort((a, b) => b.total - a.total);
    ranked.forEach((r, idx) => {
      matrix.get(r.id).get(cs.id).position = idx + 1;
    });
  }

  const overall = students.map((s) => {
    const subjectResults = classSubjects.map((cs) => ({
      class_subject_id: cs.id,
      subject_name: cs.subject_name,
      subject_type: cs.subject_type,
      ...matrix.get(s.id).get(cs.id),
    }));
    const total = subjectResults.reduce((sum, r) => sum + r.total, 0);
    const average = classSubjects.length ? Math.round((total / classSubjects.length) * 100) / 100 : 0;
    return { student_id: s.id, full_name: s.full_name, student_code: s.student_code, subjects: subjectResults, total, average };
  });

  const rankedOverall = [...overall].sort((a, b) => b.average - a.average);
  rankedOverall.forEach((r, idx) => {
    overall.find((o) => o.student_id === r.student_id).class_position = idx + 1;
  });

  return { students: overall, subjects: classSubjects, class_size: students.length };
}

// Promotion eligibility, reusing computeClassResults rather than re-querying marks. Pass/fail
// is decided against promotion_pass_mark, not by string-matching grade_bands.remark (free
// text, no guaranteed "Fail" marker). promotion_carry_over_allowed=false means zero-tolerance
// (any failed subject blocks promotion); =true means promotion_max_failed_subjects is the
// effective tolerance.
export async function computePromotionEligibility(classId, termId) {
  const settingsRes = await pool.query('SELECT * FROM school_settings LIMIT 1');
  const settings = settingsRes.rows[0];
  const { students } = await computeClassResults(classId, termId);

  const passMark = Number(settings.promotion_pass_mark);
  const effectiveMaxFailed = settings.promotion_carry_over_allowed ? Number(settings.promotion_max_failed_subjects) : 0;

  return students.map((s) => {
    const failedSubjects = s.subjects.filter((sub) => sub.total < passMark);
    const failedCore = failedSubjects.filter((sub) => sub.subject_type === 'core');
    const reasons = [];
    if (s.average < Number(settings.promotion_min_average)) {
      reasons.push(`Average ${s.average} is below the required ${settings.promotion_min_average}`);
    }
    if (failedSubjects.length > effectiveMaxFailed) {
      reasons.push(`Failed ${failedSubjects.length} subject(s), max allowed is ${effectiveMaxFailed}`);
    }
    if (settings.promotion_core_subjects_must_pass && failedCore.length) {
      reasons.push(`Failed core subject(s): ${failedCore.map((c) => c.subject_name).join(', ')}`);
    }
    return {
      student_id: s.student_id,
      full_name: s.full_name,
      student_code: s.student_code,
      average: s.average,
      failed_subjects: failedSubjects.map((f) => f.subject_name),
      failed_core_subjects: failedCore.map((f) => f.subject_name),
      eligible: reasons.length === 0,
      distinction: s.average >= Number(settings.promotion_distinction_threshold),
      reasons,
    };
  });
}

router.get('/broadsheet', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { class_id, term_id } = req.query;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id are required' });
  const data = await computeClassResults(class_id, term_id);
  res.json(data);
});

router.get('/promotion-eligibility', requireAuth, requireRole('admin'), async (req, res) => {
  const { class_id, term_id } = req.query;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id are required' });
  const settingsRes = await pool.query(
    `SELECT promotion_pass_mark, promotion_min_average, promotion_max_failed_subjects,
            promotion_distinction_threshold, promotion_core_subjects_must_pass,
            promotion_carry_over_allowed, promotion_automatic, promotion_manual_override_allowed
     FROM school_settings LIMIT 1`
  );
  const students = await computePromotionEligibility(class_id, term_id);
  res.json({ policy: settingsRes.rows[0], students });
});

router.get('/student/:id', requireAuth, async (req, res) => {
  const { term_id } = req.query;
  if (!term_id) return res.status(400).json({ error: 'term_id is required' });

  const studentRes = await pool.query(
    `SELECT s.*, u.full_name, u.photo_url, c.name AS class_name FROM students s
     JOIN users u ON u.id = s.user_id LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.id=$1`,
    [req.params.id]
  );
  if (!studentRes.rows.length) return res.status(404).json({ error: 'Not found' });
  const student = studentRes.rows[0];

  if (req.user.role === 'student' && req.user.id !== undefined) {
    const owner = await pool.query('SELECT user_id FROM students WHERE id=$1', [req.params.id]);
    if (owner.rows[0]?.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.user.role === 'parent') {
    if (student.parent_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  }

  const release = await pool.query(
    'SELECT released FROM results_release WHERE term_id=$1 AND class_id=$2',
    [term_id, student.class_id]
  );
  const released = release.rows[0]?.released || false;

  if (!released && !['super_admin', 'admin', 'teacher'].includes(req.user.role)) {
    return res.json({ released: false, message: 'Results not yet released.' });
  }

  const classResults = await computeClassResults(student.class_id, term_id);
  const mine = classResults.students.find((s) => s.student_id === Number(req.params.id));

  const remarksRes = await pool.query(
    'SELECT * FROM remarks WHERE student_id=$1 AND term_id=$2',
    [req.params.id, term_id]
  );

  const attendanceRes = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status IN ('present','late')) AS present, COUNT(*) AS total
     FROM attendance a
     JOIN academic_terms t ON t.id=$1
     WHERE a.student_id=$2 AND a.date BETWEEN t.start_date AND t.end_date`,
    [term_id, req.params.id]
  );

  res.json({
    released: true,
    student,
    class_size: classResults.class_size,
    ...mine,
    remarks: remarksRes.rows[0] || null,
    attendance: attendanceRes.rows[0],
  });
});

router.post('/release', requireAuth, requireRole('admin'), async (req, res) => {
  const { class_id, term_id, released } = req.body;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id are required' });
  const { rows } = await pool.query(
    `INSERT INTO results_release (term_id, class_id, released, released_at, released_by)
     VALUES ($1,$2,$3,now(),$4)
     ON CONFLICT (term_id, class_id) DO UPDATE SET released=$3, released_at=now(), released_by=$4
     RETURNING *`,
    [term_id, class_id, Boolean(released), req.user.id]
  );
  await auditFromReq(req, {
    action: 'results.release',
    entityType: 'class',
    entityId: class_id,
    summary: `${released ? 'Released' : 'Unreleased'} results for class #${class_id}, term #${term_id}`,
    metadata: { class_id, term_id, released: Boolean(released) },
  });
  res.json(rows[0]);
});

router.get('/release', requireAuth, async (req, res) => {
  const { class_id, term_id } = req.query;
  const { rows } = await pool.query(
    'SELECT * FROM results_release WHERE term_id=$1 AND class_id=$2',
    [term_id, class_id]
  );
  res.json(rows[0] || { released: false });
});

// A teacher may write remarks for a class if they're its class_teacher_id, OR an admin has
// additionally granted them a remarks_entry permission for that class — additive, same
// pattern as the marks_entry check in marks.js. Admin always bypasses.
async function canEditRemarksForClass(user, classId) {
  if (['super_admin', 'admin'].includes(user.role)) return true;
  const classRes = await pool.query('SELECT class_teacher_id FROM classes WHERE id=$1', [classId]);
  if (!classRes.rows.length) return false;
  if (classRes.rows[0].class_teacher_id === user.id) return true;
  const grant = await pool.query(
    `SELECT 1 FROM staff_permissions WHERE user_id=$1 AND permission_type='remarks_entry' AND class_id=$2`,
    [user.id, classId]
  );
  return grant.rows.length > 0;
}

function buildRemarkSuggestion(result, attendance, marksCount) {
  const firstName = result.full_name?.split(/\s+/)[0] || 'The learner';
  if (!marksCount) {
    return `${firstName} has not yet accumulated enough recorded assessment data for a performance-based remark. Please review the learner’s participation and progress before completing this remark.`;
  }
  const ranked = [...result.subjects].sort((a, b) => b.total - a.total);
  const strongest = ranked[0];
  const weakest = ranked.at(-1);
  const sentences = [];
  if (result.average >= 80) sentences.push(`${firstName} has demonstrated excellent academic performance this term`);
  else if (result.average >= 70) sentences.push(`${firstName} has shown very good and consistent academic progress this term`);
  else if (result.average >= 60) sentences.push(`${firstName} is making steady academic progress and should continue working consistently`);
  else if (result.average >= 50) sentences.push(`${firstName} has achieved a satisfactory result but can improve with more focused practice`);
  else sentences.push(`${firstName} needs additional support and more consistent effort to strengthen academic performance`);

  if (strongest?.subject_name) sentences.push(`The strongest performance was in ${strongest.subject_name}`);
  if (weakest?.subject_name && weakest.total < 50 && weakest.subject_name !== strongest?.subject_name) {
    sentences.push(`More attention is needed in ${weakest.subject_name}`);
  }
  if (result.class_position <= 3) sentences.push(`This placed the learner ${result.class_position === 1 ? 'first' : result.class_position === 2 ? 'second' : 'third'} in the class`);

  const attendanceRate = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : null;
  if (attendanceRate != null) {
    if (attendanceRate >= 95) sentences.push('Attendance has been excellent');
    else if (attendanceRate >= 85) sentences.push('Attendance has been regular');
    else sentences.push('Improved attendance will support better learning outcomes');
  }
  sentences.push(result.average >= 70 ? 'Keep up the commendable effort.' : 'With encouragement and consistent practice, further progress is achievable.');
  return sentences.join('. ') + (sentences.at(-1).endsWith('.') ? '' : '.');
}

router.get('/remarks/suggestions', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { class_id, term_id } = req.query;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id are required' });
  if (!(await canEditRemarksForClass(req.user, class_id))) {
    return res.status(403).json({ error: 'You are not allowed to write remarks for this class' });
  }
  const results = await computeClassResults(class_id, term_id);
  const attendanceRows = await pool.query(
    `SELECT s.id AS student_id,
       COUNT(a.id)::int AS total,
       COUNT(a.id) FILTER (WHERE a.status IN ('present','late'))::int AS present
     FROM students s JOIN academic_terms t ON t.id=$2
     LEFT JOIN attendance a ON a.student_id=s.id AND a.date BETWEEN t.start_date AND t.end_date
     WHERE s.class_id=$1 AND s.status='active' GROUP BY s.id`,
    [class_id, term_id]
  );
  const markCounts = await pool.query(
    `SELECT m.student_id, COUNT(m.id)::int AS count FROM marks m
     JOIN assessments a ON a.id=m.assessment_id JOIN class_subjects cs ON cs.id=a.class_subject_id
     WHERE cs.class_id=$1 AND a.term_id=$2 AND a.deleted_at IS NULL GROUP BY m.student_id`,
    [class_id, term_id]
  );
  const attendanceByStudent = new Map(attendanceRows.rows.map((row) => [row.student_id, { total: Number(row.total), present: Number(row.present) }]));
  const marksByStudent = new Map(markCounts.rows.map((row) => [row.student_id, Number(row.count)]));
  res.json(results.students.map((student) => {
    const attendance = attendanceByStudent.get(student.student_id) || { total: 0, present: 0 };
    const marks_count = marksByStudent.get(student.student_id) || 0;
    return {
      student_id: student.student_id,
      average: student.average,
      class_position: student.class_position,
      attendance_rate: attendance.total ? Math.round((attendance.present / attendance.total) * 100) : null,
      marks_count,
      suggestion: buildRemarkSuggestion(student, attendance, marks_count),
    };
  }));
});

router.get('/remarks', requireAuth, async (req, res) => {
  const { class_id, term_id } = req.query;
  if (!class_id || !term_id) return res.status(400).json({ error: 'class_id and term_id are required' });
  const { rows } = await pool.query(
    `SELECT r.* FROM remarks r JOIN students s ON s.id = r.student_id
     WHERE s.class_id=$1 AND r.term_id=$2`,
    [class_id, term_id]
  );
  res.json(rows);
});

router.put('/remarks', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { student_id, term_id, class_teacher_remark, head_teacher_remark } = req.body;
  if (!student_id || !term_id) return res.status(400).json({ error: 'student_id and term_id are required' });
  const studentRes = await pool.query('SELECT class_id FROM students WHERE id=$1', [student_id]);
  if (!studentRes.rows.length) return res.status(404).json({ error: 'Student not found' });
  if (!(await canEditRemarksForClass(req.user, studentRes.rows[0].class_id))) {
    return res.status(403).json({ error: 'You are not the class teacher for this student' });
  }
  const { rows } = await pool.query(
    `INSERT INTO remarks (student_id, term_id, class_teacher_remark, head_teacher_remark)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (student_id, term_id) DO UPDATE SET
       class_teacher_remark=COALESCE($3, remarks.class_teacher_remark),
       head_teacher_remark=COALESCE($4, remarks.head_teacher_remark)
     RETURNING *`,
    [student_id, term_id, class_teacher_remark, head_teacher_remark]
  );
  res.json(rows[0]);
});

router.put('/remarks/bulk', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  const { class_id, term_id, entries } = req.body;
  if (!class_id || !term_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'class_id, term_id and entries[] are required' });
  }
  if (!(await canEditRemarksForClass(req.user, class_id))) {
    return res.status(403).json({ error: 'You are not the class teacher for this class' });
  }
  const saved = [];
  for (const entry of entries) {
    const { student_id, class_teacher_remark } = entry;
    if (!student_id) continue;
    const { rows } = await pool.query(
      `INSERT INTO remarks (student_id, term_id, class_teacher_remark)
       VALUES ($1,$2,$3)
       ON CONFLICT (student_id, term_id) DO UPDATE SET class_teacher_remark=COALESCE($3, remarks.class_teacher_remark)
       RETURNING *`,
      [student_id, term_id, class_teacher_remark]
    );
    saved.push(rows[0]);
  }
  res.json(saved);
});

export default router;
